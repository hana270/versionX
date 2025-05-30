package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.CommandeDTO;
import com.example.orders_microservice.dto.CreationCommandeRequest;
import com.example.orders_microservice.entities.Commande;
import com.example.orders_microservice.entities.StatutCommande;
import java.util.*;

public interface CommandeService {
    CommandeDTO creerCommande(CreationCommandeRequest request);
    //Commande findById(Long id);
   //List<Commande> findAll();
    //List<Commande> findPourAffectation();
  //List<Commande> findByStatut(StatutCommande statut);
    CommandeDTO getCommandeByNumero(String numeroCommande);
    CommandeDTO getCommandeById(Long id);
    List<CommandeDTO> getCommandesByClient(Long clientId);
    //void updateStatut(Long id, StatutCommande statut);
    void updateCommandeAfterPayment(String numeroCommande);
    Map<String, Object> checkCommandeAccess(String numeroCommande, Long authenticatedClientId);
    void annulerCommande(String numeroCommande, Long authenticatedClientId);
    List<CommandeDTO> getCommandesByClientAndStatus(Long clientId, List<StatutCommande> statuts);
    
    // Nouvelle méthode pour récupérer toutes les commandes avec détails pour l'admin
    List<CommandeDTO> getAllCommandesWithDetails();
    
    /*******Installateur communication*********/
    public List<Commande> findAll();
    	
    	public Commande findById(Long id);
    	Commande findByIdWithRelations(Long id);
    	
    	public List<Commande> findPourAffectation();
        public List<Commande> findByStatut(StatutCommande statut);
       // List<Commande> findPourAffectation();

    	public void updateStatut(Long commandeId, StatutCommande statut);
       // public CommandeDTO updateStatut(Long id, String statut);

}