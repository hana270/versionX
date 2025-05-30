package com.example.gestionbassins.restcontrollers;

import com.example.gestionbassins.dto.TransactionDTO;
import com.example.gestionbassins.entities.Transaction;
import com.example.gestionbassins.service.TransactionService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @GetMapping
    public ResponseEntity<List<Transaction>> getAllTransactions() {
        List<Transaction> transactions = transactionService.getRecentTransactions(100); // Limité à 100 transactions récentes
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/recent")
    public ResponseEntity<List<Transaction>> getRecentTransactions(@RequestParam(defaultValue = "10") int limit) {
        List<Transaction> transactions = transactionService.getRecentTransactions(limit);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/bassin/{bassinId}")
    public ResponseEntity<List<Transaction>> getTransactionsByBassinId(@PathVariable Long bassinId) {
        List<Transaction> transactions = transactionService.getTransactionsByBassinId(bassinId);
        return ResponseEntity.ok(transactions);
    }

    @PostMapping
    public ResponseEntity<Transaction> createTransaction(@RequestBody TransactionDTO transactionDTO) {
        // Récupérer l'utilisateur connecté
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            transactionDTO.setUtilisateur(authentication.getName());
        }
        
        Transaction transaction = transactionService.createTransaction(transactionDTO);
        return ResponseEntity.ok(transaction);
    }
}