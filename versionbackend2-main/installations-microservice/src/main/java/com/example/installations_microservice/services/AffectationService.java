package com.example.installations_microservice.services;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import com.example.installations_microservice.dto.AffectationDTO;
import com.example.installations_microservice.dto.AffectationResponseDTO;
import com.example.installations_microservice.dto.CommandeResponse;
import com.example.installations_microservice.entities.Affectation;
import com.example.installations_microservice.entities.Installateur;

public interface AffectationService {
	public AffectationResponseDTO createAffectation(AffectationDTO dto);
	List<Affectation> getAffectationsByInstallateur(Long installateurId);
    List<CommandeResponse> getCommandesByInstallateur(Long installateurId);
    boolean isInstallateurAvailable(Installateur installateur, LocalDate date, 
            LocalTime startTime, LocalTime endTime);
    
    public List<AffectationResponseDTO> getAllAffectations();
    public AffectationResponseDTO getAffectationById(Long id);
    public List<AffectationResponseDTO> getAffectationsByCommande(Long commandeId);
    public AffectationResponseDTO updateAffectationStatus(Long id, String statut);
    public AffectationResponseDTO updateAffectation(Long id, AffectationDTO dto);
    //public AffectationResponseDTO updateAffectation(Long id, AffectationDTO dto);
    public AffectationResponseDTO updateAffectationStatusTerminer(Long id, String statut);
    boolean marquerInstallationTerminee(Long affectationId, Long installateurId);
    Optional<Long> findAffectationIdByCommandeId(Long commandeId);
    public boolean isLastInstaller(Long affectationId, Long installateurId); 
}
