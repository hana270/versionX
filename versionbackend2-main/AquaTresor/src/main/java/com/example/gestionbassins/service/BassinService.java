package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.BassinDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.entities.Transaction;

import java.util.Date;
import java.util.List;

public interface BassinService {

    // Existing methods (unchanged)
    Bassin saveBassin(Bassin b);
    boolean existsByNomBassin(String nomBassin);
    Bassin updateBassin(Bassin b);
    void deleteBassin(Bassin b);
    void deleteBassinById(Long id);
    Bassin getBassin(Long id);
    List<Bassin> getAllBassins();
    List<Bassin> findByNomBassin(String nom);
    List<Bassin> findByNomBassinContains(String nom);
    List<Bassin> findByCategorie(Categorie c);
    List<Bassin> findByCategorieIdCategorie(Long id);
    List<Bassin> findByOrderByNomBassinAsc();
    List<Bassin> trierBassinsNomsPrix();
    BassinDTO toBassinDTO(Bassin bassin);
   Bassin updateBassin(Long id, Bassin bassin);
    Bassin desarchiverBassin(Long id, int nouvelleQuantite);
    Bassin archiverBassin(Long id);
    Bassin mettreSurCommande(Long id);
    Bassin mettreSurCommande(Long id, Integer dureeFabricationJours);
    Bassin updateDureeFabrication(Long id, Integer duree);
    Bassin updateDureeFabrication(Long id, Integer dureeMin, Integer dureeMax);
    List<Bassin> getBassinsNonArchives();
    List<Bassin> getBassinsArchives();
 
    // Added methods to fix errors
    /**
     * Met à jour la quantité d'un bassin et crée une transaction associée
     * 
     * @param bassinId l'identifiant du bassin
     * @param quantite la quantité à ajouter (positif) ou retirer (négatif)
     * @param raison la raison de la mise à jour
     * @throws IllegalArgumentException si la quantité rend le stock négatif
     */
    public Bassin mettreAJourQuantite(Long bassinId, int quantite, String raison);
    
    
    /**
     * Génère un rapport de stock complet
     * 
     * @param categorieId l'ID de la catégorie (null pour toutes)
     * @param showArchived inclure les bassins archivés
     * @param startDate date de début pour les transactions (optionnel)
     * @param endDate date de fin pour les transactions (optionnel)
     * @return le rapport PDF sous forme de tableau d'octets
     */
    byte[] generateStockReport(Long categorieId, boolean showArchived, Date startDate, Date endDate);

    
    byte[] generateGlobalStockReport(Date startDate, Date endDate);
    byte[] generateTransactionReport(Long bassinId, Date startDate, Date endDate);



    
    /**
     * Vérifie le stock des bassins et envoie des notifications pour ceux ayant un stock faible
     */
    void notifierStockFaible();
    
    /**
     * Récupère toutes les transactions avec les informations utilisateur
     * 
     * @return la liste des transactions
     */
    List<Transaction> getTransactions();
    
    /**
     * Ajuste le stock d'un bassin par une quantité donnée (version simple)
     * 
     * @param bassinId l'identifiant du bassin
     * @param quantityDelta la quantité à ajouter (positif) ou à soustraire (négatif)
     */
    void adjustStock(Long bassinId, int quantityDelta);
    
    /**
     * Ajuste le stock d'un bassin avec création d'une transaction détaillée
     * 
     * @param bassinId l'identifiant du bassin
     * @param quantityDelta la quantité à ajouter (positif) ou à soustraire (négatif)
     * @param raison la raison du mouvement de stock
     * @param typeOperation le type d'opération (ENTRÉE, SORTIE, etc.)
     * @param username le nom d'utilisateur effectuant l'opération
     * @return le bassin mis à jour
     */
    Bassin adjustStock(Long bassinId, int quantityDelta, String raison, String typeOperation, String username);
    
    /**
     * Récupère les transactions associées à un bassin
     * 
     * @param bassinId l'identifiant du bassin
     * @return la liste des transactions du bassin
     */
    List<Transaction> getBassinTransactions(Long bassinId);
    
    /**
     * Récupère les transactions d'un bassin dans une plage de dates
     * 
     * @param bassinId l'identifiant du bassin
     * @param startDate la date de début (optionnelle, peut être null)
     * @param endDate la date de fin (optionnelle, peut être null)
     * @return la liste des transactions filtrées
     */
    List<Transaction> getBassinTransactionsWithDateRange(Long bassinId, Date startDate, Date endDate);
    
    /**
     * Génère un rapport de stock pour une catégorie spécifique
     * 
     * @param categorieId l'identifiant de la catégorie (null pour toutes les catégories)
     * @param showArchived inclure les bassins archivés
     * @return le rapport au format PDF
     */
    byte[] generateStockReport(Long categorieId, boolean showArchived);
    
  
    /**
     * Génère un rapport détaillé pour un bassin spécifique
     * 
     * @param bassinId l'identifiant du bassin
     * @param startDate la date de début (optionnelle, peut être null)
     * @param endDate la date de fin (optionnelle, peut être null)
     * @return le rapport au format PDF
     */
    byte[] generateBassinStockReport(Long bassinId, Date startDate, Date endDate);
    
    /**
     * Récupère un bassin par son identifiant
     * 
     * @param bassinId l'identifiant du bassin
     * @return le bassin correspondant
     * @throws IllegalArgumentException si le bassin n'existe pas
     */
    Bassin getBassinById(Long bassinId);
    String getCurrentUsername();
}