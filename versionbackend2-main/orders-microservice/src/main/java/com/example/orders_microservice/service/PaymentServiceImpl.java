package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.CodeVerificationRequestDTO;
import com.example.orders_microservice.dto.PaymentRequestDTO;
import com.example.orders_microservice.dto.PaymentResponseDTO;
import com.example.orders_microservice.dto.PaymentValidationResponseDTO;
import com.example.orders_microservice.entities.Commande;
import com.example.orders_microservice.entities.Paiement;
import com.example.orders_microservice.entities.StatutCommande;
import com.example.orders_microservice.repos.CommandeRepository;
import com.example.orders_microservice.repos.PaiementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

@Service
public class PaymentServiceImpl implements PaymentService {
    private static final Logger logger = LoggerFactory.getLogger(PaymentServiceImpl.class);

    private final PaiementRepository paiementRepository;
    private final CommandeRepository commandeRepository;
    private final CommandeService commandeService;
    private final EmailService emailService;

    @Value("${payment.verification-code-length:6}")
    private int verificationCodeLength;

    @Value("${payment.verification-code-expiry-minutes:5}")
    private int verificationCodeExpiryMinutes;

    @Value("${payment.max-verification-attempts:3}")
    private int maxVerificationAttempts;

    @Value("${payment.max-resend-attempts:3}")
    private int maxResendAttempts;

    @Value("${application.name:AquaTresor}")
    private String applicationName;

    @Autowired
    public PaymentServiceImpl(PaiementRepository paiementRepository, CommandeRepository commandeRepository,
                              CommandeService commandeService, EmailService emailService) {
        this.paiementRepository = paiementRepository;
        this.commandeRepository = commandeRepository;
        this.commandeService = commandeService;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public PaymentResponseDTO initiatePayment(PaymentRequestDTO requestDTO) {
        logger.info("Initiating payment for commandeId: {}", requestDTO.getCommandeId());

        validatePaymentRequest(requestDTO);

        Commande commande = commandeRepository.findByNumeroCommande(requestDTO.getCommandeId())
                .orElseThrow(() -> {
                    logger.error("Commande not found: {}", requestDTO.getCommandeId());
                    return new IllegalArgumentException("Commande non trouvée: " + requestDTO.getCommandeId());
                });

        logger.debug("Commande status for {}: {}", requestDTO.getCommandeId(), commande.getStatut());
        if (commande.getStatut() != StatutCommande.EN_ATTENTE) {
            logger.warn("Commande {} has invalid status: {}", requestDTO.getCommandeId(), commande.getStatut());
            throw new IllegalStateException("La commande doit être en attente pour initier le paiement. Statut actuel: " + commande.getStatut());
        }

        Paiement paiement = new Paiement();
        paiement.setCommandeId(commande.getId());
        paiement.setStatut("EN_ATTENTE");
        paiement.setDateCreation(LocalDateTime.now());
        paiement.setNumCarteMasque(maskCardNumber(requestDTO.getCardNumber()));
        paiement.setNomProprioCarte(requestDTO.getCardholderName());
        paiement.setEmail(requestDTO.getEmail());
        paiement.setVerifCode(generateVerificationCode());
        paiement.setCodeExpiryDate(LocalDateTime.now().plusMinutes(verificationCodeExpiryMinutes));
        paiement.setNbTentativeVerif(0);
        paiement.setNbTentativeResendCode(0);
        paiement.setIsVerified(false);
        
        paiement.setCodeExpiryDate(LocalDateTime.now().plusMinutes(verificationCodeExpiryMinutes));
        
        paiement = paiementRepository.save(paiement);
        logger.info("Paiement created with transactionId: {}", paiement.getId());

        commande.setPaiement(paiement);
        commandeRepository.save(commande);
        logger.info("Commande {} updated with paiementId: {}", commande.getNumeroCommande(), paiement.getId());

        sendVerificationEmail(paiement, commande);

        PaymentResponseDTO response = new PaymentResponseDTO();
        response.setSuccess(true);
        response.setTransactionId(String.valueOf(paiement.getId()));
        response.setCommandeId(requestDTO.getCommandeId());
        response.setMessage("Paiement initié - vérifiez votre email");

        return response;
    }

    @Override
    @Transactional
    public PaymentValidationResponseDTO verifyCode(CodeVerificationRequestDTO requestDTO) {
        logger.info("Verifying code for transactionId: {}", requestDTO.getTransactionId());

        if (requestDTO.getTransactionId() == null || requestDTO.getVerificationCode() == null) {
            throw new IllegalArgumentException("L'ID de transaction et le code de vérification sont requis");
        }

        Long transactionId;
        try {
            transactionId = Long.valueOf(requestDTO.getTransactionId());
        } catch (NumberFormatException e) {
            logger.error("Invalid transactionId format: {}", requestDTO.getTransactionId());
            throw new IllegalArgumentException("L'ID de transaction doit être un nombre valide");
        }

        Paiement paiement = paiementRepository.findById(transactionId)
                .orElseThrow(() -> {
                    logger.error("Paiement not found for ID: {}", transactionId);
                    return new IllegalArgumentException("Paiement non trouvé pour l'ID: " + transactionId);
                });

        Commande commande = commandeRepository.findById(paiement.getCommandeId())
                .orElseThrow(() -> {
                    logger.error("Commande not found for paiement: {}", paiement.getId());
                    return new IllegalStateException("Commande non trouvée pour paiement: " + paiement.getId());
                });

        if (paiement.getNbTentativeVerif() >= maxVerificationAttempts) {
            paiement.setStatut("ECHEC");
            
            paiementRepository.save(paiement);
            commandeRepository.save(commande);
            logger.warn("Max verification attempts reached for transactionId: {}", transactionId);
            throw new IllegalStateException("Nombre maximum de tentatives de vérification atteint");
        }

        if (paiement.getCodeExpiryDate().isBefore(LocalDateTime.now())) {
            paiement.setStatut("ECHEC");
           
            paiementRepository.save(paiement);
            commandeRepository.save(commande);
            logger.warn("Verification code expired for transactionId: {}", transactionId);
            throw new IllegalStateException("Le code de vérification a expiré");
        }

        if (!paiement.getVerifCode().equals(requestDTO.getVerificationCode())) {
            paiement.setNbTentativeVerif(paiement.getNbTentativeVerif() + 1);
            paiementRepository.save(paiement);
            logger.warn("Incorrect verification code for transactionId: {}", transactionId);
            throw new IllegalArgumentException("Code de vérification incorrect");
        }

        paiement.setIsVerified(true);
        paiement.setStatut("VALIDEE");
        paiement.setDatePaiement(LocalDateTime.now());
        paiement.setReferencePaiement("PAY-" + UUID.randomUUID().toString().substring(0, 8));
        paiementRepository.save(paiement);
        logger.info("Paiement verified for transactionId: {}", transactionId);

        try {
            commandeService.updateCommandeAfterPayment(commande.getNumeroCommande());
            logger.info("Commande {} updated to EN_PREPARATION after payment", commande.getNumeroCommande());
        } catch (Exception e) {
            logger.error("Failed to update commande after payment for numeroCommande {}: {}", commande.getNumeroCommande(), e.getMessage());
            throw new IllegalStateException("Erreur lors de la mise à jour de la commande après paiement: " + e.getMessage());
        }

        sendPaymentConfirmationEmail(paiement, commande);

        PaymentValidationResponseDTO response = new PaymentValidationResponseDTO();
        response.setSuccess(true);
        response.setCommandeId(commande.getNumeroCommande());
        response.setReferencePaiement(paiement.getReferencePaiement());
        response.setMessage("Paiement validé avec succès");

        return response;
    }

    @Override
    @Transactional
    public boolean resendVerificationCode(String transactionId) {
        logger.info("Resending verification code for transactionId: {}", transactionId);

        if (transactionId == null) {
            throw new IllegalArgumentException("L'ID de transaction est requis");
        }

        Long id;
        try {
            id = Long.valueOf(transactionId);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("L'ID de transaction doit être un nombre valide");
        }

        Paiement paiement = paiementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Paiement non trouvé pour l'ID: " + id));

        if (paiement.getNbTentativeResendCode() >= maxResendAttempts) {
            throw new IllegalStateException("Nombre maximum de renvois de code atteint");
        }

        if (paiement.getIsVerified()) {
            throw new IllegalStateException("Le paiement est déjà vérifié");
        }

        // Reset status if payment failed due to expiration
        if ("ECHEC".equals(paiement.getStatut())) {
            paiement.setStatut("EN_ATTENTE");
            paiement.setNbTentativeVerif(0); // Reset verification attempts
            logger.info("Resetting paiement status to EN_ATTENTE for transactionId: {}", id);
        }

        paiement.setVerifCode(generateVerificationCode());
        paiement.setCodeExpiryDate(LocalDateTime.now().plusMinutes(verificationCodeExpiryMinutes));
        paiement.setNbTentativeResendCode(paiement.getNbTentativeResendCode() + 1);
        paiementRepository.save(paiement);

        Commande commande = commandeRepository.findById(paiement.getCommandeId())
                .orElseThrow(() -> new IllegalArgumentException("Commande non trouvée pour paiement: " + id));

        // Reset commande status to EN_ATTENTE if it was set to ECHEC
     

        sendVerificationEmail(paiement, commande);

        return true;
    }

    private void validatePaymentRequest(PaymentRequestDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("La requête de paiement est vide");
        }
        if (request.getCommandeId() == null || request.getCommandeId().isEmpty()) {
            throw new IllegalArgumentException("L'ID de la commande est requis");
        }
        if (request.getEmail() == null || !request.getEmail().matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$")) {
            throw new IllegalArgumentException("Email invalide");
        }
        if (request.getCardNumber() == null || !request.getCardNumber().matches("\\d{16}")) {
            throw new IllegalArgumentException("Numéro de carte invalide");
        }
        if (request.getCardholderName() == null || request.getCardholderName().trim().isEmpty()) {
            throw new IllegalArgumentException("Nom du titulaire requis");
        }
        if (request.getExpiryMonth() == null || !request.getExpiryMonth().matches("^(0?[1-9]|1[0-2])$")) {
            throw new IllegalArgumentException("Mois d'expiration invalide (1-12)");
        }
        if (request.getExpiryYear() == null || !request.getExpiryYear().matches("^\\d{2}$|^\\d{4}$")) {
            throw new IllegalArgumentException("Année d'expiration invalide");
        }
        if (request.getCvv() == null || !request.getCvv().matches("\\d{3}")) {
            throw new IllegalArgumentException("Code de sécurité invalide");
        }
    }

    private String maskCardNumber(String cardNumber) {
        if (cardNumber == null || cardNumber.length() < 4) {
            return "****-****-****-****";
        }
        return "****-****-****-" + cardNumber.substring(cardNumber.length() - 4);
    }

    private String generateVerificationCode() {
        StringBuilder code = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < verificationCodeLength; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }

    private void sendVerificationEmail(Paiement paiement, Commande commande) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("applicationName", applicationName);
            variables.put("code", paiement.getVerifCode());
            variables.put("cardMasked", paiement.getNumCarteMasque());
            variables.put("expiryMinutes", verificationCodeExpiryMinutes);
            variables.put("orderNumber", commande.getNumeroCommande());
            variables.put("amount", commande.getMontantTotalTTC());

            emailService.sendEmail(
                    paiement.getEmail(),
                    applicationName + " - Code de Vérification",
                    "email/verification-code",
                    variables
            );
            logger.info("Verification email sent to: {}", paiement.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}: {}", paiement.getEmail(), e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email de vérification", e);
        }
    }

    private void sendPaymentConfirmationEmail(Paiement paiement, Commande commande) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("applicationName", applicationName);
            variables.put("orderNumber", commande.getNumeroCommande());
            variables.put("amount", commande.getMontantTotalTTC());
            variables.put("paymentReference", paiement.getReferencePaiement());
            variables.put("paymentDate", paiement.getDatePaiement().toString());
            variables.put("clientLastName", commande.getClientNom());
            variables.put("clientFirstName", commande.getClientPrenom());

            emailService.sendEmail(
                    paiement.getEmail(),
                    applicationName + " - Confirmation de Paiement",
                    "email/payment-confirmation",
                    variables
            );
            logger.info("Payment confirmation email sent to: {}", paiement.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send payment confirmation email to {}: {}", paiement.getEmail(), e.getMessage());
        }
    }
    
}