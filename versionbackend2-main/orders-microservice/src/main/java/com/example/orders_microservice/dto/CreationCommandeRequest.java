package com.example.orders_microservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class CreationCommandeRequest {
    @NotNull(message = "L'identifiant du client est requis")
    private Long clientId;

    private Long panierId;

    @NotBlank(message = "L'adresse de livraison est requise")
    private String adresseLivraison;

    @NotBlank(message = "Le code postal est requis")
    @Pattern(regexp = "\\d{4}", message = "Le code postal doit contenir 4 chiffres")
    private String codePostal;

    @NotBlank(message = "La ville est requise")
    private String ville;

    @NotBlank(message = "La région est requise")
    private String region;

    private String modeLivraison;

    private String commentaires;

    @NotBlank(message = "Le nom du client est requis")
    private String clientNom;

    @NotBlank(message = "Le prénom du client est requis")
    private String clientPrenom;

    @NotBlank(message = "L'email du client est requis")
    @Email(message = "L'email doit être valide")
    private String clientEmail;

    @NotBlank(message = "Le téléphone du client est requis")
    @Pattern(regexp = "\\d{8}", message = "Le téléphone doit contenir 8 chiffres")
    private String clientTelephone;

    @Valid
    @Size(min = 1, message = "Au moins un article est requis")
    private List<PanierItemDTO> items;

    public boolean isValid() {
        return (panierId != null && panierId > 0) || (items != null && !items.isEmpty());
    }
    
   
}