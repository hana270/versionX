package com.example.installations_microservice.dto;

public class InstallateurDTO {
    private Long id;
    private String nom;
    private Long userId;
    private String email;
    private String specialite;
    private String zoneIntervention;
    private String firstName;
    private String lastName;
    private String phone;
    private String disponibilite;
    // Exclude affectations or include only IDs if needed
	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public String getNom() {
		return nom;
	}
	public void setNom(String nom) {
		this.nom = nom;
	}
	public Long getUserId() {
		return userId;
	}
	public void setUserId(Long userId) {
		this.userId = userId;
	}
	public String getEmail() {
		return email;
	}
	public void setEmail(String email) {
		this.email = email;
	}
	public String getSpecialite() {
		return specialite;
	}
	public void setSpecialite(String specialite) {
		this.specialite = specialite;
	}
	public String getZoneIntervention() {
		return zoneIntervention;
	}
	public void setZoneIntervention(String zoneIntervention) {
		this.zoneIntervention = zoneIntervention;
	}
	public String getFirstName() {
		return firstName;
	}
	public void setFirstName(String firstName) {
		this.firstName = firstName;
	}
	public String getLastName() {
		return lastName;
	}
	public void setLastName(String lastName) {
		this.lastName = lastName;
	}
	public String getPhone() {
		return phone;
	}
	public void setPhone(String phone) {
		this.phone = phone;
	}
	public String getDisponibilite() {
		return disponibilite;
	}
	public void setDisponibilite(String disponibilite) {
		this.disponibilite = disponibilite;
	}
    
    // Constructors, getters, setters
    
}