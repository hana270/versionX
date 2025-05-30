package com.example.installations_microservice.clients.dtos;

import lombok.Data;

@Data
public class UserDto {
    private Long user_id;
   // private String nom;
   // private String prenom;
    private String email;
    private String username;
    private String specialty;
    
    
    private String firstName;
    private String lastName;
    private String phone;
    private String defaultAddress;
    /*à ajouter  
     * private Boolean enabled; 
     * private String firstName;
       private String lastName;
       private String phone;
       private String defaultAddress; // Adresse principale simple
       private InstallerSpecialty specialty
     */
    }