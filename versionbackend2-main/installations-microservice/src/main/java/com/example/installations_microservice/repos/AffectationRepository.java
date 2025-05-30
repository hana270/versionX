package com.example.installations_microservice.repos;

import com.example.installations_microservice.entities.Affectation;
import com.example.installations_microservice.entities.AffectationInstallateur;
import com.example.installations_microservice.entities.Installateur;
import com.example.installations_microservice.entities.StatutAffectation;

import feign.Param;
import jakarta.persistence.LockModeType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AffectationRepository extends JpaRepository<Affectation, Long> {

	List<Affectation> findByInstallateursContaining(Installateur installateur);

	/*@Query("SELECT a FROM Affectation a JOIN a.installateurs i "
			+ "WHERE i.id = :installateurId AND a.dateInstallation = :date "
			+ "AND a.statut NOT IN ('ANNULEE', 'TERMINEE') " + "ORDER BY a.heureDebut")
	List<Affectation> findActiveByInstallateurAndDate(@Param("installateurId") Long installateurId,
			@Param("date") LocalDate date);*/
	@Query("SELECT ai FROM AffectationInstallateur ai " +
	           "JOIN ai.affectation a " +
	           "WHERE ai.installateur.id = :installateurId " +
	           "AND ai.dateInstallation = :date " +
	           "AND a.statut = 'PLANIFIEE'")
	    List<AffectationInstallateur> findActiveByInstallateurAndDate(
	        @Param("installateurId") Long installateurId, 
	        @Param("date") LocalDate date);

/*	@Query("SELECT a FROM Affectation a WHERE a.statut = :statut AND " + "(a.dateInstallation < :today OR "
			+ "(a.dateInstallation = :today AND a.heureFin < :now))")
	List<Affectation> findByStatutAndDateInstallationBeforeOrDateInstallationAndHeureFinBefore(
			@Param("statut") StatutAffectation statut, @Param("today") LocalDate today, @Param("now") LocalTime now);
*/
	@Query("SELECT DISTINCT a FROM Affectation a JOIN FETCH a.installateurs i WHERE i.installateur.id = :installateurId")
	List<Affectation> findByInstallateurIdWithInstallateurs(@Param("installateurId") Long installateurId);
	
	@Query("SELECT ai FROM AffectationInstallateur ai " +
		       "JOIN ai.affectation a " +
		       "WHERE a.statut = :statut " +
		       "AND (ai.dateInstallation < :today OR " +
		       "(ai.dateInstallation = :today AND ai.heureFin < :now))")
		List<AffectationInstallateur> findExpiredAffectationInstallateurs(
		    @Param("statut") StatutAffectation statut,
		    @Param("today") LocalDate today,
		    @Param("now") LocalTime now);
	
	List<Affectation> findByCommandeId(Long commandeId);
	
	@EntityGraph(attributePaths = {"installateurs", "installateurs.installateur"})
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT a FROM Affectation a LEFT JOIN FETCH a.installateurs ai LEFT JOIN FETCH ai.installateur WHERE a.id = :id")
	Optional<Affectation> findByIdWithInstallateursForUpdate(@Param("id") Long id);
	
	// In AffectationRepository.java
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT a FROM Affectation a WHERE a.id = :id")
	void lockAffectation(@Param("id") Long id);

	@Modifying
	@Query("UPDATE Affectation a SET a.statut = :statut WHERE a.id = :id")
	void updateStatut(@Param("id") Long id, @Param("statut") StatutAffectation statut);
	
	@EntityGraph(attributePaths = {"installateurs", "installateurs.installateur"})
	@Query("SELECT a FROM Affectation a LEFT JOIN FETCH a.installateurs ai LEFT JOIN FETCH ai.installateur WHERE a.id = :id")
	Optional<Affectation> findByIdWithInstallateurs(@Param("id") Long id);
}