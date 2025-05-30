package com.example.installations_microservice.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotNull;

public class InstallateurCreneauDTO {
    @NotNull(message = "Installateur ID is required")
    private Long installateurId;
    
    @NotNull(message = "Installation date is required")
    private LocalDate dateInstallation;
    
    private LocalTime heureDebut;
    private LocalTime heureFin;
	public Long getInstallateurId() {
		return installateurId;
	}
	public void setInstallateurId(Long installateurId) {
		this.installateurId = installateurId;
	}
	public LocalDate getDateInstallation() {
		return dateInstallation;
	}
	public void setDateInstallation(LocalDate dateInstallation) {
		this.dateInstallation = dateInstallation;
	}
	public LocalTime getHeureDebut() {
		return heureDebut;
	}
	public void setHeureDebut(LocalTime heureDebut) {
		this.heureDebut = heureDebut;
	}
	public LocalTime getHeureFin() {
		return heureFin;
	}
	public void setHeureFin(LocalTime heureFin) {
		this.heureFin = heureFin;
	}

    // Getters and Setters...
    
    
}