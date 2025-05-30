package com.example.orders_microservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class LigneCommandeDTO {
    private Long id;
    private Long produitId;
    private String typeProduit;
    private String nomProduit;
    private String description;
    private String imageUrl;
    private Integer quantite;
    private Double prixUnitaire;
    private Double prixTotal;
    private String materiauSelectionne;
    private Double prixMateriau;
    private String dimensionSelectionnee;
    private Double prixDimension;
    private String couleurSelectionnee;
    private String statutProduit;
    private String delaiFabrication;
    private List<AccessoireCommandeDTO> accessoires;
}