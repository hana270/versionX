package com.example.installations_microservice.entities;

public class AvailabilityRequest {
    private Long installateurId;
    private String dateInstallation;
    private String heureDebut;
    private String heureFin;
	public Long getInstallateurId() {
		return installateurId;
	}
	public void setInstallateurId(Long installateurId) {
		this.installateurId = installateurId;
	}
	public String getDateInstallation() {
		return dateInstallation;
	}
	public void setDateInstallation(String dateInstallation) {
		this.dateInstallation = dateInstallation;
	}
	public String getHeureDebut() {
		return heureDebut;
	}
	public void setHeureDebut(String heureDebut) {
		this.heureDebut = heureDebut;
	}
	public String getHeureFin() {
		return heureFin;
	}
	public void setHeureFin(String heureFin) {
		this.heureFin = heureFin;
	}
    
    

}
