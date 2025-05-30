package com.example.gestionbassins.service;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.example.gestionbassins.entities.User;
import com.example.gestionbassins.dto.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;


@FeignClient(name = "USERS-MICROSERVICE")

public interface UserServiceClient {
    
    /**
     * Récupère un utilisateur par son nom d'utilisateur
     * @param username le nom d'utilisateur
     * @return UserDTO contenant les informations de l'utilisateur
     */
    @GetMapping("/api/users/username/{username}")
    UserDTO getUserByUsername(@PathVariable String username);
    
    /**
     * Récupère un utilisateur par son ID
     * @param userId l'ID de l'utilisateur
     * @return UserDTO contenant les informations de l'utilisateur
     */
    @GetMapping("/api/users/{userId}")
    UserDTO getUserById(@PathVariable Long userId);
}