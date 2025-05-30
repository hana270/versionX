package com.example.orders_microservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CodeVerificationRequestDTO {
    @NotBlank(message = "L'ID de la transaction est requis")
    private String transactionId;

    @NotBlank(message = "Le code de vérification est requis")
    private String verificationCode;
}