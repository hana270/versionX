package com.example.installations_microservice.dto;

public class LigneCommandeResponse {
    private Long produitId;
    private int quantite;
    
    // Getters et setters
    public Long getProduitId() { return produitId; }
    public void setProduitId(Long produitId) { this.produitId = produitId; }
    public int getQuantite() { return quantite; }
    public void setQuantite(int quantite) { this.quantite = quantite; }
}