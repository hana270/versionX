package com.example.installations_microservice.services;

import com.example.installations_microservice.clients.UserServiceClient;
import com.example.installations_microservice.clients.dtos.UserDto;
import com.example.installations_microservice.entities.Disponibilite;
import com.example.installations_microservice.entities.Installateur;
import com.example.installations_microservice.repos.InstallateurRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;

import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class InstallateurService {
    
    private static final Logger logger = LoggerFactory.getLogger(InstallateurService.class);

    @Autowired
    private InstallateurRepository installateurRepository;
    
    @Autowired
    private UserServiceClient userServiceClient;
    
    @Transactional
    public List<Installateur> findAll() {
        List<Installateur> installateurs = installateurRepository.findAll();
        // Initialize collections
        installateurs.forEach(i -> Hibernate.initialize(i.getAffectations()));
        return installateurs;
    }

    public List<Installateur> findDisponibles(String date, String zone) {
        return installateurRepository.findByDisponibiliteAndZoneIntervention(
            Disponibilite.DISPONIBLE, zone);
    }

    public Installateur save(Installateur installateur) {
        return installateurRepository.save(installateur);
    }

    public Installateur update(Long id, Installateur installateur) {
        installateur.setId(id);
        return installateurRepository.save(installateur);
    }

    public List<Installateur> getAllInstallateurs() {
        syncInstallateursFromUserService();
        return installateurRepository.findAll();
    }

    private void syncInstallateursFromUserService() {
        try {
            List<UserDto> users = userServiceClient.getInstallateursCommmande();
            users.forEach(user -> {
                if (!installateurRepository.existsByUserId(user.getUser_id())) {
                    Installateur newInst = createNewInstallerFromUser(user);
                    installateurRepository.save(newInst);
                }
            });
        } catch (Exception e) {
            System.err.println("Erreur lors de la synchronisation: " + e.getMessage());
        }
    }

    @GetMapping("/debug/users")
    public List<UserDto> getUsersFromUserService() {
        return userServiceClient.getInstallateursCommmande();
    }

    @GetMapping("/debug/local")
    public List<Installateur> getLocalInstallateurs() {
        return installateurRepository.findAll();
    }

    public Installateur createInstallateur(UserDto user) {
        Installateur inst = createNewInstallerFromUser(user);
        return installateurRepository.save(inst);
    }
    
    public Installateur findByUserId(Long userId) {
        return installateurRepository.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Installateur non trouvé avec user ID: " + userId));
    }
    
    public void syncInstallateurs() {
        List<UserDto> users = userServiceClient.getInstallateursCommmande();
        users.forEach(user -> {
            Optional<Installateur> existing = installateurRepository.findByUserId(user.getUser_id());
            
            if (existing.isPresent()) {
                Installateur installateur = existing.get();
                updateInstallerFromUser(installateur, user);
                installateurRepository.save(installateur);
            } else {
                Installateur newInst = createNewInstallerFromUser(user);
                installateurRepository.save(newInst);
            }
        });
    }
    
    public List<Installateur> findBySpecialite(String specialite) {
        return installateurRepository.findBySpecialite(specialite);
    }
    
    public boolean existsByUserId(Long userId) {
        return installateurRepository.existsByUserId(userId);
    }
    
    @Transactional
    public List<Installateur> getInstallateursBySpecialtyFromUserService(String specialty) {
        List<UserDto> users = userServiceClient.getInstallateursBySpecialty(specialty);
        return users.stream()
            .map(user -> {
                Installateur installateur = installateurRepository.findByUserId(user.getUser_id())
                    .orElseGet(() -> {
                        Installateur newInst = new Installateur();
                        newInst.setDisponibilite(Disponibilite.DISPONIBLE);
                        newInst.setZoneIntervention("Toutes");
                        return newInst;
                    });
                
                // Update fields
                installateur.setUserId(user.getUser_id());
                installateur.setNom(user.getUsername());
                // ... other field updates
                
                Installateur saved = installateurRepository.save(installateur);
                
                // Initialize collections before leaving transactional context
                Hibernate.initialize(saved.getAffectations());
                
                return saved;
            })
            .collect(Collectors.toList());
    }
    
    public Long getUserIdByInstallateurId(Long installateurId) {
        return installateurRepository.findById(installateurId)
            .map(Installateur::getUserId)
            .orElse(null);
    }
    
    private Installateur createNewInstallerFromUser(UserDto user) {
        Installateur newInst = new Installateur();
        updateInstallerFromUser(newInst, user);
        newInst.setDisponibilite(Disponibilite.DISPONIBLE);
        newInst.setZoneIntervention("Toutes");
        return newInst;
    }
    
    private void updateInstallerFromUser(Installateur installateur, UserDto user) {
        installateur.setUserId(user.getUser_id());
        installateur.setNom(user.getUsername());
        installateur.setEmail(user.getEmail());
        installateur.setFirstName(user.getFirstName());
        installateur.setLastName(user.getLastName());
        installateur.setPhone(user.getPhone());
        installateur.setSpecialite(convertSpecialty(user.getSpecialty()));
        installateur.setDefaultAddress(user.getDefaultAddress());
        
        // Compatibilité avec anciens champs
       // installateur.setPrenom(user.getFirstName() != null ? user.getFirstName() : "Non spécifié");
        //installateur.setTelephone(user.getPhone() != null ? user.getPhone() : "Non spécifié");
    }
    
    private String convertSpecialty(String specialty) {
        if (specialty == null) return "Non spécifié";
        
        switch(specialty) {
            case "PLUMBER_OUTDOOR": return "Technicien en plomberie extérieure";
            case "ELECTRICIAN_LANDSCAPE": return "Électricien paysager – Éclairage extérieur";
            case "LANDSCAPER_POOL_DECORATOR": return "Paysagiste décorateur de bassins";
            case "WALL_POOL_INSTALLER": return "Installateur de bassins muraux";
            case "AQUARIUM_TECHNICIAN": return "Technicien en aquariophilie et bassins vivants";
            case "MASON_POOL_STRUCTURES": return "Maçon spécialisé en structures de bassins";
            case "ELECTRICITE": return "Électricité";
            case "PLOMBERIE": return "Plomberie";
            case "CLIMATISATION": return "Climatisation";
            case "CHAUFFAGE": return "Chauffage";
            case "AUTRE": return "Autre";
            default: return specialty;
        }
    }
    
    @Transactional
    public void migrateExistingInstallateurs() {
        List<Installateur> allInstallateurs = installateurRepository.findAll();
        List<UserDto> allUsers = userServiceClient.getInstallateursCommmande();
        
        allInstallateurs.forEach(installateur -> {
            allUsers.stream()
                .filter(u -> u.getUser_id().equals(installateur.getUserId()))
                .findFirst()
                .ifPresent(user -> {
                    installateur.setFirstName(user.getFirstName());
                    installateur.setLastName(user.getLastName());
                    installateur.setPhone(user.getPhone());
                    // Mise à jour des champs de compatibilité si nécessaire
                  //  installateur.setPrenom(user.getFirstName());
                    //installateur.setTelephone(user.getPhone());
                    installateurRepository.save(installateur);
                });
        });
        
        logger.info("Migration terminée pour {} installateurs", allInstallateurs.size());
    }
    
    //update spécialité installateur
    @Transactional
    public Installateur updateSpecialty(Long userId, String newSpecialty) {
        // 1. Met à jour dans le microservice User (source de vérité)
        userServiceClient.updateUserSpecialty(userId, newSpecialty);
        
        // 2. Met à jour localement
        Installateur installateur = installateurRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Installateur non trouvé"));
        
        installateur.setSpecialite(convertSpecialty(newSpecialty));
        return installateurRepository.save(installateur);
    }
    
    public Installateur findById(Long id) {
        return installateurRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Installateur non trouvé avec ID: " + id));
    }
    
 // Trouver un installateur par user_id
    public Long getInstallateurIdByUserId(Long userId) {
        Installateur installateur = installateurRepository.findInstByUserId(userId);
        return installateur != null ? installateur.getId() : null;
    }
    
}