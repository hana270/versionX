package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.BassinDTO;
import com.example.orders_microservice.dto.TransactionDTO;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class BassinServiceClientFallback implements BassinServiceClient {

    @Override
    public BassinDTO getBassinDetails(Long id) {
        BassinDTO fallbackBassin = new BassinDTO();
        fallbackBassin.setIdBassin(id);
        fallbackBassin.setNomBassin("Service Temporarily Unavailable");
        fallbackBassin.setDescription("Fallback response - bassins service is down");
        return fallbackBassin;
    }

    @Override
    public void updateStock(TransactionDTO transactionDTO) {
        System.err.println("Failed to update stock for bassin: " + transactionDTO.getBassinId());
        throw new RuntimeException("Failed to update stock for bassin: " + transactionDTO.getBassinId() + " - Service unavailable");
    }

    @Override
    public List<BassinDTO> getBassinsDetails(List<Long> ids) {
        return ids.stream().map(id -> {
            BassinDTO fallbackBassin = new BassinDTO();
            fallbackBassin.setIdBassin(id);
            fallbackBassin.setNomBassin("Service Temporarily Unavailable");
            fallbackBassin.setDescription("Fallback response - bassins service is down");
            return fallbackBassin;
        }).collect(Collectors.toList());
    }

    @Override
    public void createTransaction(TransactionDTO transactionDTO) {
        System.err.println("Failed to create transaction for bassin: " + transactionDTO.getBassinId());
        throw new RuntimeException("Failed to create transaction for bassin: " + transactionDTO.getBassinId() + " - Service unavailable");
    }

	@Override
	public void processOrderTransactions(List<TransactionDTO> transactions) {
		 System.err.println("Failed ");
	        throw new RuntimeException("Failed ");
	   
		
	}
}