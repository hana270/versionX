package com.example.installations_microservice.repos;

import com.example.installations_microservice.entities.Disponibilite;
import com.example.installations_microservice.entities.Installateur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InstallateurRepository extends JpaRepository<Installateur, Long> {
	Optional<Installateur> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
    List<Installateur> findByDisponibiliteAndZoneIntervention(Disponibilite disponibilite, String zone);
    List<Installateur> findBySpecialite(String specialite);
    
    Installateur findInstByUserId(Long userId);


    //trouver installateur par id et non pas userID
    Optional<Installateur> findById(Long id);
}