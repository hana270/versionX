package com.example.orders_microservice.restcontrollers;

import com.example.orders_microservice.dto.CommandeDTO;
import com.example.orders_microservice.dto.CreationCommandeRequest;
import com.example.orders_microservice.dto.ErrorResponse;
import com.example.orders_microservice.entities.Commande;
import com.example.orders_microservice.entities.StatutCommande;
import com.example.orders_microservice.exceptions.CommandeException;
import com.example.orders_microservice.repos.CommandeRepository;
import com.example.orders_microservice.service.CommandeMapper;
import com.example.orders_microservice.service.CommandeService;
import com.example.orders_microservice.service.NotificationServiceClient;
import com.example.orders_microservice.security.CustomUserDetails;
import com.fasterxml.jackson.databind.JsonMappingException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/panier/commandes")
public class CommandeController {
	private final CommandeService commandeService;
	private final NotificationServiceClient notificationService;
	private final CommandeMapper commandeMapper;
	private final CommandeRepository commandeRepository;
	private static final Logger logger = LoggerFactory.getLogger(CommandeController.class);

	@Autowired
	public CommandeController(CommandeService commandeService, CommandeMapper commandeMapper,
			CommandeRepository commandeRepository, NotificationServiceClient notificationService) {
		this.commandeService = commandeService;
		this.commandeMapper = commandeMapper;
		this.commandeRepository = commandeRepository;
		this.notificationService = notificationService;
	}

	@GetMapping("/health")
	public ResponseEntity<String> healthCheck() {
		return ResponseEntity.ok("Service is up and running");
	}

	@PostMapping
    public ResponseEntity<?> creerCommande(@Valid @RequestBody CreationCommandeRequest request) {
        try {
            // Validation supplémentaire
            if (request.getItems() == null || request.getItems().isEmpty()) {
                throw new CommandeException("La commande doit contenir au moins un article");
            }

            CommandeDTO commande = commandeService.creerCommande(request);
            return ResponseEntity.ok(commande);
        } catch (CommandeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "VALIDATION_ERROR",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "SERVER_ERROR",
                "message", "Erreur lors de la création de la commande"
            ));
        }
    }

	private Map<String, String> getFieldErrors(Exception e) {
		Map<String, String> fieldErrors = new HashMap<>();
		if (e instanceof ConstraintViolationException cve) {
			for (var violation : cve.getConstraintViolations()) {
				String fieldPath = violation.getPropertyPath().toString();
				String message = violation.getMessage();
				fieldErrors.put(fieldPath, message);
			}
		} else if (e instanceof HttpMessageNotReadableException hmre) {
			if (hmre.getCause() instanceof JsonMappingException jme) {
				String fieldPath = jme.getPath().stream()
						.map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "[" + ref.getIndex() + "]")
						.filter(str -> !str.isEmpty()).collect(Collectors.joining("."));
				String message = jme.getOriginalMessage() != null ? jme.getOriginalMessage() : "Invalid value";
				if (!fieldPath.isEmpty()) {
					fieldErrors.put(fieldPath, message);
				} else {
					fieldErrors.put("unknown", "Invalid JSON format: " + message);
				}
			} else {
				fieldErrors.put("unknown", "Failed to parse request: " + e.getMessage());
			}
		} else {
			fieldErrors.put("general", e.getMessage() != null ? e.getMessage() : "An error occurred");
		}
		return fieldErrors;
	}

	@GetMapping("/{numeroCommande}")
	public ResponseEntity<?> getCommande(@PathVariable String numeroCommande) {
		try {
			logger.info("Tentative de récupération de la commande: {}", numeroCommande);
			CommandeDTO commande = commandeService.getCommandeByNumero(numeroCommande);
			if (commande == null) {
				logger.warn("Commande non trouvée: {}", numeroCommande);
				return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Commande non trouvée",
						"message", "Aucune commande avec le numéro " + numeroCommande));
			}
			logger.info("Commande trouvée: {}", commande);
			return ResponseEntity.ok(commande);
		} catch (Exception e) {
			logger.error("Erreur serveur lors de la récupération de la commande", e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", "Erreur serveur", "message", e.getMessage()));
		}
	}

	@GetMapping("/client/{clientId}")
	public ResponseEntity<?> getCommandesClient(@PathVariable Long clientId) {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		Long authenticatedClientId = null;

		if (auth.getDetails() instanceof Long) {
			authenticatedClientId = (Long) auth.getDetails();
		} else if (auth.getPrincipal() instanceof CustomUserDetails) {
			CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
			authenticatedClientId = userDetails.getUserId();
		}

		if (authenticatedClientId == null || !clientId.equals(authenticatedClientId)) {
			logger.warn("ClientId mismatch or not authenticated: requested={}, authenticated={}", clientId,
					authenticatedClientId);
			return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Unauthorized", "message",
					"Vous n'êtes pas autorisé à accéder aux commandes de ce client"));
		}

		try {
			List<CommandeDTO> commandes = commandeService.getCommandesByClient(clientId);
			return ResponseEntity.ok(commandes);
		} catch (Exception e) {
			logger.error("Erreur lors de la récupération des commandes pour le client {}: {}", clientId,
					e.getMessage());
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Server error",
					"message", "Erreur technique lors de la récupération des commandes: " + e.getMessage()));
		}
	}

	@GetMapping("/{commandeId}/can-access")
	public ResponseEntity<?> checkCommandeAccess(@PathVariable String commandeId) {
		try {
			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			Long authenticatedClientId = null;

			if (auth.getDetails() instanceof Long) {
				authenticatedClientId = (Long) auth.getDetails();
				logger.debug("Retrieved clientId from auth details: {}", authenticatedClientId);
			} else if (auth.getPrincipal() instanceof CustomUserDetails) {
				CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
				authenticatedClientId = userDetails.getUserId();
				logger.debug("Retrieved clientId from CustomUserDetails: {}", authenticatedClientId);
			}

			if (authenticatedClientId == null) {
				logger.error("No authenticated user found");
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
						.body(new ErrorResponse("UNAUTHORIZED", "Utilisateur non authentifié"));
			}

			Map<String, Object> response = commandeService.checkCommandeAccess(commandeId, authenticatedClientId);
			return ResponseEntity.ok(response);
		} catch (CommandeException e) {
			logger.error("Erreur vérification accès commande {}: {}", commandeId, e.getMessage());
			return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse("UNAUTHORIZED", e.getMessage()));
		} catch (Exception e) {
			logger.error("Erreur serveur vérification accès commande {}", commandeId, e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(new ErrorResponse("ACCESS_CHECK_ERROR", e.getMessage()));
		}
	}

	@DeleteMapping("/{numeroCommande}/annuler")
	public ResponseEntity<?> annulerCommande(@PathVariable String numeroCommande) {
		try {
			logger.info("Attempting to cancel commande: {}", numeroCommande);

			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			Long authenticatedClientId = null;

			if (auth.getDetails() instanceof Long) {
				authenticatedClientId = (Long) auth.getDetails();
				logger.debug("Retrieved clientId from auth details: {}", authenticatedClientId);
			} else if (auth.getPrincipal() instanceof CustomUserDetails) {
				CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
				authenticatedClientId = userDetails.getUserId();
				logger.debug("Retrieved clientId from CustomUserDetails: {}", authenticatedClientId);
			}

			if (authenticatedClientId == null) {
				logger.error("No authenticated user found");
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
						.body(new ErrorResponse("UNAUTHORIZED", "Utilisateur non authentifié"));
			}

			commandeService.annulerCommande(numeroCommande, authenticatedClientId);
			logger.info("Commande {} annulée avec succès", numeroCommande);
			return ResponseEntity.ok(Map.of("success", true, "message", "Commande annulée avec succès"));
		} catch (CommandeException e) {
			logger.error("Erreur lors de l'annulation de la commande {}: {}", numeroCommande, e.getMessage());
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponse("INVALID_REQUEST", e.getMessage()));
		} catch (Exception e) {
			logger.error("Erreur serveur lors de l'annulation de la commande {}: {}", numeroCommande, e.getMessage(),
					e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(new ErrorResponse("SERVER_ERROR", "Erreur serveur: " + e.getMessage()));
		}
	}

	@GetMapping("/by-id/{id}")
	public ResponseEntity<?> getCommandeById(@PathVariable Long id) {
		try {
			CommandeDTO commande = commandeService.getCommandeById(id);
			return ResponseEntity.ok(commande);
		} catch (CommandeException e) {
			logger.error("Commande non trouvée avec l'ID: {}", id, e);
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", "Order not found", "message", e.getMessage()));
		} catch (Exception e) {
			logger.error("Erreur serveur lors de la récupération de la commande avec l'ID: {}", id, e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Server error",
					"message", "Erreur technique lors de la récupération de la commande: " + e.getMessage()));
		}
	}

	@GetMapping("/client/{clientId}/by-status")
	public ResponseEntity<?> getCommandesClientByStatus(@PathVariable Long clientId,
			@RequestParam(name = "statuses", required = false) List<String> statuses) {

		logger.info("Fetching orders for client {} with statuses: {}", clientId, statuses);

		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		Long authenticatedClientId = null;

		if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
			authenticatedClientId = ((CustomUserDetails) auth.getPrincipal()).getUserId();
		}

		if (authenticatedClientId == null || !clientId.equals(authenticatedClientId)) {
			logger.warn("Unauthorized access attempt. AuthenticatedId: {}, RequestedId: {}", authenticatedClientId,
					clientId);
			return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Unauthorized", "message",
					"Vous n'êtes pas autorisé à accéder aux commandes de ce client"));
		}

		try {
			if (statuses != null && !statuses.isEmpty()) {
				List<StatutCommande> statutsEnum = statuses.stream().map(status -> {
					try {
						return StatutCommande.valueOf(status);
					} catch (IllegalArgumentException e) {
						logger.warn("Invalid status value: {}", status);
						return null;
					}
				}).filter(Objects::nonNull).collect(Collectors.toList());

				if (statutsEnum.isEmpty()) {
					logger.warn("No valid statuses provided");
					return ResponseEntity.badRequest()
							.body(Map.of("error", "Invalid request", "message", "Aucun statut valide fourni"));
				}

				List<CommandeDTO> commandes = commandeService.getCommandesByClientAndStatus(clientId, statutsEnum);
				return ResponseEntity.ok(commandes);
			} else {
				// If no statuses provided, fetch all orders except EN_ATTENTE
				List<CommandeDTO> commandes = commandeService.getCommandesByClient(clientId);
				return ResponseEntity.ok(commandes);
			}
		} catch (Exception e) {
			logger.error("Error fetching orders by status for client {}: {}", clientId, e.getMessage());
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Server error",
					"message", "Erreur technique lors de la récupération des commandes: " + e.getMessage()));
		}
	}

	@GetMapping("/admin/all")
	public ResponseEntity<?> getAllCommandesWithDetails() {
		try {
			logger.info("Requête de récupération de toutes les commandes pour l'admin");

			Authentication auth = SecurityContextHolder.getContext().getAuthentication();
			if (auth == null || auth.getAuthorities() == null
					|| auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ADMIN"))) {
				logger.warn("Tentative d'accès non autorisé");
				return ResponseEntity.status(HttpStatus.FORBIDDEN)
						.body(Map.of("error", "Accès refusé", "message", "Droits insuffisants"));
			}

			List<CommandeDTO> commandes = commandeService.getAllCommandesWithDetails();
			logger.info("Récupération réussie de {} commandes", commandes.size());

			return ResponseEntity.ok(commandes);
		} catch (Exception e) {
			logger.error("Erreur lors de la récupération des commandes pour l'admin: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", "Erreur serveur", "message",
							"Erreur lors de la récupération des commandes: " + e.getMessage(), "stackTrace",
							e.getStackTrace().toString()));
		}
	}
	
	/*************************POUR COMMUNIQUER AVEC INSTALLATEUR*****************************/
	/*@GetMapping
	public ResponseEntity<List<Commande>> getAllCommandes() {
		return ResponseEntity.ok(commandeService.findAll());
	}*/

/*	@GetMapping("/commande/{id}")
	public ResponseEntity<CommandeDTO> getCommandeByIdInst(@PathVariable Long id) {
		Commande commande = commandeService.findById(id);
		return ResponseEntity.ok(commandeMapper.toDto(commande));
	}*/

	/*@GetMapping("/pour-affectation")
	public ResponseEntity<List<Commande>> getCommandesPourAffectation() {
		return ResponseEntity.ok(commandeService.findPourAffectation());
	}*/

	/*@PostMapping("/commande/{id}/statut")
	public ResponseEntity<Void> updateStatutCommande(@PathVariable Long id, @RequestParam String statut) {
		try {
			StatutCommande newStatut = StatutCommande.valueOf(statut);
			commandeService.updateStatut(id, newStatut);
			return ResponseEntity.ok().build();
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().build();
		} catch (EntityNotFoundException e) {
			return ResponseEntity.notFound().build();
		}
	}*/

	/*@GetMapping("/pour-installation")
	public ResponseEntity<List<CommandeDTO>> getCommandesPourInstallation() {
		return ResponseEntity.ok(commandeService.findByStatut(StatutCommande.EN_PREPARATION).stream()
				.map(commandeMapper::toDto).toList());
	}*/

	/*@GetMapping("/en-installation")
	public ResponseEntity<List<CommandeDTO>> getCommandesEnInstallation() {
		return ResponseEntity.ok(commandeService.findByStatut(StatutCommande.EN_PREPARATION).stream()
				.map(commandeMapper::toDto).toList());
	}*/
	
	@GetMapping
    public ResponseEntity<?> getAllCommandes() {
        try {
            List<CommandeDTO> commandes = commandeService.findAll().stream()
                .map(commandeMapper::toDto)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(commandes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(
                new ErrorResponse(
                    "Failed to retrieve orders", 
                    "Error while fetching orders: " + e.getMessage()
                )
            );
        }
    }
    
	@GetMapping("/commande/{id}")
	public ResponseEntity<?> getCommandeByIdInst(@PathVariable Long id) {
	    try {
	        Commande commande = commandeService.findByIdWithRelations(id); // Utilisez la nouvelle méthode du service
	        return ResponseEntity.ok(commandeMapper.toDto(commande));
	    } catch (EntityNotFoundException e) {
	        return ResponseEntity.notFound().build();
	    } catch (Exception e) {
	        return ResponseEntity.internalServerError().body(
	            new ErrorResponse(
	                "Failed to retrieve order", 
	                "Error fetching order with id " + id + ": " + e.getMessage()
	            )
	        );
	    }
	}
    
    @GetMapping("/pour-affectation")
    public ResponseEntity<List<Commande>> getCommandesPourAffectation() {
        return ResponseEntity.ok(commandeService.findPourAffectation());
    }
    
    @PostMapping("/commande/{id}/statut")
    @Transactional // Add this annotation
    public ResponseEntity<?> updateStatutCommande(
            @PathVariable Long id, 
            @RequestParam String statut) {
        try {
            // Convert to uppercase and handle both enum names and display names
            String normalizedStatut = statut.toUpperCase().replace(" ", "_");
            StatutCommande newStatut = StatutCommande.valueOf(normalizedStatut);
            
            commandeService.updateStatut(id, newStatut);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                new ErrorResponse(
                    "Statut invalide",
                    "Le statut '" + statut + "' n'est pas valide. Statuts valides: " + 
                    Arrays.toString(StatutCommande.values())
                )
            );
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/pour-installation")
    public ResponseEntity<List<CommandeDTO>> getCommandesPourInstallation() {
        return ResponseEntity.ok(
        		//PRETE_POUR_INSTALLATION
            commandeService.findByStatut(StatutCommande.EN_PREPARATION)
                .stream()
                .map(commandeMapper::toDto)
                .toList()
        );
    }

    @GetMapping("/en-installation")
    public ResponseEntity<List<CommandeDTO>> getCommandesEnInstallation() {
        return ResponseEntity.ok(
        		//EN_INSTALLATION
            commandeService.findByStatut(StatutCommande.AFFECTER)
                .stream()
                .map(commandeMapper::toDto)
                .toList()
        );
    }
    
    

}