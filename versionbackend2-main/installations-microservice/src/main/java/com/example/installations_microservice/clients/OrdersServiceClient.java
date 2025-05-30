package com.example.installations_microservice.clients;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.installations_microservice.dto.CommandeResponse;
import com.example.orders_microservice.config.FeignClientConfig;
import com.example.orders_microservice.config.FeignConfig;
import com.example.orders_microservice.dto.CommandeDTO;

@FeignClient(
	    name = "ORDERS-MICROSERVICE"//,
	    	//	url = "http://localhost:8087"//,
	    //configuration = FeignConfig.class  // Même config que pour users-microservice
	)
public interface OrdersServiceClient {
    @GetMapping("/api/panier/commandes/commande/{id}")
    CommandeResponse getCommandeById(@PathVariable Long id);
	    
    @PostMapping("/api/panier/commandes/commande/{id}/statut")
    void updateStatutCommande(@PathVariable Long id, @RequestParam("statut") String statut);
    
    
}