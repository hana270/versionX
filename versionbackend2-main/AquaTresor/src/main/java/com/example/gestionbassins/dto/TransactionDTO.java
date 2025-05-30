package com.example.gestionbassins.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import com.example.gestionbassins.entities.Transaction;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionDTO {
    private Long bassinId;
    private Integer quantite;
    private String raison;
    private String typeOperation;
    private String utilisateur;
    private String referenceExterne;
    private String detailsProduit;
    private Double prixUnitaire;
    private Double montantTotal;
    
    // Constructeur à partir d'une Transaction
    public TransactionDTO(Transaction transaction) {
        this.bassinId = transaction.getBassin() != null ? transaction.getBassin().getIdBassin() : null;
        this.quantite = transaction.getQuantite();
        this.raison = transaction.getRaison();
        this.typeOperation = transaction.getTypeOperation();
        this.utilisateur = transaction.getUserId() != null ? 
            transaction.getUserId().toString() : "SYSTEM";
        this.referenceExterne = transaction.getReferenceExterne();
        this.detailsProduit = transaction.getDetailsProduit();
        this.prixUnitaire = transaction.getPrixUnitaire();
        this.montantTotal = transaction.getMontantTotal();
    }
}