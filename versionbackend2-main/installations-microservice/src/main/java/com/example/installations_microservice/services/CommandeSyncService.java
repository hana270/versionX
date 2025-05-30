package com.example.installations_microservice.services;

import com.example.installations_microservice.clients.OrdersServiceClient;
import com.example.installations_microservice.dto.CommandeResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CommandeSyncService {
    
    private static final Logger logger = LoggerFactory.getLogger(CommandeSyncService.class);
    
    private final OrdersServiceClient ordersServiceClient;
    
    @Autowired
    public CommandeSyncService(OrdersServiceClient ordersServiceClient) {
        this.ordersServiceClient = ordersServiceClient;
    }
    
    // Synchronisation forcée
    public CommandeResponse forceSyncCommande(Long commandeId) {
        logger.info("Attempting to sync commande: {}", commandeId);
        
        try {
            CommandeResponse commande = ordersServiceClient.getCommandeById(commandeId);
            logger.debug("Sync success: {}", commande);
            return commande;
        } catch (Exception e) {
            logger.error("Failed to sync commande", e);
            throw new RuntimeException("Failed to sync commande with orders service", e);
        }
    }

    public boolean verifyCommandeExists(Long commandeId) {
        try {
            CommandeResponse response = forceSyncCommande(commandeId);
            return response != null && response.getId() != null;
        } catch (Exception e) {
            logger.error("Failed to verify commande existence", e);
            return false;
        }
    }
}