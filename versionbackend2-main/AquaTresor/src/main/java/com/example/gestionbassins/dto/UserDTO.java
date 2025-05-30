package com.example.gestionbassins.dto;

import lombok.Data;
import java.util.List;
import java.util.Set;

@Data
public class UserDTO {
    private Long userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String defaultAddress;
    private Boolean enabled;
    private String profileImage;
    private String resetToken;
    private String validationCode;
    private String jwtToken;
    private Set<String> roles;
    
    // Constructeurs
    public UserDTO() {}
    
    public UserDTO(Long userId, String username, String email) {
        this.userId = userId;
        this.username = username;
        this.email = email;
    }
    
    // Méthode utilitaire pour vérifier si l'utilisateur a un rôle spécifique
    public boolean hasRole(String roleName) {
        return roles != null && roles.contains(roleName);
    }
    
    // Méthode utilitaire pour vérifier si l'utilisateur est un client
    public boolean isClient() {
        return hasRole("CLIENT");
    }
    
    // Méthode utilitaire pour vérifier si l'utilisateur est un admin
    public boolean isAdmin() {
        return hasRole("ADMIN");
    }
}