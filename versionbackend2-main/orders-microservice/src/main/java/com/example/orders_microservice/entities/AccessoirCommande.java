package com.example.orders_microservice.entities;


import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "accessoir_commande")
@Data
public class AccessoirCommande {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "ligne_comnd_id", nullable = false)
    private LigneComnd ligneComnd;

    @Column(name = "accessoire_id", nullable = false)
    private Long accessoireId;

    @Column(name = "nom_accessoire")
    private String nomAccessoire;

    @Column(name = "prix_accessoire")
    private Double prixAccessoire;

    @Column(name = "image_url")
    private String imageUrl;
}