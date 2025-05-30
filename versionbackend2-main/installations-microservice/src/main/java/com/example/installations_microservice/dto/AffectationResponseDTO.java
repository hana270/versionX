package com.example.installations_microservice.dto;

import java.util.List;

public class AffectationResponseDTO {
    private Long id;
    private Long commandeId;
    private List<InstallateurCreneauResponseDTO> installateurs;    private String statut;
    private String notes;
	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public Long getCommandeId() {
		return commandeId;
	}
	public void setCommandeId(Long commandeId) {
		this.commandeId = commandeId;
	}
	
	public List<InstallateurCreneauResponseDTO> getInstallateurs() {
		return installateurs;
	}
	public void setInstallateurs(List<InstallateurCreneauResponseDTO> installateurs) {
		this.installateurs = installateurs;
	}
	public String getStatut() {
		return statut;
	}
	public void setStatut(String statut) {
		this.statut = statut;
	}
	public String getNotes() {
		return notes;
	}
	public void setNotes(String notes) {
		this.notes = notes;
	}
    
    // Getters et Setters
    
}