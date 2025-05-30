package com.example.orders_microservice.service;

import java.util.List;
import java.util.Map;
/*
public class InstallationSyncService {
	
	private void syncWithInstallations(Long commandeId, String statut) {
	    try {
	        List<Map<String, Object>> affectations = installationClient.getAffectationsByCommande(commandeId);
	        if (!affectations.isEmpty()) {
	            String installationStatus = convertToInstallationStatus(statut);
	            affectations.forEach(affectation -> {
	                Long affectationId = Long.parseLong(affectation.get("id").toString());
	                installationClient.updateAffectationStatus(affectationId, installationStatus);
	            });
	        }
	    } catch (Exception e) {
	        logger.error("Failed to sync status with installations service", e);
	    }
	}
}*/
