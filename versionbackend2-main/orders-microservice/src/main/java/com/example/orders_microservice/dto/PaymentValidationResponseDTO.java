package com.example.orders_microservice.dto;

import lombok.Data;

@Data
public class PaymentValidationResponseDTO {
    private boolean success;
    private String message;
    private String commandeId;
    private String referencePaiement;
}