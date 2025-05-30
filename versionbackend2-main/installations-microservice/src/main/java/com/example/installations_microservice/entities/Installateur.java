package com.example.installations_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "installateurs")
@Data
public class Installateur {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String nom;
    
    /*@Column(nullable = true) // Rendre prenom optionnel
    private String prenom= "Non spécifié"; // Valeur par défaut
    */
    @Column(nullable = false, unique = true)
    private Long userId;
    
    @Column(unique = true, nullable = false)
    private String email;
    
 //   private String telephone;
    private String specialite;
    private String zoneIntervention;
    private String defaultAddress;
    
 // Nouveaux champs ajoutés
    private String firstName;  // Correspond à user.firstName
    private String lastName;   // Correspond à user.lastName
    private String phone;      // Correspond à user.phone
    
    @OneToMany(mappedBy = "installateur")
    @JsonIgnoreProperties("installateur") // Empêche la sérialisation infinie
    private Set<AffectationInstallateur> affectations;
    
    @Enumerated(EnumType.STRING)
    private Disponibilite disponibilite = Disponibilite.DISPONIBLE;
    
    // Constructeurs
  /*  public Installateur() {
        this.prenom = "Non spécifié"; // Valeur par défaut
    }*/
    
 // Modifiez le constructeur pour initialiser les valeurs obligatoires
    public Installateur() {
      //  this.prenom = "Non spécifié";
        //this.telephone = "Non spécifié";
        this.zoneIntervention = "Toutes";
        this.disponibilite = Disponibilite.DISPONIBLE;
    }
    /*@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String nom;
    
    @Column(nullable = false)
    private String prenom;
    
    @Column(nullable = false, unique = true)
    private Long userId; // Référence à l'ID dans users-microservice
    
    @Column(unique = true, nullable = false)
    private String email;
    
    private String telephone;
    private String specialite; // Piscine, Jacuzzi, etc.
    private String zoneIntervention; // Régions ou départements
    
    @Enumerated(EnumType.STRING)
    private Disponibilite disponibilite = Disponibilite.DISPONIBLE;
    
    @OneToMany(mappedBy = "installateur")
    private Set<Affectation> affectations;
    */
 // Constructeur par défaut
   /* public Installateur() {
    }*/

    // Constructeur avec tous les champs
 /*   public Installateur(Long id, Long userId, String nom, String email, 
                       Disponibilite disponibilite, String zoneIntervention,
                       String specialite, String telephone) {
        this.id = id;
        this.userId = userId;
        this.nom = nom;
        this.email = email;
        this.disponibilite = disponibilite;
        this.zoneIntervention = zoneIntervention;
        this.specialite = specialite;
        this.telephone = telephone;
    }*/
    
    @Override
    public String toString() {
        return "Installateur{" +
            "id=" + id +
            ", userId=" + userId +
            ", nom='" + nom + '\'' +
            ", email='" + email + '\'' +
            ", specialite='" + specialite + '\'' +
            ", zoneIntervention='" + zoneIntervention + '\'' +
            ", firstName='" + firstName + '\'' +
            ", lastName='" + lastName + '\'' +
            ", phone='" + phone + '\'' +
            ", defaultAddress='" + defaultAddress + '\'' +
            ", disponibilite=" + disponibilite +
            ", affectations.size=" + (affectations != null ? affectations.size() : 0) +
            '}';
    }
}
