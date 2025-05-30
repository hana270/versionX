package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.TransactionDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.Transaction;
import com.example.gestionbassins.repos.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {
    private static final Logger logger = LoggerFactory.getLogger(TransactionService.class);
    
    private final TransactionRepository transactionRepository;
    private final BassinRepository bassinRepository;
    private final UserServiceClient userServiceClient;
    
    @Override
    @Transactional
    public Transaction createTransaction(TransactionDTO transactionDTO) {
        logger.info("Création d'une transaction pour le bassin ID: {}", transactionDTO.getBassinId());
        
        Bassin bassin = bassinRepository.findById(transactionDTO.getBassinId())
            .orElseThrow(() -> new IllegalArgumentException("Bassin non trouvé avec l'ID: " + transactionDTO.getBassinId()));
        
        Transaction transaction = new Transaction();
        transaction.setBassin(bassin);
        transaction.setQuantite(transactionDTO.getQuantite());
        transaction.setRaison(transactionDTO.getRaison());
        transaction.setTypeOperation(transactionDTO.getTypeOperation());
        transaction.setDateTransaction(new Date());
        transaction.setReferenceExterne(transactionDTO.getReferenceExterne());
        transaction.setDetailsProduit(transactionDTO.getDetailsProduit());
        transaction.setPrixUnitaire(transactionDTO.getPrixUnitaire());
        transaction.setMontantTotal(transactionDTO.getMontantTotal());
        
        // Set user information
        setUserInformation(transactionDTO, transaction);
        
        Transaction savedTransaction = transactionRepository.save(transaction);
        
        // Update bassin quantity if it's an adjustment
        if ("AJOUT".equals(transactionDTO.getTypeOperation()) || "RETRAIT".equals(transactionDTO.getTypeOperation())) {
            bassin.setQuantity(bassin.getQuantity() + transactionDTO.getQuantite());
            bassinRepository.save(bassin);
        }
        
        return savedTransaction;
    }
    
    private void setUserInformation(TransactionDTO transactionDTO, Transaction transaction) {
        if (transactionDTO.getUtilisateur() != null && !transactionDTO.getUtilisateur().isEmpty()) {
            try {
                Long userId = null;
                try {
                    userId = Long.parseLong(transactionDTO.getUtilisateur());
                } catch (NumberFormatException e) {
                    logger.debug("Recherche de l'utilisateur par nom: {}", transactionDTO.getUtilisateur());
                    var user = userServiceClient.getUserByUsername(transactionDTO.getUtilisateur());
                    if (user != null) {
                        userId = user.getUserId();
                    }
                }
                transaction.setUserId(userId);
            } catch (Exception e) {
                logger.warn("Impossible de récupérer l'utilisateur: {}", transactionDTO.getUtilisateur(), e);
            }
        }
    }
    
    @Override
    public List<Transaction> getTransactionsByBassinId(Long bassinId) {
        return transactionRepository.findByBassin_IdBassinOrderByDateTransactionDesc(bassinId);
    }
    
    @Override
    public List<Transaction> getTransactionsByBassinIdAndDateRange(Long bassinId, Date startDate, Date endDate) {
        return transactionRepository.findByBassin_IdBassinAndDateTransactionBetweenOrderByDateTransactionDesc(
            bassinId, startDate, endDate);
    }
    
    @Override
    public List<Transaction> getRecentTransactions(int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "dateTransaction"));
        return transactionRepository.findAll(pageable).getContent();
    }
    
    @Override
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAllByOrderByDateTransactionDesc();
    }
}