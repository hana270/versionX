package com.example.installations_microservice.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public interface AffectationProjection {
    Long getId();
    Long getCommandeId();
    String getStatut();
    LocalDate getDateInstallation();
    LocalTime getHeureDebut();
    LocalTime getHeureFin();
    String getNotes();
    
 // Si vous avez besoin des infos de l'installateur
    default Long getInstallateurId() {
        return null;
    }
    
    default String getInstallateurNom() {
        return null;
    }
}