package com.example.orders_microservice.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
public class PanierItemRequest {
    @NotNull(message = "bassinId is required for standard items")
    private Long bassinId;

    @NotNull(message = "quantity is required")
    @Min(value = 1, message = "quantity must be at least 1")
    private Integer quantity;

    private Boolean isCustomized = false;

    @Size(max = 255, message = "nomBassin must not exceed 255 characters")
    private String nomBassin;

    @Size(max = 1000, message = "imageUrl must not exceed 1000 characters")
    private String imageUrl;

    @Size(max = 50, message = "status must not exceed 50 characters")
    private String status;

    @Size(max = 500, message = "materiauSelectionne must not exceed 500 characters")
    private String materiauSelectionne;

    @Min(value = 0, message = "prixMateriau cannot be negative")
    private Double prixMateriau;

    @Size(max = 100, message = "dimensionSelectionnee must not exceed 100 characters")
    private String dimensionSelectionnee;

    @Min(value = 0, message = "prixDimension cannot be negative")
    private Double prixDimension;

    @Size(max = 100, message = "couleurSelectionnee must not exceed 100 characters")
    private String couleurSelectionnee;

    @Min(value = 0, message = "prixAccessoires cannot be negative")
    private Double prixAccessoires;

    @Min(value = 0, message = "prixEstime cannot be negative")
    private Double prixEstime;

    @Size(max = 255, message = "dureeFabrication must not exceed 255 characters")
    private String dureeFabrication;

    private List<Long> accessoireIds;

    @NotNull(message = "prixOriginal is required")
    @Min(value = 0, message = "prixOriginal cannot be negative")
    private Double prixOriginal;

    private Long promotionId;

    @Size(max = 255, message = "nomPromotion must not exceed 255 characters")
    private String nomPromotion;

    @Min(value = 0, message = "tauxReduction cannot be negative")
    @Max(value = 100, message = "tauxReduction cannot exceed 100")
    private Double tauxReduction;

    private Boolean promotionActive;
    private Double prixPromo;
    private String description;

	private String customizationId;
}