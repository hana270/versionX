package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.BassinPersonnaliseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "AQUATRESOR-SERVICE")
public interface BassinPersonnaliseClient {
    
    @GetMapping("/api/aquatresor/api/bassinpersonnalise/detailBassinPersonnalise/{idBassin}")
    BassinPersonnaliseDTO getDetailBassinPersonnalise(@PathVariable Long idBassin);
    
    @GetMapping("/api/aquatresor/api/bassinpersonnalise/getBassinPersonnaliseByBassin/{idBassin}")
    BassinPersonnaliseDTO getBassinPersonnaliseByBassinId(@PathVariable("idBassin") Long idBassin);
    
    @GetMapping("/api/aquatresor/api/bassinpersonnalise/by-bassin/{bassinId}")
    BassinPersonnaliseDTO getByBassinId(@PathVariable("bassinId") Long bassinId);
}