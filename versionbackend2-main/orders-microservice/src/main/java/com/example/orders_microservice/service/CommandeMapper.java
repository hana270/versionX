package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.CommandeDTO;
import com.example.orders_microservice.dto.LigneCommandeDTO;
import com.example.orders_microservice.entities.Commande;
import com.example.orders_microservice.entities.LigneComnd;
import org.springframework.stereotype.Service;
import java.util.stream.Collectors;

@Service
public class CommandeMapper {
	public CommandeDTO toDto(Commande commande) {
		CommandeDTO dto = new CommandeDTO();

		// Mapping des champs de base
		dto.setId(commande.getId());
		dto.setNumeroCommande(commande.getNumeroCommande());
		dto.setClientId(commande.getClientId());
		dto.setEmailClient(commande.getEmailClient());

		// Mapping des enums
		dto.setStatut(commande.getStatut() != null ? commande.getStatut().toString() : null);
		// dto.setModeLivraison(commande.getModeLivraison() != null ?
		// commande.getModeLivraison().toString() : null);
		dto.setModePaiement(commande.getModePaiement() != null ? commande.getModePaiement().toString() : null);

		// Information client
		dto.setClientNom(commande.getClientNom());
		dto.setClientPrenom(commande.getClientPrenom());
		dto.setClientEmail(commande.getClientEmail());
		dto.setClientTelephone(commande.getClientTelephone());

		// Adresse
		dto.setAdresseLivraison(commande.getAdresseLivraison());
		dto.setCodePostal(commande.getCodePostal());
		dto.setVille(commande.getVille());
		dto.setPays(commande.getRegion());

		// Information financière
		dto.setMontantTotal(commande.getMontantTotal());
		dto.setMontantReduction(commande.getMontantReduction());
		dto.setMontantTVA(commande.getMontantTVA());
		dto.setMontantTotalTTC(commande.getMontantTotalTTC());

		// Dates
		dto.setDateCreation(commande.getDateCreation());
		dto.setDateModification(commande.getDateModification());
		dto.setDatePaiement(commande.getDatePaiement());

		// Lignes de commande
		if (commande.getLignesCommande() != null) {
			dto.setLignesCommande(
					commande.getLignesCommande().stream().map(this::mapLigneComndToDto).collect(Collectors.toList()));
		}
		// Champs supplémentaires
		dto.setCommentaires(commande.getCommentaires());
		return dto;
	}

	private LigneCommandeDTO mapLigneComndToDto(LigneComnd ligne) {
		LigneCommandeDTO dto = new LigneCommandeDTO();
		dto.setId(ligne.getId());
		dto.setProduitId(ligne.getProduitId());
		dto.setTypeProduit(ligne.getTypeProduit());
		dto.setNomProduit(ligne.getNomProduit());
		dto.setDescription(ligne.getDescription());
		dto.setImageUrl(ligne.getImageUrl());
		dto.setQuantite(ligne.getQuantite());
		dto.setPrixUnitaire(ligne.getPrixUnitaire());
		dto.setPrixTotal(ligne.getPrixTotal());
		dto.setMateriauSelectionne(ligne.getMateriauSelectionne());
		dto.setPrixMateriau(ligne.getPrixMateriau());
		dto.setDimensionSelectionnee(ligne.getDimensionSelectionnee());
		dto.setPrixDimension(ligne.getPrixDimension());
		dto.setCouleurSelectionnee(ligne.getCouleurSelectionnee());
		dto.setStatutProduit(ligne.getStatutProduit());
		dto.setDelaiFabrication(ligne.getDelaiFabrication());

		return dto;
	}
}