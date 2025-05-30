package com.example.orders_microservice.dto;

import lombok.Data;

@Data
public class PaymentResponseDTO {
    private boolean success;
    private String transactionId;
    private String commandeId;
    private String message;
}