package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.*;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.ToString;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "commandes")
@Data
@EqualsAndHashCode(exclude = {"lignesCommande", "transactionsStock"})
public class Commande {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_commande", unique = true, nullable = false)
    private String numeroCommande;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "email_client", nullable = false)
    private String emailClient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutCommande statut;

    @Column(name = "montant_total", nullable = false)
    private Double montantTotal;

    @Column(name = "montant_reduction")
    private Double montantReduction;

    @Column(name = "montant_tva", nullable = false)
    private Double montantTVA;

    @Column(name = "montant_total_ttc", nullable = false)
    private Double montantTotalTTC;

    @Enumerated(EnumType.STRING)
    private ModePaiement modePaiement;

    @Column(name = "reference_paiement")
    private String referencePaiement;

    @Column(name = "paiement_confirme")
    private Boolean paiementConfirme;

    @Column(name = "date_paiement")
    private LocalDateTime datePaiement;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @Column(name = "adresse_livraison", nullable = false)
    private String adresseLivraison;

    @Column(name = "code_postal", nullable = false)
    private String codePostal;

    @Column(name = "ville", nullable = false)
    private String ville;

    @Column(name = "region", nullable = false)
    private String region;

    @Column(name = "client_nom")
    private String clientNom;

    @Column(name = "client_prenom")
    private String clientPrenom;

    @Column(name = "client_email")
    private String clientEmail;

    @Column(name = "client_telephone")
    private String clientTelephone;

    @Column(name = "frais_livraison")
    private Double fraisLivraison;

    @Column(name = "commentaires")
    private String commentaires;

    @OneToOne(cascade = CascadeType.ALL)
    private DetailFabrication detailsFabrication;

    @OneToOne
    @JoinColumn(name = "paiement_id")
    private Paiement paiement;
    
    @OneToMany(mappedBy = "commande", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    @ToString.Exclude
    private Set<LigneComnd> lignesCommande = new HashSet<>();

    @OneToMany(mappedBy = "commande", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    @ToString.Exclude
    private List<TransactionStock> transactionsStock = new ArrayList<>();
    
}