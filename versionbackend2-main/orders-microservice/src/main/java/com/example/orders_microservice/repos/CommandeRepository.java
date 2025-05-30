package com.example.orders_microservice.repos;

import com.example.orders_microservice.entities.Commande;
import com.example.orders_microservice.entities.LigneComnd;
import com.example.orders_microservice.entities.Panier;
import com.example.orders_microservice.entities.StatutCommande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CommandeRepository extends JpaRepository<Commande, Long> {
    List<Commande> findByClientId(Long clientId);

    @Query("SELECT c FROM Commande c WHERE c.emailClient = :email ORDER BY c.dateCreation DESC")
    List<Commande> findByEmailClient(@Param("email") String email);

    @Query("SELECT c FROM Commande c WHERE c.statut = 'EN_ATTENTE' AND c.dateCreation < :dateLimite")
    List<Commande> findCommandesEnAttenteExpirees(@Param("dateLimite") LocalDateTime dateLimite);

    @Query("SELECT c FROM Commande c LEFT JOIN FETCH c.lignesCommande LEFT JOIN FETCH c.detailsFabrication WHERE c.id = :id")
    Optional<Commande> findByIdWithLignesCommande(@Param("id") Long id);

    List<Commande> findByStatut(StatutCommande statut);

    @Query("SELECT c FROM Commande c WHERE c.statut IN ('EN_PREPARATION')")
    List<Commande> findPourAffectation();

    List<Commande> findByStatutIn(List<StatutCommande> statuts);

    @Query("SELECT c FROM Commande c LEFT JOIN FETCH c.lignesCommande l LEFT JOIN FETCH l.accessoires WHERE c.id = :id")
    Optional<Commande> findByIdWithRelations(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Commande c SET c.statut = :statut WHERE c.id = :id")
    void updateStatutOnly(@Param("id") Long id, @Param("statut") StatutCommande statut);

    @Query("SELECT c FROM Commande c WHERE c.clientId = :clientId AND c.statut != 'EN_ATTENTE'")
    List<Commande> findByClientIdAndNotEnAttente(@Param("clientId") Long clientId);

    @Query("SELECT COUNT(c) > 0 FROM Commande c WHERE c.clientId = :clientId")
    boolean existsByClientId(@Param("clientId") Long clientId);

    @Query("SELECT COUNT(c) > 0 FROM Commande c WHERE c.emailClient = :email")
    boolean existsByEmailClient(@Param("email") String email);

    @Query("SELECT COUNT(c) > 0 FROM Commande c WHERE c.clientId = :clientId")
    boolean existsClientById(@Param("clientId") Long clientId);

    @Query("SELECT p FROM Panier p LEFT JOIN FETCH p.items WHERE p.userId = :userId")
    Optional<Panier> findByUserIdWithItems(@Param("userId") Long userId);

    @Query("SELECT c FROM Commande c WHERE c.clientId = :clientId AND c.statut = :statut")
    List<Commande> findByClientIdAndStatut(@Param("clientId") Long clientId, @Param("statut") StatutCommande statut);

    @Query("SELECT c FROM Commande c WHERE c.clientId = :clientId AND c.statut IN :statuts")
    List<Commande> findByClientIdAndStatutIn(@Param("clientId") Long clientId, @Param("statuts") List<StatutCommande> statuts);

  
    @Query("SELECT c FROM Commande c JOIN c.paiement p WHERE p.id = :paiementId")
    Optional<Commande> findByPaiementId(@Param("paiementId") Long paiementId);





    @Query("SELECT c FROM Commande c WHERE c.numeroCommande = :numeroCommande")
    Optional<Commande> findByNumeroCommande(@Param("numeroCommande") String numeroCommande);
    
    // Requête optimisée pour récupérer les lignes de commande avec accessoires
    @Query("SELECT l FROM LigneComnd l LEFT JOIN FETCH l.accessoires WHERE l.commande.id = :commandeId")
    List<LigneComnd> findLignesCommandeWithAccessoiresByCommandeId(@Param("commandeId") Long commandeId);
    




    @Query("SELECT c FROM Commande c LEFT JOIN FETCH c.lignesCommande")
    List<Commande> findAllWithLignesCommande();}