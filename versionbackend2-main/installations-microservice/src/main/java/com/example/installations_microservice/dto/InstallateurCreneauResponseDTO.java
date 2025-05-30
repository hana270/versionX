package com.example.installations_microservice.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.Data;

@Data
public class InstallateurCreneauResponseDTO {
    private Long installateurId;
    private String installateurNom;
    private LocalDate dateInstallation;
    private LocalTime heureDebut;
    private LocalTime heureFin;
    
    
}