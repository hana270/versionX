package com.example.installations_microservice.services;

import com.example.installations_microservice.clients.UserServiceClient;
import com.example.installations_microservice.clients.dtos.UserDto;
import com.example.installations_microservice.entities.Disponibilite;
import com.example.installations_microservice.entities.Installateur;
import com.example.installations_microservice.repos.InstallateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class InstallateurSyncService {
    
    private static final Logger logger = LoggerFactory.getLogger(InstallateurSyncService.class);
    
    private final InstallateurRepository installateurRepository;
    private final UserServiceClient userServiceClient;

    public InstallateurSyncService(InstallateurRepository installateurRepository, 
                                 UserServiceClient userServiceClient) {
        this.installateurRepository = installateurRepository;
        this.userServiceClient = userServiceClient;
    }

    @Transactional
    public void syncInstallateurs() {
        try {
            logger.info("Début de la synchronisation des installateurs");
            
            List<UserDto> users = userServiceClient.getInstallateursCommmande();
            logger.info("{} installateurs trouvés dans le service User", users.size());
            
            if (users.isEmpty()) {
                logger.warn("Aucun installateur trouvé dans le service User!");
                return;
            }

            users.forEach(this::syncSingleInstaller);
            cleanUpObsoleteInstallers(users);
            
            logger.info("Synchronisation terminée avec succès");
            
        } catch (Exception e) {
            logger.error("Erreur lors de la synchronisation", e);
            throw new RuntimeException("Erreur de synchronisation", e);
        }
    }

    private void syncSingleInstaller(UserDto user) {
        try {
            if (user.getUser_id() == null) {
                logger.error("User ID ne peut pas être null");
                return;
            }
            
            if (user.getEmail() == null) {
                logger.warn("Email manquant pour l'utilisateur {}, attribution d'un email par défaut", user.getUser_id());
                user.setEmail("email_manquant_" + user.getUser_id() + "@example.com");
            }

            Installateur installateur = installateurRepository.findByUserId(user.getUser_id())
                .orElseGet(() -> createNewInstaller(user));

            updateInstallerData(installateur, user);
            installateurRepository.save(installateur);
            
        } catch (Exception e) {
            logger.error("Échec du traitement de l'installateur {}: {}", user.getUser_id(), e.getMessage(), e);
        }
    }

    private Installateur createNewInstaller(UserDto user) {
        Installateur newInstaller = new Installateur();
        newInstaller.setUserId(user.getUser_id());
        newInstaller.setNom(user.getUsername());
        newInstaller.setEmail(user.getEmail());
        newInstaller.setFirstName(user.getFirstName());
        newInstaller.setLastName(user.getLastName());
        newInstaller.setPhone(user.getPhone());
        newInstaller.setDefaultAddress(user.getDefaultAddress());
        newInstaller.setDisponibilite(Disponibilite.DISPONIBLE);
        newInstaller.setZoneIntervention("Toutes");
        newInstaller.setSpecialite(user.getSpecialty() != null 
            ? translateSpecialty(user.getSpecialty()) 
            : "Non spécifiée");
        return newInstaller;
    }

    private void updateInstallerData(Installateur installateur, UserDto user) {
        installateur.setNom(user.getUsername());
        installateur.setEmail(user.getEmail());
        installateur.setFirstName(user.getFirstName());
        installateur.setLastName(user.getLastName());
        installateur.setPhone(user.getPhone());
        installateur.setDefaultAddress(user.getDefaultAddress());
        installateur.setSpecialite(user.getSpecialty() != null 
            ? translateSpecialty(user.getSpecialty()) 
            : "Non spécifiée");
    }

    private String translateSpecialty(String specialty) {
        switch (specialty) {
            case "PLUMBER_OUTDOOR": return "Technicien en plomberie extérieure";
            case "ELECTRICIAN_LANDSCAPE": return "Électricien paysager";
            case "LANDSCAPER_POOL_DECORATOR": return "Paysagiste décorateur de bassins";
            case "WALL_POOL_INSTALLER": return "Installateur de bassins muraux";
            case "AQUARIUM_TECHNICIAN": return "Technicien en aquariophilie";
            case "MASON_POOL_STRUCTURES": return "Maçon spécialisé en structures de bassins";
            default: return specialty;
        }
    }

    public void cleanUpObsoleteInstallers() {
        List<UserDto> activeUsers = userServiceClient.getInstallateursCommmande();
        cleanUpObsoleteInstallers(activeUsers);
    }

    public void cleanUpObsoleteInstallers(List<UserDto> activeUsers) {
        List<Long> activeUserIds = activeUsers.stream()
            .map(UserDto::getUser_id)
            .toList();
        
        List<Installateur> allInstallers = installateurRepository.findAll();
        
        allInstallers.forEach(installer -> {
            if (!activeUserIds.contains(installer.getUserId())) {
                logger.warn("Suppression de l'installateur obsolète: {}", installer.getId());
                installateurRepository.delete(installer);
            }
        });
    }
}