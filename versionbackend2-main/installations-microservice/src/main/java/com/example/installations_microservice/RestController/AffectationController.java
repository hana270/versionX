package com.example.installations_microservice.RestController;

import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.installations_microservice.clients.OrdersServiceClient;
import com.example.installations_microservice.dto.AffectationDTO;
import com.example.installations_microservice.dto.AffectationInstallateurDTO;
import com.example.installations_microservice.dto.AffectationResponseDTO;
import com.example.installations_microservice.dto.CommandeResponse;
import com.example.installations_microservice.dto.InstallateurCreneauDTO;
import com.example.installations_microservice.entities.Affectation;
import com.example.installations_microservice.entities.AffectationInstallateur;
import com.example.installations_microservice.entities.Disponibilite;
import com.example.installations_microservice.entities.Installateur;
import com.example.installations_microservice.repos.AffectationRepository;
import com.example.installations_microservice.repos.InstallateurRepository;
import com.example.installations_microservice.services.AffectationService;
import com.example.installations_microservice.services.CommandeSyncService;
import com.example.installations_microservice.services.InstallateurService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/affectations")
public class AffectationController {
	
    private static final Logger logger = LoggerFactory.getLogger(InstallateurController.class);

    
    @Autowired
    AffectationService affectationService;
    
    @Autowired
    CommandeSyncService commandeSyncService;
    
    @Autowired
    InstallateurRepository installateurRepository;
    
    @Autowired
    InstallateurService installateurService;
    
    @Autowired
    private OrdersServiceClient ordersServiceClient;
    
    @Autowired
    private AffectationRepository affectationRepository;
    
    @PostMapping
    public ResponseEntity<?> createAffectation(@RequestBody @Valid AffectationDTO affectationDTO) {
        try {
            AffectationResponseDTO response = affectationService.createAffectation(affectationDTO);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erreur création affectation", e);
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }
    /*@PostMapping
    public ResponseEntity<Affectation> createAffectation(@RequestBody AffectationDTO affectationDTO) {
        Affectation createdAffectation = affectationService.createAffectation(affectationDTO);
        return ResponseEntity.ok(createdAffectation);
    }*/
    
    @PostMapping("/affecterinstallation/{idcommande}")
    public ResponseEntity<?> affecterInstallation(
            @PathVariable Long idcommande,
            @RequestBody @Valid AffectationDTO affectationDTO) {
        
        try {
            // Validation de base
            if (affectationDTO.getInstallateurs() == null || affectationDTO.getInstallateurs().isEmpty()) {
                return ResponseEntity.badRequest().body("Au moins un installateur doit être spécifié");
            }

            // Vérification commande
            CommandeResponse commande = commandeSyncService.forceSyncCommande(idcommande);
            if (!"EN_PREPARATION".equals(commande.getStatut())) {
                return ResponseEntity.badRequest().body("La commande doit être EN_PREPARATION avant affectation");
            }

            // Vérifier chaque installateur
            for (InstallateurCreneauDTO creneau : affectationDTO.getInstallateurs()) {
                Installateur inst = installateurService.findByUserId(creneau.getInstallateurId());
                if (inst == null) {
                    return ResponseEntity.badRequest().body("Installateur non trouvé: " + creneau.getInstallateurId());
                }
                
                LocalTime heureDebut = getOrDefault(creneau.getHeureDebut(), LocalTime.of(8, 0));
                LocalTime heureFin = getOrDefault(creneau.getHeureFin(), LocalTime.of(17, 0));

                if (!affectationService.isInstallateurAvailable(inst, creneau.getDateInstallation(), heureDebut, heureFin)) {
                    String message = String.format(
                        "L'installateur %s n'est pas disponible le %s entre %s et %s",
                        inst.getNom(), creneau.getDateInstallation(), heureDebut, heureFin);
                    return ResponseEntity.badRequest().body(message);
                }
            }

            // Création de l'affectation
            affectationDTO.setCommandeId(idcommande);
            AffectationResponseDTO response = affectationService.createAffectation(affectationDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Erreur affectation", e);
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }
    
    
    
    private void applyDefaultTimes(AffectationDTO dto) {
        dto.getInstallateurs().forEach(creneau -> {
            creneau.setHeureDebut(getOrDefault(creneau.getHeureDebut(), LocalTime.of(8, 0)));
            creneau.setHeureFin(getOrDefault(creneau.getHeureFin(), LocalTime.of(17, 0)));
        });
    }

    private <T> T getOrDefault(T value, T defaultValue) {
        return value != null ? value : defaultValue;
    }
    
    
    private Set<Installateur> verifyInstallateurs(Set<Long> installateursIds) {
        return installateursIds.stream()
                .map(userId -> {
                    Installateur inst = installateurService.findByUserId(userId);
                    logger.info("Installateur trouvé - ID: {}, UserID: {}, Nom: {}, Disponibilité: {}",
                        inst.getId(), inst.getUserId(), inst.getNom(), inst.getDisponibilite());
                    return inst;
                })
                .collect(Collectors.toSet());
    }
    
    @GetMapping("/sync-commande/{id}")
    public ResponseEntity<?> debugSyncCommande(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(commandeSyncService.forceSyncCommande(id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "error", e.getMessage(),
                    "cause", e.getCause() != null ? e.getCause().getMessage() : "none"
                ));
        }
    }
    
    @GetMapping("/installateur/{installateurId}")
    public ResponseEntity<List<Affectation>> getAffectationsByInstallateur(
            @PathVariable Long installateurId) {
        return ResponseEntity.ok(affectationService.getAffectationsByInstallateur(installateurId));
    }
    
    @GetMapping("/installateur/{installateurId}/commandes")
    public ResponseEntity<List<CommandeResponse>> getCommandesByInstallateur(
            @PathVariable Long installateurId) {
        return ResponseEntity.ok(affectationService.getCommandesByInstallateur(installateurId));
    }

    @PostMapping("/affecter")
    public ResponseEntity<?> affecterInstallation(
            @RequestBody @Valid AffectationDTO affectationDTO) {
        try {
            // Appliquer les heures par défaut
            applyDefaultTimes(affectationDTO);
            
            AffectationResponseDTO response = affectationService.createAffectation(affectationDTO);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erreur affectation", e);
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    //affiche toutes les affectations
    @GetMapping
    public ResponseEntity<List<AffectationResponseDTO>> getAllAffectations() {
        List<AffectationResponseDTO> affectations = affectationService.getAllAffectations();
        return ResponseEntity.ok(affectations);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AffectationResponseDTO> getAffectationById(@PathVariable Long id) {
        AffectationResponseDTO affectation = affectationService.getAffectationById(id);
        return ResponseEntity.ok(affectation);
    }

    @GetMapping("/commande/{commandeId}")
    public ResponseEntity<List<AffectationResponseDTO>> getAffectationsByCommande(@PathVariable Long commandeId) {
        List<AffectationResponseDTO> affectations = affectationService.getAffectationsByCommande(commandeId);
        return ResponseEntity.ok(affectations);
    }
    
    //update affectation
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAffectation(
            @PathVariable Long id,
            @RequestBody @Valid AffectationDTO affectationDTO) {
        try {
            AffectationResponseDTO updatedAffectation = affectationService.updateAffectation(id, affectationDTO);
            return ResponseEntity.ok(updatedAffectation);
        } catch (Exception e) {
            logger.error("Erreur lors de la modification de l'affectation", e);
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }

    //terminer une affectation
    @PutMapping("/{id}/terminer-installation")
    public ResponseEntity<?> terminerInstallation(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        try {
            // 1. Vérifier que l'utilisateur est un installateur affecté
            AffectationResponseDTO affectation = affectationService.getAffectationById(id);
            Installateur installateur = installateurRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("Installateur non trouvé"));

            // 2. Marquer cet installateur comme ayant terminé sa partie
            boolean isLastInstaller = affectationService.marquerInstallationTerminee(id, installateur.getId());

            // 3. Si c'est le dernier installateur, mettre à jour le statut global
            if (isLastInstaller) {
                ordersServiceClient.updateStatutCommande(
                    affectation.getCommandeId(), 
                    "INSTALLATION_TERMINEE"
                );
            }

            return ResponseEntity.ok(Map.of(
                "message", "Votre partie de l'installation a été marquée comme terminée",
                "installationComplete", isLastInstaller
            ));
        } catch (Exception e) {
            logger.error("Erreur lors de la finalisation de l'installation", e);
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }
    
    @GetMapping("/commande/{commandeId}/affectation-id")
    public ResponseEntity<?> getAffectationIdByCommandeId(@PathVariable Long commandeId) {
        try {
            Optional<Long> affectationId = affectationService.findAffectationIdByCommandeId(commandeId);
            return affectationId
                    .map(id -> ResponseEntity.ok(Map.of("affectationId", id)))
                    .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération de l'ID d'affectation pour la commande: " + commandeId, e);
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }
    
    @GetMapping("/{affectationId}/installation-status/{installateurId}")
    public ResponseEntity<?> getInstallationStatus(
            @PathVariable Long affectationId,
            @PathVariable Long installateurId) {
        try {
            Affectation affectation = affectationRepository.findByIdWithInstallateurs(affectationId)
                .orElseThrow(() -> new EntityNotFoundException("Affectation non trouvée"));

            // Vérifier si l'installateur a déjà terminé
            boolean alreadyCompleted = affectation.getInstallateurs().stream()
                .filter(ai -> ai.getInstallateur().getId().equals(installateurId))
                .anyMatch(ai -> Boolean.TRUE.equals(ai.getTermine()));

            // Vérifier si c'est le dernier installateur
            boolean isLastInstaller = affectation.getInstallateurs().stream()
                .filter(ai -> !Boolean.TRUE.equals(ai.getTermine())) // Ne considérer que ceux pas encore terminés
                .max(Comparator.comparing(AffectationInstallateur::getDateInstallation)
                    .thenComparing(AffectationInstallateur::getHeureDebut)
                    .thenComparing(ai -> ai.getInstallateur().getId()))
                .map(ai -> ai.getInstallateur().getId().equals(installateurId))
                .orElse(true); // Si tous ont terminé, considérer comme dernier

            return ResponseEntity.ok(Map.of(
                "alreadyCompleted", alreadyCompleted,
                "isLastInstaller", isLastInstaller
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur: " + e.getMessage());
        }
    }
    
}