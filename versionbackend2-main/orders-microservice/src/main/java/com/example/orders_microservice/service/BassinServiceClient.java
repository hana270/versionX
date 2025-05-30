package com.example.orders_microservice.service;

import com.example.orders_microservice.config.FeignClientConfig;
import com.example.orders_microservice.config.FeignConfig;
import com.example.orders_microservice.dto.BassinDTO;
import com.example.orders_microservice.dto.TransactionDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
    name = "aquatresor",
    url = "http://localhost:8087",
    configuration = FeignConfig.class
)
//@FeignClient(name = "AQUATRESOR-SERVICE")
public interface BassinServiceClient {

	@GetMapping("/api/aquatresor/api/getbyid/{id}")
	BassinDTO getBassinDetails(@PathVariable Long id);

	@PostMapping("/api/aquatresor/api/update-stock")
	void updateStock(@RequestBody TransactionDTO transactionDTO);

	@PostMapping("/api/aquatresor/api/bassins/by-ids")
	List<BassinDTO> getBassinsDetails(@RequestBody List<Long> ids);

	@PostMapping("/api/aquatresor/api/transactions")
	void createTransaction(@RequestBody TransactionDTO transactionDTO);

	@PostMapping("/api/aquatresor/api/transactions/process-order")
	void processOrderTransactions(@RequestBody List<TransactionDTO> transactions);

}