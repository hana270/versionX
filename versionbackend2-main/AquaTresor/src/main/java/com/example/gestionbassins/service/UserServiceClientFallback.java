package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.UserDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Classe de fallback pour gérer les erreurs de communication avec le microservice utilisateurs
 */
@Component
public class UserServiceClientFallback implements UserServiceClient {
    
    private static final Logger logger = LoggerFactory.getLogger(UserServiceClientFallback.class);
    
    @Override
    public UserDTO getUserByUsername(String username) {
        logger.error("Erreur de communication avec le microservice utilisateurs pour le username: {}", username);
        throw new RuntimeException("Service utilisateurs indisponible. Impossible de récupérer l'utilisateur: " + username);
    }
    
    @Override
    public UserDTO getUserById(Long userId) {
        logger.error("Erreur de communication avec le microservice utilisateurs pour l'ID: {}", userId);
        throw new RuntimeException("Service utilisateurs indisponible. Impossible de récupérer l'utilisateur avec l'ID: " + userId);
    }
}