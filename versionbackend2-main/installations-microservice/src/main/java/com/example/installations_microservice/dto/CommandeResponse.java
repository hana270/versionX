package com.example.installations_microservice.dto;

import java.time.LocalDateTime;
import java.util.List;

public class CommandeResponse {
	private Long id;
    private String numeroCommande;
    private Long clientId;
    private String emailClient;
    private String statut;
    private List<LigneCommandeResponse> lignesCommande;
    private String adresseLivraison;
    private String codePostal;
    private String ville;
    private String region;
    private Long affectationId;
    private String clientNom;
    private String clientPrenom;
    private String clientTelephone;
    private LocalDateTime dateCreation;
    
    
	public LocalDateTime getDateCreation() {
		return dateCreation;
	}
	public void setDateCreation(LocalDateTime dateCreation) {
		this.dateCreation = dateCreation;
	}
	public String getClientNom() {
		return clientNom;
	}
	public void setClientNom(String clientNom) {
		this.clientNom = clientNom;
	}
	public String getClientPrenom() {
		return clientPrenom;
	}
	public void setClientPrenom(String clientPrenom) {
		this.clientPrenom = clientPrenom;
	}
	public String getClientTelephone() {
		return clientTelephone;
	}
	public void setClientTelephone(String clientTelephone) {
		this.clientTelephone = clientTelephone;
	}
	public Long getAffectationId() {
		return affectationId;
	}
	public void setAffectationId(Long affectationId) {
		this.affectationId = affectationId;
	}
	// Getters et setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNumeroCommande() { return numeroCommande; }
    public void setNumeroCommande(String numeroCommande) { this.numeroCommande = numeroCommande; }
    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    
    public String getEmailClient() {
		return emailClient;
	}
	public void setEmailClient(String emailClient) {
		this.emailClient = emailClient;
	}
	public List<LigneCommandeResponse> getLignesCommande() {
		return lignesCommande;
	}
	public void setLignesCommande(List<LigneCommandeResponse> lignesCommande) {
		this.lignesCommande = lignesCommande;
	}
	public String getAdresseLivraison() {
		return adresseLivraison;
	}
	public void setAdresseLivraison(String adresseLivraison) {
		this.adresseLivraison = adresseLivraison;
	}
	public String getCodePostal() {
		return codePostal;
	}
	public void setCodePostal(String codePostal) {
		this.codePostal = codePostal;
	}
	public String getVille() {
		return ville;
	}
	public void setVille(String ville) {
		this.ville = ville;
	}
	public String getRegion() {
		return region;
	}
	public void setRegion(String region) {
		this.region = region;
	}
}