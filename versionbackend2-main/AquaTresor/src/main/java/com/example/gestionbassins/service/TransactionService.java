package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.TransactionDTO;
import com.example.gestionbassins.entities.Transaction;

import java.util.Date;
import java.util.List;

public interface TransactionService {
    /**
     * Crée une nouvelle transaction
     * 
     * @param transactionDTO les données de la transaction
     * @return la transaction créée
     */
    Transaction createTransaction(TransactionDTO transactionDTO);
    
    /**
     * Récupère toutes les transactions associées à un bassin
     * 
     * @param bassinId l'identifiant du bassin
     * @return la liste des transactions
     */
    List<Transaction> getTransactionsByBassinId(Long bassinId);
    
    /**
     * Récupère les transactions d'un bassin dans une plage de dates
     * 
     * @param bassinId l'identifiant du bassin
     * @param startDate la date de début (optionnelle, peut être null)
     * @param endDate la date de fin (optionnelle, peut être null)
     * @return la liste des transactions filtrées
     */
    List<Transaction> getTransactionsByBassinIdAndDateRange(Long bassinId, Date startDate, Date endDate);
    
    /**
     * Récupère les transactions les plus récentes
     * 
     * @param limit le nombre maximum de transactions à récupérer
     * @return la liste des transactions récentes
     */
    List<Transaction> getRecentTransactions(int limit);
    
    
    public List<Transaction> getAllTransactions();
}