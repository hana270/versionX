package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.*;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.ToString;
import lombok.EqualsAndHashCode;


@Entity
@Table(name = "transaction_stock")
@Data
public class TransactionStock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long bassinId;
    private Integer quantite;
    private String typeOperation;
    private String raison;
    private LocalDateTime dateTransaction;
    
    @ManyToOne
    @JoinColumn(name = "commande_id")
    private Commande commande;
    
    // Champs supplémentaires pour le suivi
    private String referenceExterne;
    private String detailsProduit;
    private Double prixUnitaire;
    private Double montantTotal;
}