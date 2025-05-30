package com.example.orders_microservice.repos;

import com.example.orders_microservice.entities.Paiement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PaiementRepository extends JpaRepository<Paiement, Long> {
    @Query("SELECT p FROM Paiement p WHERE p.id = :id")
    Optional<Paiement> findByTransactionId(@Param("id") String id);
}