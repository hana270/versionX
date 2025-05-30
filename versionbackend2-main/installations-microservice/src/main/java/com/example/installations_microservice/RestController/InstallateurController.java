package com.example.installations_microservice.RestController;

import com.example.installations_microservice.clients.UserServiceClient;
import com.example.installations_microservice.clients.dtos.UserDto;
import com.example.installations_microservice.entities.Installateur;
import com.example.installations_microservice.repos.InstallateurRepository;
import com.example.installations_microservice.services.InstallateurService;
import com.example.installations_microservice.services.InstallateurSyncService;
//import com.example.installations_microservice.services.PostMapping;
//import com.example.installations_microservice.services.RequestBody;
import com.example.installations_microservice.services.AffectationService;
//import com.example.installations_microservice.services.AffectationServiceImpl.AvailabilityRequest;

import jakarta.persistence.EntityNotFoundException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/installateurs")
public class InstallateurController {
    
    private static final Logger logger = LoggerFactory.getLogger(InstallateurController.class);
    
    private final InstallateurService installateurService;
    private final InstallateurSyncService installateurSyncService;
    private final InstallateurRepository installateurRepository;
    private final UserServiceClient userServiceClient;
    private final AffectationService affectationService; // Ajout de cette dépendance


    @Autowired
    public InstallateurController(InstallateurService installateurService,
                                InstallateurSyncService installateurSyncService,
                                InstallateurRepository installateurRepository,
                                UserServiceClient userServiceClient,
                                AffectationService affectationService) {
        this.installateurService = installateurService;
        this.installateurSyncService = installateurSyncService;
        this.installateurRepository = installateurRepository;
        this.userServiceClient = userServiceClient;
        this.affectationService = affectationService;
    }

    @PostMapping("/force-sync")
    public ResponseEntity<Map<String, Object>> forceSync() {
        Instant start = Instant.now();
        Map<String, Object> response = new HashMap<>();
        
        try {
            logger.info("Début de la synchronisation forcée");
            
            installateurSyncService.syncInstallateurs();
            
            long userServiceCount = userServiceClient.getInstallateursCommmande().size();
            long localCount = installateurRepository.count();
            
            Duration duration = Duration.between(start, Instant.now());
            
            response.put("status", "success");
            response.put("message", "Synchronisation terminée avec succès");
            response.put("durationMs", duration.toMillis());
            response.put("userServiceCount", userServiceCount);
            response.put("localCount", localCount);
            
            logger.info("Synchronisation réussie. Durée: {} ms", duration.toMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Échec de la synchronisation", e);
            
            response.put("status", "error");
            response.put("error", "SYNCHRONIZATION_FAILED");
            response.put("message", "Échec de la synchronisation: " + e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body(response);
        }
    }
    
    @GetMapping
    public ResponseEntity<List<Installateur>> getAllInstallateurs() {
        logger.debug("Récupération de tous les installateurs");
        return ResponseEntity.ok(installateurService.findAll());
    }
    
    @GetMapping("/disponibles")
    public ResponseEntity<List<Installateur>> getInstallateursDisponibles(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String zone) {
        logger.debug("Récupération des installateurs disponibles (date={}, zone={})", date, zone);
        return ResponseEntity.ok(installateurService.findDisponibles(date, zone));
    }
    
    @PostMapping
    public ResponseEntity<Installateur> createInstallateur(@RequestBody Installateur installateur) {
        logger.info("Création d'un nouvel installateur");
        Installateur saved = installateurService.save(installateur);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Installateur> updateInstallateur(
            @PathVariable Long id, @RequestBody Installateur installateur) {
        logger.info("Mise à jour de l'installateur avec ID: {}", id);
        return ResponseEntity.ok(installateurService.update(id, installateur));
    }

    @GetMapping("/by-specialite")
    public ResponseEntity<List<Installateur>> getInstallateursBySpecialite(
            @RequestParam String specialite) {
        logger.debug("Récupération par spécialité: {}", specialite);
        return ResponseEntity.ok(installateurService.findBySpecialite(specialite));
    }
    
    @GetMapping("/by-specialty")
    public ResponseEntity<List<Installateur>> getInstallateursBySpecialty(
            @RequestParam String specialty) {
        logger.debug("Récupération par specialty (EN): {}", specialty);
        return ResponseEntity.ok(installateurService.getInstallateursBySpecialtyFromUserService(specialty));
    }

    // Endpoints de debug - à désactiver en production
    @GetMapping("/debug/users")
    public ResponseEntity<List<UserDto>> debugUsers() {
        logger.warn("Accès à l'endpoint de debug - À désactiver en production");
        return ResponseEntity.ok(userServiceClient.getInstallateursCommmande());
    }

    @GetMapping("/debug/local")
    public ResponseEntity<List<Installateur>> debugLocal() {
        logger.warn("Accès à l'endpoint de debug - À désactiver en production");
        return ResponseEntity.ok(installateurRepository.findAll());
    }
    
    @GetMapping("/sync-status")
    public ResponseEntity<Map<String, Object>> getSyncStatus() {
        Map<String, Object> response = new HashMap<>();
        
        List<UserDto> users = userServiceClient.getInstallateursCommmande();
        List<Installateur> localInstallers = installateurRepository.findAll();
        
        response.put("userServiceCount", users.size());
        response.put("localCount", localInstallers.size());
        response.put("lastSync", "TODO: ajouter un timestamp de dernière sync");
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> cleanupInstallateurs() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<UserDto> activeUsers = userServiceClient.getInstallateursCommmande();
            int beforeCount = installateurRepository.findAll().size();
            
            installateurSyncService.cleanUpObsoleteInstallers(activeUsers);
            
            int afterCount = installateurRepository.findAll().size();
            int removed = beforeCount - afterCount;
            
            response.put("status", "success");
            response.put("removedCount", removed);
            response.put("message", "Nettoyage terminé. " + removed + " installateurs obsolètes supprimés.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Échec du nettoyage: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                               .body(response);
        }
    }
    
    @PostMapping("/migrate")
    public ResponseEntity<String> triggerMigration() {
        try {
            installateurService.migrateExistingInstallateurs();
            return ResponseEntity.ok("Migration des données terminée avec succès");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                               .body("Erreur lors de la migration: " + e.getMessage());
        }
    }
    
    @PutMapping("/{userId}/specialty")
    public ResponseEntity<Installateur> updateSpecialty(
            @PathVariable Long userId,
            @RequestParam String newSpecialty) {
        
        Installateur updated = installateurService.updateSpecialty(userId, newSpecialty);
        return ResponseEntity.ok(updated);
    }
    
    @GetMapping("/by-user/{userId}")
    public ResponseEntity<Long> getInstallateurIdByUserId(@PathVariable Long userId) {
        Long installateurId = installateurService.getInstallateurIdByUserId(userId);
        
        if (installateurId != null) {
            return ResponseEntity.ok(installateurId);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/by-installateur-id/{id}/userId")
    public ResponseEntity<Long> getUserIdByInstallateurId(@PathVariable Long id) {
        Long userId = installateurService.getUserIdByInstallateurId(id);
        
        if (userId != null) {
            return ResponseEntity.ok(userId);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
/*    @GetMapping("/with-status")
    public ResponseEntity<List<InstallateurWithStatusDTO>> getAllInstallateursWithStatus() {
        List<InstallateurWithStatusDTO> installateurs = installateurService.findAllWithAffectationStatus();
        return ResponseEntity.ok(installateurs);
    }*/

  /*  @PutMapping("/{id}/affectation-status")
    public ResponseEntity<?> updateAffectationStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request) {
        
        Boolean isAffected = request.get("isAffected");
        if (isAffected == null) {
            return ResponseEntity.badRequest().body("Le statut d'affectation est requis");
        }

        try {
            installateurService.updateAffectationStatus(id, isAffected);
            return ResponseEntity.ok().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Erreur lors de la mise à jour");
        }
    }*/
    
    @PostMapping("/check-availability")
    public ResponseEntity<?> checkAvailability(@RequestBody AvailabilityRequest request) {
        try {
            // Utilisez installateurService au lieu de installationService
            Installateur installateur = installateurService.findByUserId(request.getInstallateurId());
            if (installateur == null) {
                return ResponseEntity.badRequest().body("Installateur non trouvé");
            }

            LocalDate date = LocalDate.parse(request.getDateInstallation());
            LocalTime startTime = LocalTime.parse(request.getHeureDebut());
            LocalTime endTime = LocalTime.parse(request.getHeureFin());

            // Utilisez affectationService pour vérifier la disponibilité
            boolean available = affectationService.isInstallateurAvailable(
                installateur, 
                date, 
                startTime, 
                endTime
            );

            return ResponseEntity.ok().body(Map.of(
                "available", available,
                "message", available ? "Disponible" : "Non disponible à ce créneau"
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur de vérification: " + e.getMessage());
        }
    }


    static class AvailabilityRequest {
        private Long installateurId;
        private String dateInstallation;
        private String heureDebut;
        private String heureFin;
        
        // Getters et setters
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
}