package com.example.installations_microservice.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import jakarta.validation.constraints.NotNull;

public class AffectationDTO {
    @NotNull(message = "Commande ID is required")
    private Long commandeId;
    
    @NotNull(message = "Installateurs are required")
    private List<InstallateurCreneauDTO> installateurs;
    
    private String notes;

	public Long getCommandeId() {
		return commandeId;
	}

	public void setCommandeId(Long commandeId) {
		this.commandeId = commandeId;
	}

	public List<InstallateurCreneauDTO> getInstallateurs() {
		return installateurs;
	}

	public void setInstallateurs(List<InstallateurCreneauDTO> installateurs) {
		this.installateurs = installateurs;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

    // Getters and Setters...
    
    
    
}
