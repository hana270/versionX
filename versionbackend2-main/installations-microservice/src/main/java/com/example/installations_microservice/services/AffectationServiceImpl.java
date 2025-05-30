package com.example.installations_microservice.services;

import com.example.installations_microservice.clients.OrdersServiceClient;
import com.example.installations_microservice.dto.AffectationDTO;
import com.example.installations_microservice.dto.AffectationInstallateurDTO;
import com.example.installations_microservice.dto.AffectationResponseDTO;
import com.example.installations_microservice.dto.CommandeResponse;
import com.example.installations_microservice.dto.InstallateurCreneauDTO;
import com.example.installations_microservice.dto.InstallateurCreneauResponseDTO;
import com.example.installations_microservice.entities.Affectation;
import com.example.installations_microservice.entities.AffectationInstallateur;
import com.example.installations_microservice.entities.Disponibilite;
import com.example.installations_microservice.entities.Installateur;
import com.example.installations_microservice.entities.StatutAffectation;
import com.example.installations_microservice.repos.AffectationRepository;
import com.example.installations_microservice.repos.InstallateurRepository;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityNotFoundException;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class AffectationServiceImpl implements AffectationService {

    private static final Logger logger = LoggerFactory.getLogger(CommandeSyncService.class);

    private final AffectationRepository affectationRepository;
    private final InstallateurService installateurService;
    private final OrdersServiceClient ordersServiceClient;
    private final CommandeSyncService commandeSyncService;
    private final InstallateurRepository installateurRepository;
    private final ModelMapper modelMapper;

    public AffectationServiceImpl(AffectationRepository affectationRepository, InstallateurService installateurService,
            OrdersServiceClient ordersServiceClient, CommandeSyncService commandeSyncService,
            InstallateurRepository installateurRepository,
            ModelMapper modelMapper) {
        this.affectationRepository = affectationRepository;
        this.installateurService = installateurService;
        this.ordersServiceClient = ordersServiceClient;
        this.commandeSyncService = commandeSyncService;
        this.installateurRepository = installateurRepository;
        this.modelMapper= modelMapper;
    }
    
    @Transactional
    @Override
    public AffectationResponseDTO createAffectation(AffectationDTO dto) {
        // Validation
        validateAffectationDTO(dto);

        // Verify commande exists (optional, if needed)
        verifyCommande(dto.getCommandeId());

        // Création entité
        Affectation affectation = new Affectation();
        affectation.setCommandeId(dto.getCommandeId());
        affectation.setStatut(StatutAffectation.PLANIFIEE);
        affectation.setNotes(dto.getNotes());
        affectation.setInstallateurs(new HashSet<>());

        // Sauvegarde initiale
        Affectation savedAffectation = affectationRepository.save(affectation);

        // Gestion installateurs
        for (InstallateurCreneauDTO creneauDTO : dto.getInstallateurs()) {
            // Find installateur by userId (eager load or within transaction)
            Installateur installateur = installateurService.findByUserId(creneauDTO.getInstallateurId());
            if (installateur == null) {
                throw new EntityNotFoundException("Installateur not found with userId: " + creneauDTO.getInstallateurId());
            }
            
            // Définir les heures par défaut si non fournies
            LocalTime heureDebut = creneauDTO.getHeureDebut() != null ? 
                creneauDTO.getHeureDebut() : LocalTime.of(8, 0);
            LocalTime heureFin = creneauDTO.getHeureFin() != null ? 
                creneauDTO.getHeureFin() : LocalTime.of(17, 0);
            
            // Verify availability avec les heures (défaut si nécessaire)
            boolean isAvailable = isInstallateurAvailable(
                installateur, 
                creneauDTO.getDateInstallation(),
                heureDebut,
                heureFin
            );
            
            if (!isAvailable) {
                throw new IllegalStateException("Installateur " + installateur.getNom() + 
                    " n'est pas disponible pour ce créneau");
            }
            
            AffectationInstallateur affectationInst = new AffectationInstallateur();
            affectationInst.setAffectation(savedAffectation);
            affectationInst.setInstallateur(installateur);
            affectationInst.setDateInstallation(creneauDTO.getDateInstallation());
            affectationInst.setHeureDebut(heureDebut);
            affectationInst.setHeureFin(heureFin);
            
            // Initialisation de l'ID composite
            affectationInst.getId().setAffectationId(savedAffectation.getId());
            affectationInst.getId().setInstallateurId(installateur.getId());
            
            savedAffectation.getInstallateurs().add(affectationInst);
        }

        // Update order status if needed
        updateOrderStatus(dto.getCommandeId());

        // Save final changes
        Affectation finalAffectation = affectationRepository.save(savedAffectation);
        
        // Conversion en DTO
        return convertToResponseDTO(finalAffectation);
    }
    
    private AffectationResponseDTO convertToResponseDTO(Affectation affectation) {
        AffectationResponseDTO response = new AffectationResponseDTO();
        
        // Mappage des champs de base
        response.setId(affectation.getId());
        response.setCommandeId(affectation.getCommandeId());
        response.setStatut(affectation.getStatut().toString());
        response.setNotes(affectation.getNotes());
        
        // Conversion des installateurs avec leurs créneaux
        List<InstallateurCreneauResponseDTO> creneauxResponse = affectation.getInstallateurs().stream()
            .map(ai -> {
                InstallateurCreneauResponseDTO dto = new InstallateurCreneauResponseDTO();
                dto.setInstallateurId(ai.getInstallateur().getUserId());
                dto.setInstallateurNom(ai.getInstallateur().getNom());
                
                // Ces champs viennent de AffectationInstallateur
                dto.setDateInstallation(ai.getDateInstallation());
                dto.setHeureDebut(ai.getHeureDebut());
                dto.setHeureFin(ai.getHeureFin());
                
                return dto;
            })
            .collect(Collectors.toList());
        
        response.setInstallateurs(creneauxResponse);
        
        return response;
    }

    private InstallateurCreneauDTO convertToInstallateurCreneauDTO(AffectationInstallateur ai) {
        InstallateurCreneauDTO dto = new InstallateurCreneauDTO();
        dto.setInstallateurId(ai.getInstallateur().getId());
        dto.setDateInstallation(ai.getDateInstallation());
        dto.setHeureDebut(ai.getHeureDebut());
        dto.setHeureFin(ai.getHeureFin());
        return dto;
    }

    @Transactional
    private void updateInstallersAvailability(Set<Installateur> installateurs, boolean disponible, Long affectationId) {
        installateurs.forEach(installateur -> {
            // Vérifie que l'installateur existe bien en base
            Installateur existingInstaller = installateurService.findByUserId(installateur.getUserId());
            if (existingInstaller == null) {
                throw new IllegalStateException("Installateur non trouvé avec userId: " + installateur.getUserId());
            }

            // Met à jour la disponibilité
            existingInstaller.setDisponibilite(disponible ? Disponibilite.DISPONIBLE : Disponibilite.INDISPONIBLE);

            // Sauvegarde
            installateurService.save(existingInstaller);

            logger.info("Mise à jour de l'installateur ID: {}, UserID: {}, Statut: {}", existingInstaller.getId(),
                    existingInstaller.getUserId(), existingInstaller.getDisponibilite());
        });
    }

    private Set<Installateur> verifyInstallateurs(Set<Long> installateursIds) {
        return installateursIds.stream().map(installateurService::findByUserId).collect(Collectors.toSet());
    }

    private Installateur verifyInstallateur(Long installateurId) {
        return installateurService.findByUserId(installateurId);
    }

    private Affectation createNewAffectation(AffectationDTO dto, Set<Installateur> installateurs) {
        Affectation affectation = new Affectation();
        affectation.setCommandeId(dto.getCommandeId());
        affectation.setStatut(StatutAffectation.PLANIFIEE);
        affectation.setNotes(dto.getNotes());
        
        // Les dates/heures sont maintenant gérées dans AffectationInstallateur
        return affectation;
    }

    @Transactional
    private void updateOrderStatus(Long commandeId) {
        try {
            // 1. Verify command exists and is in correct state
            logger.info("Fetching commande {} for status verification", commandeId);
            CommandeResponse commande = ordersServiceClient.getCommandeById(commandeId);
            logger.info("Current status of commande {}: {}", commandeId, commande.getStatut());

            // Check if status is EN_PREPARATION
            if (!"EN_PREPARATION".equalsIgnoreCase(commande.getStatut())) {
                String errorMsg = String.format("La commande %d doit être EN_PREPARATION avant affectation (statut actuel: %s)",
                        commandeId, commande.getStatut());
                logger.error(errorMsg);
                throw new IllegalStateException(errorMsg);
            }

            // 2. Update status to AFFECTER
            logger.info("Updating status of commande {} to AFFECTER", commandeId);
            ordersServiceClient.updateStatutCommande(commandeId, "AFFECTER");

            // Verify update was successful
            CommandeResponse updatedCommande = ordersServiceClient.getCommandeById(commandeId);
            if (!"AFFECTER".equalsIgnoreCase(updatedCommande.getStatut())) {
                throw new RuntimeException("Status update verification failed");
            }
            logger.info("Status updated successfully");

        } catch (Exception e) {
            logger.error("Failed to update commande status for commandeId: " + commandeId, e);
            throw new RuntimeException("Échec de la mise à jour du statut de la commande: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    @Override
    public List<Affectation> getAffectationsByInstallateur(Long installateurId) {
        return affectationRepository.findByInstallateurIdWithInstallateurs(installateurId);
    }

    @Transactional(readOnly = true)
    @Override
    public List<CommandeResponse> getCommandesByInstallateur(Long installateurId) {
        // First verify the installateur exists
        Installateur installateur = installateurRepository.findInstByUserId(installateurId);
        if (installateur == null) {
            throw new EntityNotFoundException("Installateur not found with ID: " + installateurId);
        }

        List<Affectation> affectations = affectationRepository.findByInstallateurIdWithInstallateurs(installateur.getId());
        
        return affectations.stream()
            .map(affectation -> {
                try {
                    return ordersServiceClient.getCommandeById(affectation.getCommandeId());
                } catch (Exception e) {
                    logger.error("Erreur lors de la récupération de la commande {}", affectation.getCommandeId(), e);
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isInstallateurAvailable(Installateur installateur, LocalDate date, 
                                         LocalTime startTime, LocalTime endTime) {
        // 1. Vérifier les heures de travail standard
        if (!isWithinWorkingHours(startTime, endTime)) {
            logger.warn("Créneau {} - {} invalide (hors plage travail)", startTime, endTime);
            return false;
        }

        // 2. Vérifier la pause déjeuner
        if (overlapsLunchBreak(startTime, endTime)) {
            logger.warn("Créneau {} - {} chevauche la pause déjeuner", startTime, endTime);
            return false;
        }

        // 3. Vérifier les affectations existantes
        List<AffectationInstallateur> affectations = affectationRepository
            .findActiveByInstallateurAndDate(installateur.getId(), date);

        logger.info("Vérification créneaux pour installateur {} le {} de {} à {}. {} affectations trouvées",
            installateur.getId(), date, startTime, endTime, affectations.size());

        // 4. Vérifier les chevauchements
        for (AffectationInstallateur aff : affectations) {
            if (hasTimeConflict(startTime, endTime, aff.getHeureDebut(), aff.getHeureFin())) {
                logger.warn("Conflit avec affectation existante: {} ({} - {})", 
                    aff.getId(), aff.getHeureDebut(), aff.getHeureFin());
                return false;
            }
        }

        return true;
    }
    
    

    private boolean isWithinWorkingHours(LocalTime start, LocalTime end) {
        LocalTime morningStart = LocalTime.of(8, 0);
        LocalTime morningEnd = LocalTime.of(12, 0);
        LocalTime afternoonStart = LocalTime.of(14, 0);
        LocalTime afternoonEnd = LocalTime.of(18, 0);

        boolean validMorning = !start.isBefore(morningStart) && !end.isAfter(morningEnd);
        boolean validAfternoon = !start.isBefore(afternoonStart) && !end.isAfter(afternoonEnd);

        return (validMorning || validAfternoon) && !start.isAfter(end);
    }

    private boolean overlapsLunchBreak(LocalTime start, LocalTime end) {
        LocalTime lunchStart = LocalTime.of(12, 0);
        LocalTime lunchEnd = LocalTime.of(14, 0);
        return hasTimeConflict(start, end, lunchStart, lunchEnd);
    }
    
    private boolean hasTimeConflict(LocalTime newStart, LocalTime newEnd, 
                                   LocalTime existingStart, LocalTime existingEnd) {
        return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
    }

    private boolean isTimeOverlap(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2) {
        return !(end1.isBefore(start2) || end2.isBefore(start1));
    }

    private void validateAffectationDTO(AffectationDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Les données d'affectation doivent être renseignées");
        }

        if (dto.getInstallateurs() == null || dto.getInstallateurs().isEmpty()) {
            throw new IllegalArgumentException("Au moins un installateur doit être spécifié");
        }

        if (dto.getCommandeId() == null) {
            throw new IllegalArgumentException("L'ID de la commande doit être renseigné");
        }

        // Validation des créneaux
        for (InstallateurCreneauDTO creneau : dto.getInstallateurs()) {
            if (creneau.getDateInstallation() == null) {
                throw new IllegalArgumentException("La date d'installation doit être renseignée pour tous les installateurs");
            }
            
            LocalTime heureDebut = creneau.getHeureDebut() != null ? creneau.getHeureDebut() : LocalTime.of(8, 0);
            LocalTime heureFin = creneau.getHeureFin() != null ? creneau.getHeureFin() : LocalTime.of(17, 0);
            
            if (heureDebut.isAfter(heureFin)) {
                throw new IllegalArgumentException("L'heure de début doit être avant l'heure de fin pour chaque installateur");
            }
        }
    }

    private void verifyCommande(Long commandeId) {
        if (!commandeSyncService.verifyCommandeExists(commandeId)) {
            throw new RuntimeException("Commande non trouvée avec ID: " + commandeId);
        }
    }

    @Transactional
    private void updateInstallersAvailability(Set<Installateur> installateurs, boolean disponible) {
        installateurs.forEach(installateur -> {
            installateur.setDisponibilite(disponible ? Disponibilite.DISPONIBLE : Disponibilite.INDISPONIBLE);
            installateurService.save(installateur);
        });
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<AffectationResponseDTO> getAllAffectations() {
        List<Affectation> affectations = affectationRepository.findAll();
        return affectations.stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public AffectationResponseDTO getAffectationById(Long id) {
        Affectation affectation = affectationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Affectation non trouvée avec l'ID: " + id));
        return convertToResponseDTO(affectation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AffectationResponseDTO> getAffectationsByCommande(Long commandeId) {
        List<Affectation> affectations = affectationRepository.findByCommandeId(commandeId);
        return affectations.stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }
    
    //update affectation
    @Override
    @Transactional
    public AffectationResponseDTO updateAffectation(Long id, AffectationDTO dto) {
        // 1. Récupérer l'affectation existante
        Affectation affectation = affectationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Affectation non trouvée avec l'ID: " + id));

        // 2. Validation des données
        validateAffectationDTO(dto);

        // 3. Vérifier la commande
        verifyCommande(dto.getCommandeId());

        // 4. Mise à jour des propriétés de base
        affectation.setNotes(dto.getNotes());
        
        // 5. Gestion des installateurs
        // Supprimer les anciennes relations qui ne sont plus dans le DTO
        Set<Long> newInstallerIds = dto.getInstallateurs().stream()
                .map(InstallateurCreneauDTO::getInstallateurId)
                .collect(Collectors.toSet());
        
        affectation.getInstallateurs().removeIf(ai -> 
            !newInstallerIds.contains(ai.getInstallateur().getId())
        );

        // Mettre à jour ou ajouter les nouveaux installateurs
        for (InstallateurCreneauDTO creneauDTO : dto.getInstallateurs()) {
            Installateur installateur = installateurService.findByUserId(creneauDTO.getInstallateurId());
            if (installateur == null) {
                throw new EntityNotFoundException("Installateur non trouvé avec l'ID: " + creneauDTO.getInstallateurId());
            }

            // Vérifier la disponibilité (sauf pour l'installateur lui-même s'il ne change pas de créneau)
            boolean isAvailable = isInstallateurAvailable(
                installateur,
                creneauDTO.getDateInstallation(),
                creneauDTO.getHeureDebut() != null ? creneauDTO.getHeureDebut() : LocalTime.of(8, 0),
                creneauDTO.getHeureFin() != null ? creneauDTO.getHeureFin() : LocalTime.of(17, 0)
            );

            if (!isAvailable) {
                throw new IllegalStateException("L'installateur " + installateur.getNom() + 
                    " n'est pas disponible pour ce créneau");
            }

            // Trouver ou créer la relation
            AffectationInstallateur affectationInst = affectation.getInstallateurs().stream()
                    .filter(ai -> ai.getInstallateur().getId().equals(installateur.getId()))
                    .findFirst()
                    .orElseGet(() -> {
                        AffectationInstallateur newAi = new AffectationInstallateur();
                        newAi.setAffectation(affectation);
                        newAi.setInstallateur(installateur);
                        newAi.getId().setAffectationId(affectation.getId());
                        newAi.getId().setInstallateurId(installateur.getId());
                        return newAi;
                    });

            // Mettre à jour les créneaux
            affectationInst.setDateInstallation(creneauDTO.getDateInstallation());
            affectationInst.setHeureDebut(creneauDTO.getHeureDebut() != null ? 
                creneauDTO.getHeureDebut() : LocalTime.of(8, 0));
            affectationInst.setHeureFin(creneauDTO.getHeureFin() != null ? 
                creneauDTO.getHeureFin() : LocalTime.of(17, 0));
        }

        // 6. Sauvegarder
        Affectation updatedAffectation = affectationRepository.save(affectation);
        return convertToResponseDTO(updatedAffectation);
    }

    @Override
    @Transactional
    public AffectationResponseDTO updateAffectationStatus(Long id, String statut) {
        // 1. Récupérer l'affectation
        Affectation affectation = affectationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Affectation non trouvée avec l'ID: " + id));

        // 2. Valider le statut
        try {
            StatutAffectation newStatus = StatutAffectation.valueOf(statut.toUpperCase());
            
            // 3. Mettre à jour le statut
            affectation.setStatut(newStatus);
            
            // 4. Sauvegarder
            Affectation updatedAffectation = affectationRepository.save(affectation);
            
            // 5. Mettre à jour le statut de la commande si nécessaire
            if (newStatus == StatutAffectation.TERMINEE || newStatus == StatutAffectation.ANNULEE) {
                try {
                    ordersServiceClient.updateStatutCommande(
                        affectation.getCommandeId(), 
                        newStatus == StatutAffectation.TERMINEE ? "TERMINEE" : "ANNULEE"
                    );
                } catch (Exception e) {
                    logger.error("Erreur lors de la mise à jour du statut de la commande", e);
                }
            }
            
            return convertToResponseDTO(updatedAffectation);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Statut invalide: " + statut);
        }
    }
    
    @Override
    @Transactional
    public AffectationResponseDTO updateAffectationStatusTerminer(Long id, String statut) {
        // 1. Récupérer l'affectation
        Affectation affectation = affectationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Affectation non trouvée avec l'ID: " + id));

        // 2. Valider le statut
        try {
            StatutAffectation newStatus = StatutAffectation.valueOf(statut.toUpperCase());
            
            // 3. Mettre à jour le statut
            affectation.setStatut(newStatus);
            
            // 4. Sauvegarder
            Affectation updatedAffectation = affectationRepository.save(affectation);
            
            // 5. Mettre à jour le statut de la commande si nécessaire
            if (newStatus == StatutAffectation.TERMINEE) {
                try {
                    ordersServiceClient.updateStatutCommande(
                        affectation.getCommandeId(), 
                        "INSTALLATION_TERMINEE"
                    );
                    
                    // 6. Libérer les installateurs
                    for (AffectationInstallateur ai : affectation.getInstallateurs()) {
                        Installateur installateur = ai.getInstallateur();
                        installateur.setDisponibilite(Disponibilite.DISPONIBLE);
                        installateurService.save(installateur);
                    }
                } catch (Exception e) {
                    logger.error("Erreur lors de la mise à jour du statut de la commande", e);
                }
            }
            
            return convertToResponseDTO(updatedAffectation);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Statut invalide: " + statut);
        }
    }
    
    @Override
    @Transactional
    public boolean marquerInstallationTerminee(Long affectationId, Long installateurId) {
        // 1. Verrouillage et chargement
        affectationRepository.lockAffectation(affectationId);
        Affectation affectation = affectationRepository.findByIdWithInstallateursForUpdate(affectationId)
            .orElseThrow(() -> new EntityNotFoundException("Affectation non trouvée"));

        // 2. Trouver l'installateur courant
        AffectationInstallateur currentInstaller = affectation.getInstallateurs().stream()
            .filter(ai -> ai.getInstallateur().getId().equals(installateurId))
            .findFirst()
            .orElseThrow(() -> new EntityNotFoundException("Installateur non trouvé dans cette affectation"));

        // 3. Marquer cet installateur comme terminé
        currentInstaller.setTermine(true);
        affectationRepository.save(affectation);

        // 4. Trouver le créneau horaire le plus récent
        Optional<AffectationInstallateur> dernierCreneau = affectation.getInstallateurs().stream()
            .max(Comparator.comparing(AffectationInstallateur::getDateInstallation)
                .thenComparing(AffectationInstallateur::getHeureDebut)
                .thenComparing(ai -> ai.getInstallateur().getId()));

        // 5. Vérifier si l'installateur courant est dans le dernier créneau
        if (dernierCreneau.isPresent() && 
            dernierCreneau.get().getInstallateur().getId().equals(installateurId) &&
            currentInstaller.getDateInstallation().equals(dernierCreneau.get().getDateInstallation()) &&
            currentInstaller.getHeureDebut().equals(dernierCreneau.get().getHeureDebut())) {

            // 6. Vérifier que tous les installateurs du dernier créneau ont terminé
            boolean tousTermines = affectation.getInstallateurs().stream()
                .filter(ai -> ai.getDateInstallation().equals(dernierCreneau.get().getDateInstallation())
                           && ai.getHeureDebut().equals(dernierCreneau.get().getHeureDebut()))
                .allMatch(ai -> Boolean.TRUE.equals(ai.getTermine()));

            if (tousTermines) {
                // 7. Vérifier que tous les créneaux antérieurs sont terminés
                boolean tousCreneauxTermines = affectation.getInstallateurs().stream()
                    .filter(ai -> ai.getDateInstallation().isBefore(dernierCreneau.get().getDateInstallation()) ||
                                 (ai.getDateInstallation().equals(dernierCreneau.get().getDateInstallation()) && 
                                  ai.getHeureDebut().isBefore(dernierCreneau.get().getHeureDebut())))
                    .allMatch(ai -> Boolean.TRUE.equals(ai.getTermine()));

                if (tousCreneauxTermines) {
                    affectation.setStatut(StatutAffectation.TERMINEE);
                    affectationRepository.save(affectation);
                    return true;
                }
            }
        }
        return false;
    }

    // Helper record for time slot grouping
    record InstallTimeSlot(LocalDate date, LocalTime startTime) {}
    
    @Override
    @Transactional(readOnly = true)
    public Optional<Long> findAffectationIdByCommandeId(Long commandeId) {
        return affectationRepository.findByCommandeId(commandeId)
                .stream()
                .findFirst()
                .map(Affectation::getId);
    }
    
    @Override
    public boolean isLastInstaller(Long affectationId, Long installateurId) {
        Affectation affectation = affectationRepository.findByIdWithInstallateurs(affectationId)
            .orElseThrow(() -> new EntityNotFoundException("Affectation non trouvée"));

        // Filtrer seulement les installateurs non terminés
        Optional<AffectationInstallateur> dernierNonTermine = affectation.getInstallateurs().stream()
            .filter(ai -> !Boolean.TRUE.equals(ai.getTermine()))
            .max(Comparator.comparing(AffectationInstallateur::getDateInstallation)
                .thenComparing(AffectationInstallateur::getHeureDebut)
                .thenComparing(ai -> ai.getInstallateur().getId()));

        // Si tous ont terminé ou si l'installateur courant est le dernier non terminé
        return dernierNonTermine.isEmpty() || 
               dernierNonTermine.get().getInstallateur().getId().equals(installateurId);
    }
    
    
}