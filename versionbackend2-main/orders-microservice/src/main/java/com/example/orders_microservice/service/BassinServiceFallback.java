package com.example.orders_microservice.service;

import java.util.Collections;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import com.example.orders_microservice.dto.BassinDTO;
import com.example.orders_microservice.dto.TransactionDTO;

/*@Component
class BassinServiceFallback implements BassinServiceClient {
    
    @Override
    public ResponseEntity<BassinDTO> getBassinDetails(Long id) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    @Override
    public ResponseEntity<Void> updateStock(TransactionDTO transactionDTO) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    @Override
    public ResponseEntity<List<BassinDTO>> getBassinsDetails(List<Long> ids) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Collections.emptyList());
    }

    @Override
    public ResponseEntity<Void> createTransaction(TransactionDTO transactionDTO) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }
}*/