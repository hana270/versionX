package projet.spring;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import jakarta.annotation.PostConstruct;
import projet.spring.entities.*;
import projet.spring.repos.RoleRepository;
import projet.spring.service.UserService;
import projet.spring.service.register.RegistrationRequest;
@SpringBootApplication
public class UsersMicroserviceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UsersMicroserviceApplication.class, args);
    }

    @Autowired
    private UserService userService;

    @Autowired
    private RoleRepository roleRep;

    
    @Autowired
    private BCryptPasswordEncoder bCryptPasswordEncoder;
   
    /*
    @PostConstruct
    void init_users() {
        if (userService.findUserByUsername("admin") == null) {
            // Créer les rôles si nécessaire
            Optional<Role> adminRoleOptional = roleRep.findByRole("ADMIN");
            if (adminRoleOptional.isEmpty()) {
                roleRep.save(new Role(null, "ADMIN"));
            }

            Optional<Role> userRoleOptional = roleRep.findByRole("USER");
            if (userRoleOptional.isEmpty()) {
                roleRep.save(new Role(null, "USER"));
            }

            // Créer l'utilisateur "admin"
            RegistrationRequest adminRequest = new RegistrationRequest();
            adminRequest.setUsername("admin");

            // Hacher le mot de passe et l'afficher pour débogage
            String encodedPassword = bCryptPasswordEncoder.encode("admin123");
            System.out.println("Encoded password (init_users): " + encodedPassword); // À supprimer après débogage
            adminRequest.setPassword(encodedPassword);

            adminRequest.setEmail("admin@gmail.com");

            // Enregistrer l'utilisateur
            User adminUser = userService.registerUser(adminRequest);
            adminUser.setEnabled(true);
            userService.saveUser(adminUser);

            userService.addRoleToUser("admin", "ADMIN");
      
            System.out.println("Admin user 'admin' created successfully.");
        } else {
            System.out.println("User 'admin' already exists.");
        }
    }*/
  
    
    /* 
    @PostConstruct
    void resetAdminPassword() {
        User adminUser = userService.findUserByUsername("admin");
        if (adminUser != null) {
            String newEncodedPassword = bCryptPasswordEncoder.encode("123456"); // Remplacez par le mot de passe souhaité
            adminUser.setPassword(newEncodedPassword);
            userService.saveUser(adminUser);
            System.out.println("Admin password reset successfully.");
        } else {
            System.out.println("Admin user not found.");
        }
    }*/
    /***********/
  /*  @PostConstruct
    void init_users() {
        // Créer le rôle INSTALLATEUR s'il n'existe pas
        Optional<Role> installateurRoleOptional = roleRep.findByRole("INSTALLATEUR");
        if (installateurRoleOptional.isEmpty()) {
            roleRep.save(new Role(null, "INSTALLATEUR"));
            System.out.println("Rôle INSTALLATEUR créé avec succès");
        }

        // Vérifier si l'installateur Ali existe déjà
        if (userService.findUserByUsername("kiko") == null) {
            // Créer la requête d'enregistrement
            RegistrationRequest installateurRequest = new RegistrationRequest();
            installateurRequest.setUsername("kiko");
            
            // Hacher le mot de passe
            String encodedPassword = bCryptPasswordEncoder.encode("123456");
            installateurRequest.setPassword(encodedPassword);
            
            installateurRequest.setEmail("kiko.installateur@example.com");
            
            // Enregistrer l'utilisateur
            User installateurUser = userService.registerUser(installateurRequest);
            installateurUser.setEnabled(true);
            userService.saveUser(installateurUser);

            // Ajouter le rôle INSTALLATEUR
            userService.addRoleToUser("kiko", "INSTALLATEUR");
            
            System.out.println("Installateur 'kiko' créé avec succès avec le mot de passe '123456'");
        } else {
            System.out.println("L'installateur 'kiko' existe déjà");
        }
    }

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }*/
    
 /*   @PostConstruct
    void initAdminUser() {
        // Vérifier si l'utilisateur admin existe déjà
        if (userService.findUserByUsername("admin") == null) {
            // Vérifier et créer le rôle ADMIN si nécessaire
            Optional<Role> adminRoleOptional = roleRep.findByRole("ADMIN");
            if (adminRoleOptional.isEmpty()) {
                roleRep.save(new Role("ADMIN"));
                System.out.println("Rôle ADMIN créé avec succès");
            }

            // Créer la requête d'enregistrement
            RegistrationRequest adminRequest = new RegistrationRequest();
            adminRequest.setUsername("admin");
            
            // Hacher le mot de passe
            String encodedPassword = bCryptPasswordEncoder.encode("123456");
            adminRequest.setPassword(encodedPassword);
            
            adminRequest.setEmail("admin@example.com");
            adminRequest.setFirstName("Admin");
            adminRequest.setLastName("System");
            
            // Enregistrer l'utilisateur
            User adminUser = userService.registerUser(adminRequest);
            adminUser.setEnabled(true);
            userService.saveUser(adminUser);

            // Ajouter le rôle ADMIN
            userService.addRoleToUser("admin", "ADMIN");
            
            System.out.println("Utilisateur admin créé avec succès :");
            System.out.println("Nom d'utilisateur: admin");
            System.out.println("Mot de passe: 123456");
        } else {
            System.out.println("L'utilisateur admin existe déjà");
        }
    }*/
 /*   @PostConstruct
    public void initOrUpdateAdminUser() {
        try {
            // 1. Vérifier/Créer le rôle ADMIN
            Role adminRole = roleRep.findByRole("ADMIN")
                    .orElseGet(() -> roleRep.save(new Role("ADMIN")));
            
            // 2. Vérifier si l'utilisateur admin existe
            User adminUser = userService.findUserByUsername("admin");
            String encodedPassword = bCryptPasswordEncoder.encode("123456");
            
            if (adminUser == null) {
                // Créer un nouvel admin
                RegistrationRequest request = new RegistrationRequest();
                request.setUsername("admin");
                request.setPassword(encodedPassword);
                request.setEmail("admin@system.com");
                request.setFirstName("System");
                request.setLastName("Admin");
                
                adminUser = userService.registerUser(request);
                System.out.println("Nouvel utilisateur admin créé");
            } else {
                // Mettre à jour le mot de passe existant
                adminUser.setPassword(encodedPassword);
                System.out.println("Mot de passe admin mis à jour");
            }
            
            // 3. Configurer les propriétés de l'admin
            adminUser.setEnabled(true);
            adminUser.getRoles().clear(); // Nettoyer les rôles existants
            adminUser.getRoles().add(adminRole); // Ajouter uniquement le rôle ADMIN
            
            // 4. Sauvegarder
            userService.saveUser(adminUser);
            
            // Log de confirmation
            System.out.println("-------------------------------");
            System.out.println("Admin configuré avec succès:");
            System.out.println("Username: admin");
            System.out.println("Password: 123456 (hashé)");
            System.out.println("Role: ADMIN");
            System.out.println("-------------------------------");
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'initialisation de l'admin:");
            e.printStackTrace();
        }
    }*/
}