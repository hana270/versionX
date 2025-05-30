package com.example.orders_microservice.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

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
}