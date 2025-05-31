package com.example.orders_microservice.service;

import jakarta.persistence.EntityManager;
import com.example.orders_microservice.dto.*;
import com.example.orders_microservice.entities.*;
import com.example.orders_microservice.exceptions.CommandeException;
import com.example.orders_microservice.repos.CommandeRepository;
import com.example.orders_microservice.repos.PaiementRepository;
import com.example.orders_microservice.repos.PanierRepository;
import com.example.orders_microservice.security.*;
import jakarta.persistence.EntityNotFoundException;
//import jakarta.transaction.Transactional;
import org.springframework.transaction.annotation.Transactional;

import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import jakarta.persistence.PersistenceContext;

@Service
public class CommandeServiceImpl implements CommandeService {
	private final CommandeRepository commandeRepository;
	private final PanierRepository panierRepository;
	private final PanierService panierService;
	private final BassinServiceClient bassinClient;
	private final NotificationServiceClient notificationClient;
	private final CommandeMapper commandeMapper;
	private final PaiementRepository paiementRepository;

	private static final Logger logger = LoggerFactory.getLogger(CommandeServiceImpl.class);

	@PersistenceContext
	private EntityManager entityManager; // Add EntityManager injection

	@Autowired
	public CommandeServiceImpl(CommandeRepository commandeRepository, PanierRepository panierRepository,
			PanierService panierService, BassinServiceClient bassinClient, NotificationServiceClient notificationClient,
			PaiementRepository p, CommandeMapper commandeMapper) {
		this.commandeRepository = commandeRepository;
		this.panierRepository = panierRepository;
		this.panierService = panierService;
		this.bassinClient = bassinClient;
		this.notificationClient = notificationClient;
		this.commandeMapper = commandeMapper;
		this.paiementRepository = p;
	}

	private String truncateString(String value, String fieldName) {
		if (value != null && value.length() > 255) {
			logger.warn("Truncating {} to 255 characters: original length={}", fieldName, value.length());
			return value.substring(0, 255);
		}
		return value;
	}


private Panier createPanierFromItems(List<PanierItemDTO> items, String clientId) {
		Panier panier = new Panier();
		try {
			panier.setUserId(Long.parseLong(clientId));
		} catch (NumberFormatException e) {
			throw new CommandeException("Invalid client ID format: " + clientId);
		}
		panier.setUserEmail("");
		List<PanierItem> panierItems = items.stream().map(this::convertDTOToPanierItem).collect(Collectors.toList());
		panier.setItems(panierItems);
		return panier;
	}

	private void validateBassinDetails(List<PanierItem> items) {
		for (PanierItem item : items) {
			if (item.getBassinId() == null) {
				throw new IllegalArgumentException("Bassin ID requis pour l'article: " + item.getNomBassin());
			}
			if (item.getQuantity() == null || item.getQuantity() <= 0) {
				throw new IllegalArgumentException("Quantité invalide pour l'article: " + item.getNomBassin());
			}
			if (item.getPrixUnitaire() == null || item.getPrixUnitaire() <= 0) {
				throw new IllegalArgumentException("Prix unitaire invalide pour l'article: " + item.getNomBassin());
			}
			if (item.getStatus() == null) {
				throw new IllegalArgumentException("Statut requis pour l'article: " + item.getNomBassin());
			}
			if (Boolean.TRUE.equals(item.getIsCustomized())) {
				if (!"SUR_COMMANDE".equals(item.getStatus())) {
					throw new IllegalArgumentException(
							"Customized bassin must have status SUR_COMMANDE: " + item.getNomBassin());
				}
				if (item.getDureeFabrication() == null || item.getDureeFabrication().isEmpty()) {
					item.setDureeFabrication("15 jours");
				}
			}
			// String length validation
			if (item.getNomBassin() != null && item.getNomBassin().length() > 255) {
				item.setNomBassin(truncateString(item.getNomBassin(), "nomBassin"));
			}
			if (item.getDescription() != null && item.getDescription().length() > 255) {
				item.setDescription(truncateString(item.getDescription(), "description"));
			}
			if (item.getImageUrl() != null && item.getImageUrl().length() > 255) {
				item.setImageUrl(truncateString(item.getImageUrl(), "imageUrl"));
			}
		}
	}

	public LigneComnd convertirEnLigneCommande(PanierItem item) {
		LigneComnd ligne = new LigneComnd();
		ligne.setProduitId(item.getBassinId());
		ligne.setTypeProduit(item.getIsCustomized() ? "BASSIN_PERSONNALISE" : "BASSIN_STANDARD");
		ligne.setNomProduit(truncateString(item.getNomBassin(), "nomProduit"));
		ligne.setDescription(truncateString(item.getDescription(), "description"));
		ligne.setImageUrl(truncateString(item.getImageUrl(), "imageUrl"));
		ligne.setQuantite(item.getQuantity());
		ligne.setPrixUnitaire(item.getPrixUnitaire());
		ligne.setPrixTotal(item.getPrixUnitaire() * item.getQuantity());

		if (item.getIsCustomized()) {
			ligne.setMateriauSelectionne(truncateString(item.getMateriauSelectionne(), "materiauSelectionne"));
			ligne.setPrixMateriau(item.getPrixMateriau());
			ligne.setDimensionSelectionnee(truncateString(item.getDimensionSelectionnee(), "dimensionSelectionnee"));
			ligne.setPrixDimension(item.getPrixDimension());
			ligne.setCouleurSelectionnee(truncateString(item.getCouleurSelectionnee(), "couleurSelectionnee"));
			ligne.setStatutProduit("SUR_COMMANDE");
			ligne.setDelaiFabrication(truncateString(item.getDureeFabrication(), "delaiFabrication"));
		} else {
			ligne.setStatutProduit(item.getStatus());
		}

		List<AccessoirCommande> accessoires = item.getAccessoires() != null && !item.getAccessoires().isEmpty()
				? item.getAccessoires().stream().map(this::convertirAccessoire).collect(Collectors.toList())
				: new ArrayList<>();
		ligne.setAccessoires(accessoires);
		return ligne;
	}
	
	
	public AccessoirCommande convertirAccessoire(PanierItemAccessoire accessoire) {
		AccessoirCommande ac = new AccessoirCommande();
		ac.setAccessoireId(accessoire.getAccessoireId());
		ac.setNomAccessoire(truncateString(accessoire.getNomAccessoire(), "nomAccessoire"));
		ac.setPrixAccessoire(accessoire.getPrixAccessoire());
		ac.setImageUrl(truncateString(accessoire.getImageUrl(), "imageUrl"));
		return ac;
	}

	public PanierItem convertDTOToPanierItem(PanierItemDTO dto) {
		PanierItem item = new PanierItem();
		item.setBassinId(dto.getBassinId());
		item.setNomBassin(truncateString(dto.getNomBassin(), "nomBassin"));
		item.setDescription(truncateString(dto.getDescription(), "description"));
		item.setImageUrl(truncateString(dto.getImageUrl(), "imageUrl"));
		item.setQuantity(dto.getQuantity());
		item.setPrixUnitaire(dto.getPrixUnitaire() != null ? dto.getPrixUnitaire() : 0.0);
		item.setIsCustomized(dto.getIsCustomized());
		item.setStatus(dto.getStatus());
		item.setMateriauSelectionne(truncateString(dto.getMateriauSelectionne(), "materiauSelectionne"));
		item.setPrixMateriau(dto.getPrixMateriau());
		item.setDimensionSelectionnee(truncateString(dto.getDimensionSelectionnee(), "dimensionSelectionnee"));
		item.setPrixDimension(dto.getPrixDimension());
		item.setCouleurSelectionnee(truncateString(dto.getCouleurSelectionnee(), "couleurSelectionnee"));
		item.setDureeFabrication(truncateString(dto.getDelaiFabrication(), "delaiFabrication"));
		item.setPrixAccessoires(dto.getPrixAccessoires());

		if (dto.getAccessoires() != null && !dto.getAccessoires().isEmpty()) {
			List<PanierItemAccessoire> accessoires = dto.getAccessoires().stream().map(accDTO -> {
				PanierItemAccessoire acc = new PanierItemAccessoire();
				acc.setAccessoireId(accDTO.getAccessoireId());
				acc.setNomAccessoire(truncateString(accDTO.getNomAccessoire(), "nomAccessoire"));
				acc.setPrixAccessoire(accDTO.getPrixAccessoire());
				acc.setImageUrl(truncateString(accDTO.getImageUrl(), "imageUrl"));
				return acc;
			}).collect(Collectors.toList());
			item.setAccessoires(accessoires);
		}

		return item;
	}

	public void calculerTotauxCommande(Commande commande) {
		double total = commande.getLignesCommande().stream().mapToDouble(LigneComnd::getPrixTotal).sum();
		commande.setMontantTotal(total);
		double tva = total * 0.19;
		commande.setMontantTVA(tva);
		commande.setMontantTotalTTC(total + tva);
	}

	public String genererNumeroCommande() {
		String datePart = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
		String randomPart = UUID.randomUUID().toString().substring(0, 5).toUpperCase();
		return "CMD-" + datePart + "-" + randomPart;
	}

	@Transactional
	public List<CommandeDTO> getCommandesByClient(Long clientId) {
		logger.debug("Fetching all orders for client: {}", clientId);
		List<Commande> commandes = commandeRepository.findByClientIdAndNotEnAttente(clientId);
		return commandes.stream().map(this::convertirEnDTO).collect(Collectors.toList());
	}


	public CommandeDTO convertirEnDTO(Commande commande) {
		logger.debug("Converting Commande to DTO: id={}, numeroCommande={}", commande.getId(),
				commande.getNumeroCommande());

		CommandeDTO dto = new CommandeDTO();
		dto.setId(commande.getId());
		dto.setNumeroCommande(commande.getNumeroCommande());
		dto.setClientId(commande.getClientId());
		dto.setEmailClient(commande.getEmailClient());
		dto.setStatut(commande.getStatut() != null ? commande.getStatut().name() : null);
		dto.setMontantTotal(commande.getMontantTotal());
		dto.setMontantReduction(commande.getMontantReduction());
		dto.setMontantTVA(commande.getMontantTVA());
		dto.setMontantTotalTTC(commande.getMontantTotalTTC());
		dto.setModePaiement(commande.getModePaiement() != null ? commande.getModePaiement().name() : null);
		dto.setReferencePaiement(commande.getReferencePaiement());
		dto.setPaiementConfirme(commande.getPaiementConfirme());
		dto.setDateCreation(commande.getDateCreation());
		dto.setDateModification(commande.getDateModification());
		dto.setDatePaiement(commande.getDatePaiement());
		dto.setAdresseLivraison(commande.getAdresseLivraison());
		dto.setCodePostal(commande.getCodePostal());
		dto.setVille(commande.getVille());
		dto.setPays(commande.getRegion());
		dto.setCommentaires(commande.getCommentaires());
		dto.setClientNom(commande.getClientNom());
		dto.setClientPrenom(commande.getClientPrenom());
		dto.setClientEmail(commande.getClientEmail());
		dto.setClientTelephone(commande.getClientTelephone());

		// Safely map lignesCommande, ensuring no access to LigneComnd.commande
		List<LigneCommandeDTO> lignesDTO = new ArrayList<>();
		if (commande.getLignesCommande() != null) {
			try {
				lignesDTO = commande.getLignesCommande().stream().filter(ligne -> ligne != null)
						.map(this::convertirLigneEnDTO).collect(Collectors.toList());
				logger.debug("Mapped {} lignesCommande for Commande id={}", lignesDTO.size(), commande.getId());
			} catch (Exception e) {
				logger.error("Error mapping lignesCommande for Commande id={}: {}", commande.getId(), e.getMessage(),
						e);
				throw new CommandeException("Erreur lors de la conversion des lignes de commande: " + e.getMessage());
			}
		}
		dto.setLignesCommande(lignesDTO);

		return dto;
	}

	public LigneCommandeDTO convertirLigneEnDTO(LigneComnd ligne) {
		logger.debug("Converting LigneComnd to DTO: id={}, produitId={}", ligne.getId(), ligne.getProduitId());

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

		List<AccessoireCommandeDTO> accessoiresDTO = new ArrayList<>();
		if (ligne.getAccessoires() != null) {
			try {
				accessoiresDTO = ligne.getAccessoires().stream().filter(acc -> acc != null)
						.map(this::convertirAccessoireEnDTO).collect(Collectors.toList());
				logger.debug("Mapped {} accessoires for LigneComnd id={}", accessoiresDTO.size(), ligne.getId());
			} catch (Exception e) {
				logger.error("Error mapping accessoires for LigneComnd id={}: {}", ligne.getId(), e.getMessage(), e);
				throw new CommandeException("Erreur lors de la conversion des accessoires: " + e.getMessage());
			}
		}
		dto.setAccessoires(accessoiresDTO);

		return dto;
	}

	public AccessoireCommandeDTO convertirAccessoireEnDTO(AccessoirCommande accessoire) {
		logger.debug("Converting AccessoirCommande to DTO: id={}, accessoireId={}", accessoire.getId(),
				accessoire.getAccessoireId());

		AccessoireCommandeDTO dto = new AccessoireCommandeDTO();
		dto.setId(accessoire.getId());
		dto.setAccessoireId(accessoire.getAccessoireId());
		dto.setNomAccessoire(accessoire.getNomAccessoire());
		dto.setPrixAccessoire(accessoire.getPrixAccessoire());
		dto.setImageUrl(accessoire.getImageUrl());

		return dto;
	}

	

	public CommandeDTO getCommandeByNumero(String numeroCommande) throws CommandeException {
		try {
			logger.debug("Recherche de la commande par numéro: {}", numeroCommande);
			Commande commande = commandeRepository.findByNumeroCommande(numeroCommande)
					.orElseThrow(() -> new CommandeException("Commande non trouvée"));
			return convertirEnDTO(commande);
		} catch (Exception e) {
			logger.error("Erreur lors de la recherche de commande", e);
			throw new CommandeException("Erreur technique lors de la recherche de commande");
		}
	}
 /*
     * 
     * Tronque une chaîne à la longueur maximale spécifiée pour éviter les erreurs de base de données
     */
    private String truncateString(String input, int maxLength) {
        if (input == null) {
            return null;
        }
        return input.length() <= maxLength ? input : input.substring(0, maxLength);
    }
	
	@Override
	public Map<String, Object> checkCommandeAccess(String numeroCommande, Long authenticatedClientId) {
		logger.info("Checking access for commande: {}", numeroCommande);
		Commande commande = commandeRepository.findByNumeroCommande(numeroCommande)
				.orElseThrow(() -> new CommandeException("Commande non trouvée: " + numeroCommande));

		if (!commande.getClientId().equals(authenticatedClientId)) {
			logger.warn("Unauthorized access attempt for commande {} by client {}", numeroCommande,
					authenticatedClientId);
			throw new CommandeException("Non autorisé");
		}

		Map<String, Object> response = new HashMap<>();
		response.put("canAccess", commande.getStatut() == StatutCommande.EN_ATTENTE);
		response.put("status", commande.getStatut().name());
		logger.info("Access check result for commande {}: canAccess={}, status={}", numeroCommande,
				response.get("canAccess"), response.get("status"));
		return response;
	}

	@Override
	@Transactional
	public void annulerCommande(String numeroCommande, Long authenticatedClientId) {
		logger.info("Attempting to cancel commande: {}", numeroCommande);

		Commande commande = commandeRepository.findByNumeroCommande(numeroCommande).orElseThrow(() -> {
			logger.error("Commande not found: {}", numeroCommande);
			return new CommandeException("Commande non trouvée: " + numeroCommande);
		});

		if (!commande.getClientId().equals(authenticatedClientId)) {
			logger.warn("ClientId mismatch: commande clientId={}, authenticated={}", commande.getClientId(),
					authenticatedClientId);
			throw new CommandeException("Vous n'êtes pas autorisé à annuler cette commande");
		}

		if (commande.getPaiement() != null) {
			paiementRepository.delete(commande.getPaiement());
			logger.info("Paiement {} deleted for commande: {}", commande.getPaiement().getId(), numeroCommande);
		}

		commandeRepository.delete(commande);
		logger.info("Commande {} deleted successfully", numeroCommande);
	}

	public List<CommandeDTO> getCommandesByClientAndStatus(Long clientId, List<StatutCommande> statuts) {
		try {
			if (clientId == null || statuts == null) {
				logger.warn("Null parameters provided: clientId={}, statuts={}", clientId, statuts);
				return new ArrayList<>();
			}

			logger.debug("Recherche des commandes pour client {} avec statuts {}", clientId, statuts);
			List<Commande> commandes = commandeRepository.findByClientIdAndStatutIn(clientId, statuts);
			if (commandes == null) {
				logger.warn("Repository returned null for client {} and statuses {}", clientId, statuts);
				return new ArrayList<>();
			}

			return commandes.stream().map(this::convertirEnDTO).filter(dto -> dto != null).collect(Collectors.toList());
		} catch (Exception e) {
			logger.error("Erreur lors de la récupération des commandes par statut", e);
			return new ArrayList<>();
		}
	}

	@Transactional
	public CommandeDTO getCommandeById(Long commandeId) {
		logger.debug("Recherche de la commande par ID: {}", commandeId);
		Commande commande = commandeRepository.findByIdWithLignesCommande(commandeId)
				.orElseThrow(() -> new CommandeException("Commande non trouvée avec l'ID: " + commandeId));
		return convertirEnDTO(commande);
	}

	/*****/

	/**
	 * Enrichit une commande avec les détails des bassins
	 * 
	 * @param commande   La commande à enrichir
	 * @param bassinsMap La carte des bassins déjà récupérés
	 * @return Le DTO de commande enrichi
	 */
	private CommandeDTO enrichCommandeWithBassinDetails(Commande commande, Map<Long, BassinDTO> bassinsMap) {
	    try {
	        CommandeDTO dto = convertirEnDTO(commande);
	        if (dto == null) {
	            logger.warn("DTO null pour la commande {}", commande.getNumeroCommande());
	            return null;
	        }

	        // Enrichir chaque ligne de commande avec les détails du bassin
	        if (dto.getLignesCommande() != null) {
	            List<LigneCommandeDTO> enrichedLignes = new ArrayList<>();
	            for (LigneCommandeDTO ligne : dto.getLignesCommande()) {
	                if (ligne != null && ligne.getProduitId() != null && bassinsMap.containsKey(ligne.getProduitId())) {
	                    BassinDTO bassin = bassinsMap.get(ligne.getProduitId());

	                    // Compléter les informations manquantes
	                    ligne.setNomProduit(bassin.getNomBassin() != null && !bassin.getNomBassin().isEmpty() 
	                        ? bassin.getNomBassin() : ligne.getNomProduit());
	                    ligne.setDescription(bassin.getDescription() != null && !bassin.getDescription().isEmpty() 
	                        ? bassin.getDescription() : ligne.getDescription());
	                    ligne.setImageUrl(bassin.getImagesBassin() != null && !bassin.getImagesBassin().isEmpty() 
	                        ? bassin.getImagesBassin().get(0).getImagePath() : ligne.getImageUrl());
	                    ligne.setStatutProduit(bassin.getStatus() != null 
	                        ? bassin.getStatus() : ligne.getStatutProduit());
	                    ligne.setDelaiFabrication(bassin.getDureeFabricationDisplay() != null 
	                        ? bassin.getDureeFabricationDisplay() : ligne.getDelaiFabrication());
	                }
	                enrichedLignes.add(ligne);
	            }
	            dto.setLignesCommande(enrichedLignes);
	        }

	        return dto;
	    } catch (Exception e) {
	        logger.error("Erreur lors de l'enrichissement de la commande {}: {}", 
	                     commande.getNumeroCommande(), e.getMessage());
	        return null;
	    }
	}

	/**
	 * Récupère le détail d'un bassin depuis le microservice
	 * 
	 * @param bassinId ID du bassin à récupérer
	 * @return le DTO du bassin, ou null en cas d'erreur
	 */
	public BassinDTO getBassinDetails(Long bassinId) {
		try {
			logger.info("Récupération du bassin ID: {}", bassinId);
			return bassinClient.getBassinDetails(bassinId);
		} catch (Exception e) {
			logger.error("Erreur lors de la récupération du bassin {}: {}", bassinId, e.getMessage());
			return null;
		}
	}

	/**
	 * Récupère toutes les commandes avec leurs détails pour l'admin Inclut les
	 * informations sur les bassins associés à chaque ligne de commande
	 */
	@Transactional
	public List<CommandeDTO> getAllCommandesWithDetails() {
		logger.info("Récupération de toutes les commandes avec leurs détails");

		try {
			// Fetch all orders with their lignesCommande eagerly
			List<Commande> commandes = commandeRepository.findAllWithLignesCommande();
			logger.info("Nombre de commandes trouvées: {}", commandes.size());

			// Collect all bassin IDs to fetch them in batch
			Set<Long> bassinIds = new HashSet<>();
			for (Commande commande : commandes) {
				if (commande.getLignesCommande() != null) {
					for (LigneComnd ligne : commande.getLignesCommande()) {
						if (ligne != null && ligne.getProduitId() != null
								&& ("BASSIN_STANDARD".equals(ligne.getTypeProduit())
										|| "BASSIN_PERSONNALISE".equals(ligne.getTypeProduit()))) {
							bassinIds.add(ligne.getProduitId());
						}
					}
				}
			}

			// Fetch all bassin details in a single request
			Map<Long, BassinDTO> bassinsMap = new HashMap<>();
			if (!bassinIds.isEmpty()) {
				try {
					List<BassinDTO> bassins = bassinClient.getBassinsDetails(new ArrayList<>(bassinIds));
					for (BassinDTO bassin : bassins) {
						if (bassin != null && bassin.getIdBassin() != null) {
							bassinsMap.put(bassin.getIdBassin(), bassin);
						}
					}
					logger.info("Récupéré {} bassins sur {} attendus", bassinsMap.size(), bassinIds.size());
				} catch (Exception e) {
					logger.warn("Erreur lors de la récupération en batch des bassins: {}", e.getMessage());
					// Fallback to individual fetching
					for (Long bassinId : bassinIds) {
						try {
							BassinDTO bassin = bassinClient.getBassinDetails(bassinId);
							if (bassin != null && bassin.getIdBassin() != null) {
								bassinsMap.put(bassinId, bassin);
							}
						} catch (Exception ex) {
							logger.warn("Impossible de récupérer le bassin {}: {}", bassinId, ex.getMessage());
						}
					}
				}
			}

			// Convert orders to DTOs, enriching with bassin data
			List<CommandeDTO> commandeDTOs = new ArrayList<>();
			for (Commande commande : commandes) {
				try {
					CommandeDTO dto = enrichCommandeWithBassinDetails(commande, bassinsMap);
					if (dto != null) {
						commandeDTOs.add(dto);
					}
				} catch (Exception e) {
					logger.error("Erreur lors de la conversion de la commande {}: {}", commande.getNumeroCommande(),
							e.getMessage());
					// Continue with next commande to avoid failing the entire request
				}
			}

			logger.info("Total de {} commandes traitées avec succès", commandeDTOs.size());
			return commandeDTOs;

		} catch (Exception e) {
			logger.error("Erreur critique lors de la récupération des commandes: {}", e.getMessage(), e);
			throw new CommandeException("Erreur lors de la récupération des commandes: " + e.getMessage());
		}
	}
	
	/*************************POUR COMMUNIQUER AVEC INSTALLATEUR*****************************/
	/*public List<Commande> findAll() {
	return commandeRepository.findAll();
}

public Commande findById(Long id) {
	return commandeRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Commande non trouvée"));
}*/

/*@Transactional
public void updateStatut(Long commandeId, StatutCommande statut) {
	Commande commande = commandeRepository.findById(commandeId)
			.orElseThrow(() -> new EntityNotFoundException("Commande non trouvée"));
	commande.setStatut(statut);
	commande.setDateModification(LocalDateTime.now());
	commandeRepository.save(commande);
}*/

/*public List<Commande> findByStatut(StatutCommande statut) {
	return commandeRepository.findByStatut(statut);
}*/

/*public List<Commande> findPourAffectation() {
	return commandeRepository.findByStatutIn(List.of(StatutCommande.EN_PREPARATION));
}*/
	
	@Transactional(readOnly = true)
    public List<Commande> findAll() {
        List<Commande> commandes = commandeRepository.findAll();
        // Initialisation explicite des collections
        commandes.forEach(c -> {
            if(c.getLignesCommande() != null) {
                Hibernate.initialize(c.getLignesCommande());
                c.getLignesCommande().forEach(l -> Hibernate.initialize(l.getAccessoires()));
            }
        });
        return commandes;
    }
    
	@Transactional(readOnly = true)
    public Commande findById(Long id) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Commande non trouvée"));
        initializeLazyCollections(commande);
        return commande;
    }
    
    private void initializeLazyCollections(Commande commande) {
        if (commande.getLignesCommande() != null) {
            Hibernate.initialize(commande.getLignesCommande());
            commande.getLignesCommande().forEach(ligne -> {
                Hibernate.initialize(ligne.getAccessoires());
            });
        }
        if (commande.getDetailsFabrication() != null) {
            Hibernate.initialize(commande.getDetailsFabrication());
        }
    }
    
    private void initializeLazyCollections(List<Commande> commandes) {
        commandes.forEach(this::initializeLazyCollections);
    }
    
    @Transactional(readOnly = true)
    public Commande findByIdWithRelations(Long id) {
        Commande commande = commandeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Commande non trouvée"));
        
        // Force l'initialisation des collections
        if (commande.getLignesCommande() != null) {
            Hibernate.initialize(commande.getLignesCommande());
            commande.getLignesCommande().forEach(ligne -> {
                Hibernate.initialize(ligne.getAccessoires());
            });
        }
        
        if (commande.getDetailsFabrication() != null) {
            Hibernate.initialize(commande.getDetailsFabrication());
        }
        
        return commande;
    }
    
    public void updateStatut(Long commandeId, StatutCommande statut) {
        commandeRepository.updateStatutOnly(commandeId, statut);
       
    }
    
    @Transactional(readOnly = true)
    public List<Commande> findByStatut(StatutCommande statut) {
        return commandeRepository.findByStatut(statut);
    }

    @Transactional(readOnly = true)
    public List<Commande> findPourAffectation() {
        return commandeRepository.findPourAffectation();
    }
    
 /*   @Override
    @Transactional
    public CommandeDTO updateStatut(Long id, String statut) {
        try {
            StatutCommande newStatus = StatutCommande.valueOf(statut.toUpperCase());
            Commande commande = commandeRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Commande non trouvée"));
            
            commande.setStatut(newStatus);
            commande.setDateModification(LocalDateTime.now());
            
            Commande updated = commandeRepository.save(commande);
            return commandeMapper.toDto(updated);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Statut invalide: " + statut);
        }
    }*/
   
    @Transactional
    public CommandeDTO creerCommande(CreationCommandeRequest request) {
        logger.info("Création de commande - client: {}, items: {}", request.getClientId(),
                request.getItems() != null ? request.getItems().size() : 0);

        if (request == null) {
            logger.error("Requête de création de commande vide");
            throw new CommandeException("Requête de création de commande vide");
        }

        if (request.getClientId() == null) {
            logger.error("L'identifiant du client est requis");
            throw new CommandeException("L'identifiant du client est requis");
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
            logger.error("Utilisateur non authentifié");
            throw new CommandeException("Utilisateur non authentifié");
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long authenticatedUserId = userDetails.getUserId();
        if (!request.getClientId().equals(authenticatedUserId)) {
            logger.warn("Tentative de création de commande pour un client non autorisé: clientId={}, authenticatedUserId={}",
                    request.getClientId(), authenticatedUserId);
            throw new CommandeException("Vous n'êtes pas autorisé à créer une commande pour un autre client");
        }

        if (request.getClientEmail() == null || !request.getClientEmail().matches("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$")) {
            logger.error("Email client invalide: {}", request.getClientEmail());
            throw new CommandeException("Email client invalide");
        }

        if (request.getClientTelephone() == null || !request.getClientTelephone().matches("\\d{8}")) {
            logger.error("Numéro de téléphone invalide: {}", request.getClientTelephone());
            throw new CommandeException("Numéro de téléphone invalide");
        }

        if (request.getAdresseLivraison() == null || request.getAdresseLivraison().trim().isEmpty()) {
            logger.error("Adresse de livraison requise");
            throw new CommandeException("Adresse de livraison requise");
        }

        if (request.getCodePostal() == null || !request.getCodePostal().matches("\\d{4}")) {
            logger.error("Code postal invalide: {}", request.getCodePostal());
            throw new CommandeException("Code postal invalide");
        }

        if (request.getVille() == null || request.getVille().trim().isEmpty()) {
            logger.error("Ville requise");
            throw new CommandeException("Ville requise");
        }

        if (request.getRegion() == null || request.getRegion().trim().isEmpty()) {
            logger.error("Région requise");
            throw new CommandeException("Région requise");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            logger.error("La commande doit contenir au moins un article");
            throw new CommandeException("La commande doit contenir au moins un article");
        }

        for (PanierItemDTO item : request.getItems()) {
            if (item.getBassinId() == null || item.getQuantity() == null || item.getQuantity() <= 0 ||
                    item.getPrixUnitaire() == null || item.getPrixUnitaire() <= 0) {
                logger.error("Article invalide: bassinId={}, quantité={}, prixUnitaire={}",
                        item.getBassinId(), item.getQuantity(), item.getPrixUnitaire());
                throw new CommandeException("Article invalide");
            }
            BassinDTO bassin = bassinClient.getBassinDetails(item.getBassinId());
            if (bassin == null || ("DISPONIBLE".equals(item.getStatus()) && bassin.getStock() < item.getQuantity())) {
                logger.error("Bassin non trouvé ou stock insuffisant: bassinId={}", item.getBassinId());
                throw new CommandeException("Bassin non trouvé ou stock insuffisant");
            }
        }

        Panier panier = request.getPanierId() != null && request.getPanierId() > 0
                ? panierRepository.findByIdWithItems(request.getPanierId())
                        .orElseThrow(() -> new CommandeException("Panier non trouvé: " + request.getPanierId()))
                : createPanierFromItems(request.getItems(), request.getClientId().toString());

        if (panier.getItems() == null || panier.getItems().isEmpty()) {
            logger.error("Le panier est vide");
            throw new CommandeException("Le panier est vide");
        }

        validateBassinDetails(panier.getItems());

        Commande commande = new Commande();
        commande.setNumeroCommande(genererNumeroCommande());
        commande.setClientId(request.getClientId());
        commande.setClientNom(truncateString(request.getClientNom(), "clientNom"));
        commande.setClientPrenom(truncateString(request.getClientPrenom(), "clientPrenom"));
        commande.setClientEmail(truncateString(request.getClientEmail(), "clientEmail"));
        commande.setClientTelephone(truncateString(request.getClientTelephone(), "clientTelephone"));
        commande.setEmailClient(truncateString(request.getClientEmail(), "emailClient"));
        commande.setStatut(StatutCommande.EN_ATTENTE);
        commande.setDateCreation(LocalDateTime.now());
        commande.setCommentaires(truncateString(request.getCommentaires(), "commentaires"));

        Set<LigneComnd> lignes = panier.getItems().stream().map(this::convertirEnLigneCommande)
                .collect(Collectors.toSet());
        lignes.forEach(ligne -> ligne.setCommande(commande));
        commande.setLignesCommande(lignes);

        calculerTotauxCommande(commande);

        commande.setAdresseLivraison(truncateString(request.getAdresseLivraison(), "adresseLivraison"));
        commande.setCodePostal(truncateString(request.getCodePostal(), "codePostal"));
        commande.setVille(truncateString(request.getVille(), "ville"));
        commande.setRegion(truncateString(request.getRegion(), "region"));
        commande.setFraisLivraison(20.0);
        commande.setMontantTotalTTC(commande.getMontantTotalTTC() + commande.getFraisLivraison());

        try {
            commandeRepository.save(commande);
            for (LigneComnd ligne : lignes) {
                ligne.setCommande(commande);
                entityManager.persist(ligne);
            }
            Commande savedCommande = commandeRepository.save(commande);
            logger.info("Commande sauvegardée: ID={}, Numero={}", savedCommande.getId(), savedCommande.getNumeroCommande());

            if (request.getPanierId() != null) {
                try {
                    panierService.clearPanierProperly(panier.getId());
                    logger.info("Panier {} vidé", panier.getId());
                } catch (Exception e) {
                    logger.error("Échec de la suppression du panier {}: {}", panier.getId(), e.getMessage());
                }
            }

            // Send client notification
            try {
                notificationClient.envoyerNotificationCreationCommande(savedCommande.getClientId(),
                        savedCommande.getNumeroCommande());
                logger.info("Notification client de création envoyée: {}", savedCommande.getNumeroCommande());
            } catch (Exception e) {
                logger.error("Échec de l'envoi de la notification client: {}", e.getMessage());
            }

            // Send admin notification
            try {
                notificationClient.envoyerNotificationAdminCreationCommande(savedCommande.getNumeroCommande());
                logger.info("Notification admin de création envoyée: {}", savedCommande.getNumeroCommande());
            } catch (Exception e) {
                logger.error("Échec de l'envoi de la notification admin: {}", e.getMessage());
            }

            CommandeDTO dto = convertirEnDTO(savedCommande);
            dto.setId(savedCommande.getId());
            return dto;
        } catch (Exception e) {
            logger.error("Erreur lors de la sauvegarde de la commande", e);
            throw new CommandeException("Erreur lors de la création de la commande: " + e.getMessage());
        }
    }

    @Transactional
    public void updateCommandeAfterPayment(String numeroCommande) {
        logger.info("Mise à jour de la commande après paiement: {}", numeroCommande);

        if (numeroCommande == null || numeroCommande.trim().isEmpty()) {
            logger.error("Numéro de commande vide");
            throw new CommandeException("Numéro de commande requis");
        }

        Commande commande = commandeRepository.findByNumeroCommande(numeroCommande)
                .orElseThrow(() -> new CommandeException("Commande non trouvée: " + numeroCommande));

        if (commande.getStatut() != StatutCommande.EN_ATTENTE) {
            logger.warn("Statut invalide pour paiement: {}", commande.getStatut());
            throw new CommandeException("La commande doit être en attente");
        }

        commande.setPaiementConfirme(true);
        commande.setDatePaiement(LocalDateTime.now());
        commande.setStatut(StatutCommande.EN_PREPARATION);
        commande.setDateModification(LocalDateTime.now());

        List<TransactionDTO> transactions = new ArrayList<>();
        List<TransactionStock> stockTransactions = new ArrayList<>();

        for (LigneComnd ligne : commande.getLignesCommande()) {
            if (ligne != null && "DISPONIBLE".equals(ligne.getStatutProduit())) {
                TransactionDTO transaction = TransactionDTO.builder()
                        .bassinId(ligne.getProduitId())
                        .quantite(-ligne.getQuantite())
                        .raison(truncateString("Vente commande " + commande.getNumeroCommande() + " - Client: " +
                                commande.getClientNom() + " " + commande.getClientPrenom(), "raison"))
                        .typeOperation("VENTE_CLIENT")
                        .utilisateur(commande.getClientId().toString())
                        .referenceExterne(commande.getNumeroCommande())
                        .detailsProduit(truncateString(ligne.getNomProduit() + " - " + ligne.getDescription(), "detailsProduit"))
                        .prixUnitaire(ligne.getPrixUnitaire())
                        .montantTotal(ligne.getPrixTotal())
                        .build();
                transactions.add(transaction);

                TransactionStock stockTransaction = new TransactionStock();
                stockTransaction.setBassinId(ligne.getProduitId());
                stockTransaction.setQuantite(-ligne.getQuantite());
                stockTransaction.setTypeOperation("VENTE_CLIENT");
                stockTransaction.setRaison(transaction.getRaison());
                stockTransaction.setDateTransaction(LocalDateTime.now());
                stockTransaction.setCommande(commande);
                stockTransaction.setReferenceExterne(transaction.getReferenceExterne());
                stockTransaction.setDetailsProduit(transaction.getDetailsProduit());
                stockTransaction.setPrixUnitaire(transaction.getPrixUnitaire());
                stockTransaction.setMontantTotal(transaction.getMontantTotal());
                stockTransactions.add(stockTransaction);
            }
        }

        if (!transactions.isEmpty()) {
            try {
                bassinClient.processOrderTransactions(transactions);
                commande.getTransactionsStock().clear();
                commande.getTransactionsStock().addAll(stockTransactions);
                logger.info("Stock mis à jour pour commande: {}", numeroCommande);
            } catch (Exception e) {
                logger.error("Échec de la mise à jour du stock: {}", e.getMessage());
                commande.setPaiementConfirme(false);
                commande.setStatut(StatutCommande.EN_ATTENTE);
                commandeRepository.save(commande);
                throw new CommandeException("Échec de la mise à jour du stock: " + e.getMessage());
            }
        }

        try {
            Long clientId = commande.getClientId();
            Panier panier = panierRepository.findByUserId(clientId).orElse(null);
            if (panier != null) {
                panierService.clearPanierProperly(panier.getId());
                logger.info("Panier vidé pour client: {}", clientId);
            }
        } catch (Exception e) {
            logger.error("Échec de la suppression du panier: {}", e.getMessage());
        }

        try {
            commandeRepository.save(commande);
            logger.info("Commande mise à jour: {}", numeroCommande);

            // Send client notification
            try {
                notificationClient.envoyerNotificationPaiementConfirme(commande.getClientId(), numeroCommande);
                logger.info("Notification client de paiement envoyée: {}", numeroCommande);
            } catch (Exception e) {
                logger.error("Échec de l'envoi de la notification client: {}", e.getMessage());
            }

            // Send admin notification
            try {
                notificationClient.envoyerNotificationAdminPaiementConfirme(numeroCommande);
                logger.info("Notification admin de paiement envoyée: {}", numeroCommande);
            } catch (Exception e) {
                logger.error("Échec de l'envoi de la notification admin: {}", e.getMessage());
            }
        } catch (Exception e) {
            logger.error("Échec de la sauvegarde de la commande: {}", e.getMessage());
            throw new CommandeException("Échec de la sauvegarde de la commande: " + e.getMessage());
        }
    }
}