package com.example.orders_microservice.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class PaymentRequestDTO {
    @NotBlank(message = "L'ID de la commande est requis")
    private String commandeId; // numeroCommande

    @NotBlank(message = "L'email est requis")
    @Email(message = "L'email doit être valide")
    private String email;

    @NotBlank(message = "Le numéro de carte est requis")
    @Pattern(regexp = "\\d{16}", message = "Le numéro de carte doit contenir 16 chiffres")
    private String cardNumber;

    @NotBlank(message = "Le nom du titulaire est requis")
    private String cardholderName;

    @NotBlank(message = "Le mois d'expiration est requis")
    @Pattern(regexp = "\\d{2}", message = "Le mois d'expiration doit contenir 2 chiffres")
    private String expiryMonth;

    @NotBlank(message = "L'année d'expiration est requise")
    @Pattern(regexp = "\\d{2}", message = "L'année d'expiration doit contenir 2 chiffres")
    private String expiryYear;

    @NotBlank(message = "Le CVV est requis")
    @Pattern(regexp = "\\d{3}", message = "Le CVV doit contenir 3 chiffres")
    private String cvv;
}