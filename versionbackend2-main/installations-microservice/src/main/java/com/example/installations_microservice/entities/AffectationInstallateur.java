package com.example.installations_microservice.entities;

import java.time.LocalDate;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "affectation_installateurs")
@Data
@Getter 
@Setter
public class AffectationInstallateur {
	@EmbeddedId
    private AffectationInstallateurId id = new AffectationInstallateurId(); // Initialisation
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("affectationId")
    @JoinColumn(name = "affectation_id")
    @JsonBackReference
    @ToString.Exclude // Empêche le toString() de Lombok de créer une récursion infinie
    @EqualsAndHashCode.Exclude 
    private Affectation affectation;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("installateurId")
    @JoinColumn(name = "installateur_id")
    @ToString.Exclude // Empêche le toString() de Lombok de créer une récursion infinie
    @EqualsAndHashCode.Exclude
    private Installateur installateur;
    
    private LocalDate dateInstallation;
    private LocalTime heureDebut;
    private LocalTime heureFin;
    
    @Column(nullable = false)
    private Boolean termine = false;
    
    // autres champs spécifiques à la relation si nécessaire
    @PrePersist
    public void prePersist() {
        if (this.id == null) {
            this.id = new AffectationInstallateurId();
        }
        if (this.affectation != null) {
            this.id.setAffectationId(this.affectation.getId());
        }
        if (this.installateur != null) {
            this.id.setInstallateurId(this.installateur.getId());
        }
    }
    
    @Override
    public String toString() {
        return "AffectationInstallateur{" +
            "id=" + id +
            ", dateInstallation=" + dateInstallation +
            ", heureDebut=" + heureDebut +
            ", heureFin=" + heureFin +
            '}';
    }
    
    public boolean isTermine() {
        return termine != null && termine;
    }

    
}