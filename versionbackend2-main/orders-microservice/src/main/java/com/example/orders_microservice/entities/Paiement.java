package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "paiements")
@Data
public class Paiement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "commande_id", nullable = false)
    private Long commandeId;

    @Column(name = "date_paiement")
    private LocalDateTime datePaiement;

    @Column(name = "statut", nullable = false)
    private String statut; // EN_ATTENTE, VALidee, ECHEC

    @Column(name = "verif_code")
    private String verifCode;

    @Column(name = "nb_tentative_verif", nullable = false)
    private Integer nbTentativeVerif = 0;

    @Column(name = "nb_tentative_resend_code", nullable = false)
    private Integer nbTentativeResendCode = 0;

    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified = false;

    @Column(name = "num_carte_masque")
    private String numCarteMasque; // e.g., ****-****-****-1234

    @Column(name = "nom_proprio_carte")
    private String nomProprioCarte;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @Column(name = "code_expiry_date")
    private LocalDateTime codeExpiryDate;

    @Column(name = "reference_paiement")
    private String referencePaiement; // e.g., PAY-XXXXXXXX


}