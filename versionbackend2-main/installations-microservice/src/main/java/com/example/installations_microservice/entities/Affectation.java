package com.example.installations_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "affectations")
@Data
public class Affectation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
   /* @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "affectation_installateurs",
        joinColumns = @JoinColumn(name = "affectation_id", referencedColumnName = "id"),
        inverseJoinColumns = @JoinColumn(name = "installateur_id", referencedColumnName = "id")
    )
    private Set<Installateur> installateurs;*/
    @OneToMany(mappedBy = "affectation", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference // Ajoutez cette annotation
    private Set<AffectationInstallateur> installateurs= new HashSet<>(); // Initialisation ici
    
    private Long commandeId; // Référence à la commande dans l'autre microservice
    
   /* private LocalDate dateInstallation;
    private LocalTime heureDebut;
    private LocalTime heureFin;*/
    
    @Enumerated(EnumType.STRING)
    private StatutAffectation statut = StatutAffectation.PLANIFIEE;
    
    private String notes;
}

