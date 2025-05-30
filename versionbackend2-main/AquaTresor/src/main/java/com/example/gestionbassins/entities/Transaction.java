package com.example.gestionbassins.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "bassin_id")
    private Bassin bassin;
    
    private Integer quantite;
    
    @Column(length = 50)
    private String typeOperation;
    
    @Column(length = 255)
    private String raison;
    
    @Temporal(TemporalType.TIMESTAMP)
    private Date dateTransaction;
    
    private Long userId;
    
    @Column(length = 100)
    private String referenceExterne;
    
    @Column(length = 255)
    private String detailsProduit;
    
    @Column(precision = 10)
    private Double prixUnitaire;

    @Column(precision = 10)
    private Double montantTotal;
    
    @Transient
    private User user;
}