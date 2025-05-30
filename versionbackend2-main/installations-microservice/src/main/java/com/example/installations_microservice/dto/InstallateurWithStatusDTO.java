package com.example.installations_microservice.dto;

import java.util.List;
import java.util.stream.Collectors;

import com.example.installations_microservice.entities.Installateur;
/*
public class InstallateurWithStatusDTO {
    private Long id;
    private String nom;
    private String email;
    private String specialite;
    private boolean isAffected;
    private List<AffectationDTO> affectations;

    // Constructeurs, getters et setters
    public InstallateurWithStatusDTO(Installateur installateur) {
        this.id = installateur.getId();
        this.nom = installateur.getNom();
        this.email = installateur.getEmail();
        this.specialite = installateur.getSpecialite();
        this.affectations = installateur.getAffectations().stream()
            .map(AffectationDTO::new)
            .collect(Collectors.toList());
        this.isAffected = !affectations.isEmpty();
    }
}*/