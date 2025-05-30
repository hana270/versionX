package com.example.orders_microservice.restcontrollers;

import com.example.orders_microservice.dto.CodeVerificationRequestDTO;
import com.example.orders_microservice.dto.PaymentRequestDTO;
import com.example.orders_microservice.dto.PaymentResponseDTO;
import com.example.orders_microservice.dto.PaymentValidationResponseDTO;
import com.example.orders_microservice.dto.ErrorResponse;
import com.example.orders_microservice.entities.Commande;
import com.example.orders_microservice.entities.Paiement;
import com.example.orders_microservice.entities.StatutCommande;
import com.example.orders_microservice.repos.CommandeRepository;
import com.example.orders_microservice.repos.PaiementRepository;
import com.example.orders_microservice.service.PaymentService;

import jakarta.transaction.Transactional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/panier/payments")
public class PaymentController {
	private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

	private final PaymentService paymentService;
	private final CommandeRepository commandeRepository;
	private final PaiementRepository paiementRepository;

	public PaymentController(PaymentService paymentService, PaiementRepository paiementRepository,
			CommandeRepository commandeRepository) {
		this.paymentService = paymentService;
		this.commandeRepository = commandeRepository;
		this.paiementRepository = paiementRepository;
	}

	@PostMapping("/initiate")
	public ResponseEntity<?> initiatePayment(@RequestBody PaymentRequestDTO requestDTO) {
		try {
			logger.info("Initiating payment: {}", requestDTO);

			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			Long authenticatedClientId = (Long) auth.getDetails();
			Commande commande = commandeRepository.findByNumeroCommande(requestDTO.getCommandeId()).orElseThrow(
					() -> new IllegalArgumentException("Commande non trouvée: " + requestDTO.getCommandeId()));
			if (!commande.getClientId().equals(authenticatedClientId)) {
				logger.warn("ClientId mismatch: commande={}, authenticated={}", commande.getClientId(),
						authenticatedClientId);
				return ResponseEntity.status(HttpStatus.FORBIDDEN)
						.body(new ErrorResponse("UNAUTHORIZED", "Vous n'êtes pas autorisé à payer cette commande"));
			}

			PaymentResponseDTO response = paymentService.initiatePayment(requestDTO);
			return ResponseEntity.ok(response);
		} catch (IllegalArgumentException e) {
			logger.error("Validation error: {}", e.getMessage());
			return ResponseEntity.badRequest().body(new ErrorResponse("VALIDATION_ERROR", e.getMessage()));
		} catch (Exception e) {
			logger.error("Payment initiation failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(new ErrorResponse("PAYMENT_ERROR", "Détail de l'erreur: " + e.getMessage()));
		}
	}

	@PostMapping("/verify")
	public ResponseEntity<?> verifyCode(@RequestBody CodeVerificationRequestDTO requestDTO) {
		try {
			if (requestDTO.getTransactionId() == null || requestDTO.getVerificationCode() == null) {
				logger.error("Missing transactionId or verificationCode");
				return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_REQUEST",
						"L'ID de transaction et le code de vérification sont requis"));
			}

			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			Long authenticatedClientId = (Long) auth.getDetails();

			Long transactionId = Long.valueOf(requestDTO.getTransactionId());

			Paiement paiement = paiementRepository.findById(transactionId)
					.orElseThrow(() -> new IllegalArgumentException("Paiement non trouvé: " + transactionId));

			Commande commande = commandeRepository.findById(paiement.getCommandeId()).orElseThrow(
					() -> new IllegalArgumentException("Commande non trouvée pour paiement: " + transactionId));

			if (!commande.getClientId().equals(authenticatedClientId)) {
				logger.warn("ClientId mismatch: commande={}, authenticated={}", commande.getClientId(),
						authenticatedClientId);
				return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
						new ErrorResponse("UNAUTHORIZED", "Vous n'êtes pas autorisé à vérifier cette transaction"));
			}

			PaymentValidationResponseDTO response = paymentService.verifyCode(requestDTO);
			return ResponseEntity.ok(response);
		} catch (IllegalArgumentException e) {
			logger.error("Code verification failed: Invalid input", e);
			return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_CODE", e.getMessage()));
		} catch (IllegalStateException e) {
			logger.error("Code verification failed: Invalid state", e);
			String errorCode = e.getMessage().contains("code a expiré") ? "CODE_EXPIRED" : "INVALID_STATE";
			return ResponseEntity.badRequest().body(new ErrorResponse(errorCode, e.getMessage()));
		} catch (Exception e) {
			logger.error("Code verification failed", e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(new ErrorResponse("VERIFICATION_ERROR", e.getMessage()));
		}
	}

	@PostMapping("/resend-code")
	public ResponseEntity<?> resendVerificationCode(@RequestBody Map<String, String> request) {
		try {
			String transactionId = request.get("transactionId");
			if (transactionId == null || transactionId.isEmpty()) {
				return ResponseEntity.badRequest()
						.body(new ErrorResponse("INVALID_REQUEST", "transactionId is required"));
			}

			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			Long authenticatedClientId = (Long) auth.getDetails();
			Long transactionIdLong = Long.valueOf(transactionId);
			Commande commande = commandeRepository.findByPaiementId(transactionIdLong).orElseThrow(
					() -> new IllegalArgumentException("Commande non trouvée pour transaction: " + transactionId));
			if (!commande.getClientId().equals(authenticatedClientId)) {
				logger.warn("ClientId mismatch: commande={}, authenticated={}", commande.getClientId(),
						authenticatedClientId);
				return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse("UNAUTHORIZED",
						"Vous n'êtes pas autorisé à renvoyer le code pour cette transaction"));
			}

			boolean success = paymentService.resendVerificationCode(transactionId);
			Map<String, Object> response = Map.of("success", success, "message",
					"Code de vérification renvoyé avec succès");
			logger.info("Resend code response for transactionId {}: {}", transactionId, response);
			return ResponseEntity.ok(response);
		} catch (IllegalArgumentException e) {
			logger.error("Resend code failed: Invalid input", e);
			return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_REQUEST", e.getMessage()));
		} catch (IllegalStateException e) {
			logger.error("Resend code failed: Invalid state", e);
			return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_STATE", e.getMessage()));
		} catch (Exception e) {
			logger.error("Resend code failed", e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(new ErrorResponse("RESEND_ERROR", e.getMessage()));
		}
	}

	@GetMapping("/{transactionId}/status")
	public ResponseEntity<?> checkPaymentStatus(@PathVariable String transactionId) {
		try {
			Long id = Long.valueOf(transactionId);
			Paiement paiement = paiementRepository.findById(id)
					.orElseThrow(() -> new IllegalArgumentException("Paiement non trouvé"));

			// Vérifier l'autorisation
			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			Long authenticatedClientId = (Long) auth.getDetails();
			Commande commande = commandeRepository.findById(paiement.getCommandeId())
					.orElseThrow(() -> new IllegalArgumentException("Commande non trouvée"));

			if (!commande.getClientId().equals(authenticatedClientId)) {
				return ResponseEntity.status(HttpStatus.FORBIDDEN)
						.body(new ErrorResponse("UNAUTHORIZED", "Non autorisé"));
			}

			return ResponseEntity.ok(Map.of("status", paiement.getStatut(), "commandeStatus",
					commande.getStatut().name(), "canCancel", commande.getStatut() == StatutCommande.EN_ATTENTE));
		} catch (Exception e) {
			logger.error("Erreur vérification statut", e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(new ErrorResponse("STATUS_CHECK_ERROR", e.getMessage()));
		}
	}

	@PostMapping("/{transactionId}/cancel")
	@Transactional
	public ResponseEntity<?> cancelPayment(@PathVariable String transactionId) {
		try {
			Long id = Long.valueOf(transactionId);
			Paiement paiement = paiementRepository.findById(id)
					.orElseThrow(() -> new IllegalArgumentException("Paiement non trouvé: " + transactionId));

			// Vérifier l'autorisation
			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			Long authenticatedClientId = (Long) auth.getDetails();
			Commande commande = commandeRepository.findById(paiement.getCommandeId())
					.orElseThrow(() -> new IllegalArgumentException("Commande non trouvée"));

			if (!commande.getClientId().equals(authenticatedClientId)) {
				return ResponseEntity.status(HttpStatus.FORBIDDEN)
						.body(new ErrorResponse("UNAUTHORIZED", "Non autorisé"));
			}

			// Supprimer la commande et le paiement
			commandeRepository.delete(commande);
			paiementRepository.delete(paiement);

			return ResponseEntity.ok(Map.of("success", true, "message", "Paiement annulé et commande supprimée"));
		} catch (Exception e) {
			logger.error("Erreur lors de l'annulation", e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(new ErrorResponse("CANCEL_ERROR", e.getMessage()));
		}
	}
	@GetMapping("/code-expiry/{transactionId}")
	public ResponseEntity<?> getCodeExpiry(@PathVariable String transactionId) {
	    try {
	        Long id = Long.valueOf(transactionId);
	        Paiement paiement = paiementRepository.findById(id)
	                .orElseThrow(() -> new IllegalArgumentException("Paiement non trouvé: " + transactionId));

	        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
	        Long authenticatedClientId = (Long) auth.getDetails();
	        Commande commande = commandeRepository.findById(paiement.getCommandeId())
	                .orElseThrow(() -> new IllegalArgumentException("Commande non trouvée pour paiement: " + transactionId));
	        
	        if (!commande.getClientId().equals(authenticatedClientId)) {
	            return ResponseEntity.status(HttpStatus.FORBIDDEN)
	                    .body(new ErrorResponse("UNAUTHORIZED", "Non autorisé"));
	        }

	        return ResponseEntity.ok(Map.of(
	            "expiryDate", paiement.getCodeExpiryDate().toString(),
	            "success", true
	        ));
	    } catch (IllegalArgumentException e) {
	        return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_REQUEST", e.getMessage()));
	    } catch (Exception e) {
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	                .body(new ErrorResponse("SERVER_ERROR", e.getMessage()));
	    }
	}
}