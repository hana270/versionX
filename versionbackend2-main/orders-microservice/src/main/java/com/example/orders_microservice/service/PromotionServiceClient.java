package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.PromotionDTO;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

//@FeignClient(name = "AQUATRESOR-SERVICE")

@FeignClient(name = "aquatresor-microservice", url = "http://localhost:8087")
public interface PromotionServiceClient {
    @GetMapping("/api/aquatresor/api/promotions/active-for-bassin/{bassinId}")
    PromotionDTO getActivePromotionForBassin(@PathVariable Long bassinId);
    
    @GetMapping("/api/aquatresor/api/promotions/{id}")
    PromotionDTO getPromotionById(@PathVariable Long id);
    
    default PromotionDTO getPromotionDetails(Long id) {
        return getPromotionById(id);
    }
}