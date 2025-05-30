package com.example.installations_microservice.RestController;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.installations_microservice.dto.CommandeResponse;
import com.example.installations_microservice.services.CommandeSyncService;

@RestController
@RequestMapping("/test")
@CrossOrigin
public class TestController {

    @Autowired
    private CommandeSyncService commandeSyncService;

    @GetMapping("/force-sync-commande/{commandeId}")
    public ResponseEntity<?> testForceSync(@PathVariable Long commandeId) {
        try {
            CommandeResponse commande = commandeSyncService.forceSyncCommande(commandeId);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "commande", commande,
                "message", "Synchronisation forcée réussie"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "status", "error",
                "message", "Échec de sync: " + e.getMessage(),  // Remplacement du : par ,
                "timestamp", LocalDateTime.now()
            ));
        }
    }
    
    
}