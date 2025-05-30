package com.example.gestionbassins.repos;

import com.example.gestionbassins.entities.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Date;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

	// Find transactions by basin ID ordered by date (descending)
	List<Transaction> findByBassin_IdBassinOrderByDateTransactionDesc(Long bassinId);

	// Find transactions by basin ID with date range
	@Query("SELECT t FROM Transaction t WHERE t.bassin.idBassin = :bassinId "
			+ "AND (:startDate IS NULL OR t.dateTransaction >= :startDate) "
			+ "AND (:endDate IS NULL OR t.dateTransaction <= :endDate) " + "ORDER BY t.dateTransaction DESC")
	List<Transaction> findByBassin_IdBassinAndDateRange(@Param("bassinId") Long bassinId,
			@Param("startDate") Date startDate, @Param("endDate") Date endDate);

	// Find recent transactions limited by count
	@Query("SELECT t FROM Transaction t ORDER BY t.dateTransaction DESC")
	List<Transaction> findTopByOrderByDateTransactionDesc(int limit);

	List<Transaction> findByBassin_IdBassinAndDateTransactionBetweenOrderByDateTransactionDesc(Long bassinId,
			Date startDate, Date endDate);

	List<Transaction> findByDateTransactionBetweenOrderByDateTransactionDesc(Date startDate, Date endDate);

	List<Transaction> findByDateTransactionAfterOrderByDateTransactionDesc(Date startDate);

	List<Transaction> findByDateTransactionBeforeOrderByDateTransactionDesc(Date endDate);

	List<Transaction> findAllByOrderByDateTransactionDesc();

	List<Transaction> findByBassin_IdBassinAndDateTransactionAfterOrderByDateTransactionDesc(Long bassinId,
			Date startDate);

	List<Transaction> findByBassin_IdBassinAndDateTransactionBeforeOrderByDateTransactionDesc(Long bassinId,
			Date endDate);
}