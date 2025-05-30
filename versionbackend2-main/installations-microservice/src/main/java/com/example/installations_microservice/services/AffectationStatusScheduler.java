package com.example.installations_microservice.services;

import com.example.installations_microservice.entities.Affectation;
import com.example.installations_microservice.entities.AffectationInstallateur;
import com.example.installations_microservice.entities.Disponibilite;
import com.example.installations_microservice.entities.Installateur;
import com.example.installations_microservice.entities.StatutAffectation;
import com.example.installations_microservice.repos.AffectationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class AffectationStatusScheduler {
    private static final Logger logger = LoggerFactory.getLogger(AffectationStatusScheduler.class);
    
    @Autowired
    private AffectationRepository affectationRepository;
    
    @Autowired
    private InstallateurService installateurService;
    
    @Scheduled(cron = "0 0 * * * *") // Toutes les heures
    @Transactional
    public void checkExpiredAffectations() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        
        // Modifier la requête pour chercher les AffectationInstallateur expirés
        List<AffectationInstallateur> expiredAffectations = affectationRepository
            .findExpiredAffectationInstallateurs(
                StatutAffectation.PLANIFIEE, 
                today,
                now
            );
        
        expiredAffectations.forEach(affectationInst -> {
            Affectation affectation = affectationInst.getAffectation();
            affectation.setStatut(StatutAffectation.TERMINEE);
            affectationRepository.save(affectation);
            
            Installateur installateur = affectationInst.getInstallateur();
            installateur.setDisponibilite(Disponibilite.DISPONIBLE);
            installateurService.save(installateur);
            
            logger.info("Affectation {} marquée comme terminée pour l'installateur {}", 
                affectation.getId(), installateur.getId());
        });
    }
}