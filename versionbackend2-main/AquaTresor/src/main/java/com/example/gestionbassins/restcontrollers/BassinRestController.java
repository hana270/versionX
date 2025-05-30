package com.example.gestionbassins.restcontrollers;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.text.SimpleDateFormat;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

import org.apache.commons.io.FilenameUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.neo4j.Neo4jProperties.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.gestionbassins.dto.BassinDTO;
import com.example.gestionbassins.dto.TransactionDTO;
import com.example.gestionbassins.dto.UpdateStockRequest;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.ImageBassin;
import com.example.gestionbassins.entities.Transaction;
import com.example.gestionbassins.repos.*;
import com.example.gestionbassins.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.web.bind.annotation.PutMapping;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.scheduling.annotation.Scheduled;
import com.example.gestionbassins.repos.TransactionRepository;
import com.example.gestionbassins.service.NotificationServiceClient;
import com.example.gestionbassins.service.UserServiceClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api")
//@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class BassinRestController {
	private static final Logger logger = LoggerFactory.getLogger(BassinRestController.class);

	private final String uploadDir = "C:/shared/images/";

	@Autowired
	BassinService bassinService;
	@Autowired
	TransactionService transactionService;

	@Autowired
	ImageBassinService imageBassinService;

	@Autowired
	ImageBassinRepository imageBassinRepository;

	@Autowired
	BassinRepository bassinRepository;
	@Autowired
	private TransactionRepository transactionRepository;

	@Autowired
	private NotificationServiceClient notificationServiceClient;
	@Autowired
	private UserServiceClient userServiceClient;

	/******************* Gestion bassin ********************/

	// Get all events
	@RequestMapping(path = "all", method = RequestMethod.GET)
	public List<Bassin> getAllBassins() {
		return bassinService.getAllBassins();
	}

	@RequestMapping(value = "getbyid/{idBassin}", method = RequestMethod.GET)
	public Bassin getBassinById(@PathVariable("idBassin") Long id) {
		return bassinService.getBassin(id);
	}

	@PreAuthorize("hasAuthority('ADMIN')")
	@PostMapping("/addbassin")
	public ResponseEntity<?> createBassin(@RequestBody Bassin bassin) {
		try {
			// Vérifier d'abord si le bassin existe déjà
			if (bassinRepository.existsByNomBassin(bassin.getNomBassin())) {
				throw new RuntimeException("Un bassin avec ce nom existe déjà");
			}

			// Debugging
			System.out.println(bassin);
			System.out.println("Received prixBassin: " + bassin.getPrix());

			// Vérification et sauvegarde
			Bassin savedBassin = bassinService.saveBassin(bassin);
			return ResponseEntity.ok(savedBassin);
		} catch (RuntimeException e) {
			// Retourne une réponse d'erreur avec le message
			return ResponseEntity.status(HttpStatus.CONFLICT) // 409 Conflict est plus approprié pour les doublons
					.body(Collections.singletonMap("message", e.getMessage()));
		}
	}

	@GetMapping("/existsByNomBassin")
	public ResponseEntity<Boolean> existsByNomBassin(@RequestParam("nomBassin") String nomBassin) {
		boolean exists = bassinService.existsByNomBassin(nomBassin);
		return ResponseEntity.ok(exists);
	}

	@PostMapping("/addBassinWithImages")
	public ResponseEntity<?> addBassinWithImages(@RequestParam("bassin") String bassinJson,
			@RequestParam("images") List<MultipartFile> images) {
		try {

			// Log received data
			System.out.println("Received bassin JSON: " + bassinJson);
			System.out.println("Received images count: " + (images != null ? images.size() : 0));

			// 1. Convertir le JSON en objet Bassin
			ObjectMapper mapper = new ObjectMapper();
			Bassin bassin = mapper.readValue(bassinJson, Bassin.class);

			// 2. Définir les valeurs par défaut des métadonnées
			bassin.setArchive(false);
			bassin.setQuantity(0);
			bassin.setDateAjout(new Date());
			bassin.setDateDerniereModification(new Date());

			// 2. Vérifier si l'ID existe (Mise à jour)
			if (bassin.getIdBassin() != null) {
				bassin = bassinService.getBassin(bassin.getIdBassin());
				if (bassin == null) {
					return ResponseEntity.status(HttpStatus.NOT_FOUND)
							.body("Bassin introuvable avec ID : " + bassin.getIdBassin());
				}
			} else {
				// 3. Si l'ID est null, enregistrer le bassin
				bassin = bassinService.saveBassin(bassin);
			}

			// 4. Ajouter les images associées
			if (images != null && !images.isEmpty()) {
				imageBassinService.uploadImages(bassin, images.toArray(new MultipartFile[0]));
			}

			// 🔥 Recharger le bassin pour inclure les images
			Bassin updatedBassin = bassinService.getBassin(bassin.getIdBassin());

			return ResponseEntity.ok(updatedBassin);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Erreur lors de l'ajout du bassin et des images : " + e.getMessage());
		}
	}

	@PutMapping("/updatebassin/{idBassin}")
	public Bassin updateBassin(@PathVariable("idBassin") Long idBassin, @RequestBody Bassin bassin) {

		bassin.setIdBassin(idBassin); // Set the ID to ensure the correct event is updated
		return bassinService.updateBassin(bassin);
	}

	@PostMapping("/updateBassinWithImg")
	public Bassin updateBassinWithImg(@RequestPart("bassin") String bassinJson,
			@RequestPart(value = "files", required = false) MultipartFile[] files) throws IOException {
		ObjectMapper objectMapper = new ObjectMapper();
		Bassin b = objectMapper.readValue(bassinJson, Bassin.class);

		// Récupérer le bassin existant depuis la base de données
		Bassin existingBassin = bassinRepository.findByIdWithImages(b.getIdBassin())
				.orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + b.getIdBassin()));

		// Mise à jour des propriétés du bassin
		existingBassin.setNomBassin(b.getNomBassin());
		existingBassin.setDescription(b.getDescription());
		existingBassin.setPrix(b.getPrix());
		existingBassin.setMateriau(b.getMateriau());
		existingBassin.setCouleur(b.getCouleur());
		existingBassin.setDimensions(b.getDimensions());
		existingBassin.setDisponible(b.isDisponible());
		existingBassin.setStock(b.getStock());
		existingBassin.setCategorie(b.getCategorie());

		// Traitement des fichiers images
		if (files != null && files.length > 0) {
			for (MultipartFile file : files) {
				if (file != null && !file.isEmpty()) {
					String originalFilename = file.getOriginalFilename();

					// Extraire l'index de l'image à partir du nom du fichier (format :
					// "id_index.extension")
					String[] filenameParts = originalFilename.split("_");
					if (filenameParts.length > 1) {
						try {
							int imageIndex = Integer.parseInt(filenameParts[1].split("\\.")[0]) - 1; // Index commence à
																										// 0

							// Vérifier que l'index est valide
							if (imageIndex >= 0 && imageIndex < existingBassin.getImagesBassin().size()) {
								ImageBassin oldImage = existingBassin.getImagesBassin().get(imageIndex);

								// Supprimer l'ancienne image du dossier
								Path oldImagePath = Paths.get(uploadDir + oldImage.getName());
								Files.deleteIfExists(oldImagePath);

								// Générer un nouveau nom de fichier
								String extension = FilenameUtils.getExtension(originalFilename);
								String newImageName = b.getIdBassin() + "_" + (imageIndex + 1) + "." + extension;

								// Sauvegarder la nouvelle image dans le dossier
								Path newImagePath = Paths.get(uploadDir + newImageName);
								Files.copy(file.getInputStream(), newImagePath, StandardCopyOption.REPLACE_EXISTING);

								// Créer un nouvel objet ImageBassin
								ImageBassin newImage = new ImageBassin();
								newImage.setName(newImageName); // Nom du fichier
								newImage.setType(file.getContentType());
								newImage.setImage(file.getBytes());
								newImage.setBassin(existingBassin);

								// Définir imagePath avec uniquement le nom du fichier
								newImage.setImagePath(newImageName);

								// Remplacer l'ancienne image par la nouvelle
								existingBassin.getImagesBassin().set(imageIndex, newImage);
							}
						} catch (NumberFormatException e) {
							throw new RuntimeException("Format de nom de fichier invalide : " + originalFilename);
						} catch (IOException e) {
							throw new RuntimeException(
									"Erreur lors de l'enregistrement de l'image : " + e.getMessage());
						}
					}
				}
			}
		}

		// Sauvegarder et retourner le bassin mis à jour
		return bassinRepository.save(existingBassin);
	}

	@DeleteMapping("deletebassin/{idBassin}")
	public ResponseEntity<?> deleteBassin(@PathVariable("idBassin") Long idBassin) {
		try {
			bassinService.deleteBassinById(idBassin);
			return ResponseEntity.ok().build(); // Return 200 OK on success
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Error deleting bassin: " + e.getMessage());
		}
	}

	// Affiche la liste des bassin appartient à une catégorie
	@RequestMapping(value = "/Categories/{idCategorie}", method = RequestMethod.GET)
	public List<Bassin> getBassinByCategorieId(@PathVariable("idCategorie") Long idCategorie) {
		return bassinService.findByCategorieIdCategorie(idCategorie);
	}

	@RequestMapping(value = "/bassinByName/{nom}", method = RequestMethod.GET)
	public List<Bassin> findByNomBassinContains(@PathVariable("nom") String nom) {
		return bassinService.findByNomBassinContains(nom);
	}

	/*******************
	 * Gestion Quantité & archive & transaction
	 ********************/

	@PostMapping("/{id}/desarchiver")
	public Bassin desarchiverBassin(@PathVariable("id") Long id,
			@RequestParam("nouvelleQuantite") int nouvelleQuantite) {
		return bassinService.desarchiverBassin(id, nouvelleQuantite);
	}

	@GetMapping("/non-archives")
	public List<Bassin> getBassinsNonArchives() {
		return bassinService.getBassinsNonArchives();
	}

	@GetMapping("/archives")
	public List<Bassin> getBassinsArchives() {
		return bassinService.getBassinsArchives();
	}

	@GetMapping("/notifier-stock-faible")
	public void notifierStockFaible() {
		bassinService.notifierStockFaible();
	}

	/***********************/

	private BassinDTO convertToDTO(Bassin bassin) {
		BassinDTO dto = new BassinDTO();
		dto.setIdBassin(bassin.getIdBassin());
		dto.setNomBassin(bassin.getNomBassin());
		dto.setDescription(bassin.getDescription());
		dto.setPrix(bassin.getPrix());
		dto.setMateriau(bassin.getMateriau());
		dto.setCouleur(bassin.getCouleur());
		dto.setDimensions(bassin.getDimensions());
		dto.setDisponible(bassin.isDisponible());
		dto.setStock(bassin.getStock());
		dto.setArchive(bassin.isArchive());
		dto.setImagePath(bassin.getImagePath());

		if (bassin.getCategorie() != null) {
			dto.setCategorieId(bassin.getCategorie().getIdCategorie());
		}

		return dto;
	}

	@GetMapping("/{id}")
	public BassinDTO getBassinDetails(@PathVariable Long id) {
		Bassin bassin = bassinService.getBassin(id);
		return convertToDTO(bassin);
	}

	@GetMapping("/transactions/{bassinId}")
	public List<Transaction> getBassinTransactions(@PathVariable Long bassinId) {
		return bassinService.getBassinTransactions(bassinId);
	}

	@GetMapping(value = "/rapport/bassin/{id}", produces = MediaType.APPLICATION_PDF_VALUE)
	public ResponseEntity<byte[]> generateBassinStockReport(@PathVariable("id") Long id,
			@RequestParam("startDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
			@RequestParam("endDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {

		byte[] pdfBytes = bassinService.generateBassinStockReport(id, startDate, endDate);

		return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=rapport-bassin-" + id + ".pdf")
				.body(pdfBytes);
	}

	@GetMapping(value = "/rapport/global", produces = MediaType.APPLICATION_PDF_VALUE)
	public ResponseEntity<byte[]> generateGlobalStockReport(
	        @RequestParam(value = "startDate", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
	        @RequestParam(value = "endDate", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {

	    byte[] pdfBytes = bassinService.generateGlobalStockReport(startDate, endDate);

	    String filename = "rapport-global-stock";
	    if (startDate != null || endDate != null) {
	        filename += "-" + (startDate != null ? formatDate(startDate) : "") 
	                  + "-" + (endDate != null ? formatDate(endDate) : "");
	    }
	    filename += ".pdf";

	    return ResponseEntity.ok()
	            .header("Content-Disposition", "attachment; filename=" + filename)
	            .body(pdfBytes);
	}

	private String formatDate(Date date) {
	    return new SimpleDateFormat("yyyyMMdd").format(date);
	}

	@PostMapping("/{id}/update-status")
	public ResponseEntity<Bassin> updateBassinStatus(@PathVariable Long id,
			@RequestBody Map<String, String> statusUpdate) {

		Bassin bassin = bassinService.getBassinById(id);
		if (bassin == null) {
			return ResponseEntity.notFound().build();
		}

		String newStatus = statusUpdate.get("statut");
		if (newStatus != null) {
			bassin.setStatut(newStatus);
			bassin = bassinService.updateBassin(bassin);
			return ResponseEntity.ok(bassin);
		}

		return ResponseEntity.badRequest().build();
	}

	@PostMapping("/{id}/archiver")
	public ResponseEntity<Bassin> archiverBassin(@PathVariable Long id) {
		Bassin bassin = bassinService.getBassinById(id);
		if (bassin == null) {
			return ResponseEntity.notFound().build();
		}

		// Vérifier que le stock est à 0
		if (bassin.getStock() > 0) {
			return ResponseEntity.badRequest().body(null); // ou renvoyer un objet d'erreur personnalisé
		}

		bassin.setArchive(true);
		bassin.setStatut("ARCHIVE");
		bassin = bassinService.updateBassin(bassin);
		return ResponseEntity.ok(bassin);
	}

	@PostMapping("/{id}/mettre-sur-commande")
	@PreAuthorize("hasAuthority('ADMIN')")
	public ResponseEntity<Bassin> mettreSurCommande(@PathVariable Long id,
			@RequestParam Integer dureeFabricationJours) {

		try {

			Bassin bassin = bassinService.mettreSurCommande(id, dureeFabricationJours);
			return ResponseEntity.ok(bassin);

		} catch (IllegalStateException e) {
			return ResponseEntity.badRequest().header("X-Error-Message", e.getMessage()).build();
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().header("X-Error-Message", e.getMessage()).build();
		} catch (Exception e) {
			return ResponseEntity.internalServerError().header("X-Error-Message", e.getMessage()).build();
		}
	}

	@PutMapping("/{id}/duree-fabrication")
	public ResponseEntity<?> updateDureeFabrication(@PathVariable Long id,
			@RequestParam(required = false) Integer duree, @RequestParam(required = false) Integer dureeMin,
			@RequestParam(required = false) Integer dureeMax) {

		try {
			Bassin bassin;
			if (duree != null) {
				bassin = bassinService.updateDureeFabrication(id, duree);
			} else if (dureeMin != null && dureeMax != null) {
				bassin = bassinService.updateDureeFabrication(id, dureeMin, dureeMax);
			} else {
				// Valeurs par défaut si aucun paramètre fourni
				bassin = bassinService.updateDureeFabrication(id, 3, 15);
			}
			return ResponseEntity.ok(bassin);
		} catch (Exception e) {
			return ResponseEntity.badRequest().body(e.getMessage());
		}
	}

	// Method to update fabrication duration with exact days
	public Bassin updateDureeFabrication(Long id, Integer duree) {
		Bassin bassin = getBassinById(id);
		if (bassin == null) {
			throw new IllegalArgumentException("Bassin not found");
		}

		bassin.setDureeFabricationJours(duree);
		// Set min and max to null when using exact duration
		bassin.setDureeFabricationJoursMin(null);
		bassin.setDureeFabricationJoursMax(null);

		return bassinRepository.save(bassin);
	}

	// Method to update fabrication duration with min-max range
	public Bassin updateDureeFabrication(Long id, Integer dureeMin, Integer dureeMax) {
		Bassin bassin = getBassinById(id);
		if (bassin == null) {
			throw new IllegalArgumentException("Bassin not found");
		}

		// Validate min <= max
		if (dureeMin > dureeMax) {
			throw new IllegalArgumentException("Minimum duration cannot be greater than maximum duration");
		}

		// Set exact duration to null when using range
		bassin.setDureeFabricationJours(null);
		bassin.setDureeFabricationJoursMin(dureeMin);
		bassin.setDureeFabricationJoursMax(dureeMax);

		return bassinRepository.save(bassin);
	}

	@PutMapping("/api/bassins/{id}/stock")
	public ResponseEntity<Bassin> updateStock(@PathVariable Long id, @RequestParam int quantite) {

		try {
			Bassin bassin = bassinService.getBassin(id);
			if (bassin == null) {
				return ResponseEntity.notFound().build();
			}

			// Update stock
			int newStock = bassin.getStock() + quantite;
			if (newStock < 0) {
				return ResponseEntity.badRequest().body(null);
			}

			bassin.setStock(newStock);

			// Archive if stock reaches 0
			if (newStock == 0) {
				bassin.setArchive(true);
			} else if (newStock > 0 && bassin.isArchive()) {
				bassin.setArchive(false);
			}

			bassin = bassinService.updateBassin(bassin);

			// Create transaction record
			Transaction transaction = new Transaction();
			transaction.setBassin(bassin);
			transaction.setQuantite(quantite);
			transaction.setDateTransaction(new Date());
			transaction.setTypeOperation(quantite > 0 ? "AJOUT" : "RETRAIT");
			transaction.setRaison("Mise à jour via commande");
			transactionRepository.save(transaction);

			return ResponseEntity.ok(bassin);
		} catch (Exception e) {
			return ResponseEntity.internalServerError().build();
		}
	}

	@PostMapping("/bassins/by-ids")
	public List<BassinDTO> getBassinsByIds(@RequestBody List<Long> ids) {
		return ids.stream().map(id -> convertToDTO(bassinService.getBassin(id)))
				.filter(dto -> dto.getIdBassin() != null).collect(Collectors.toList());
	}

	@GetMapping(value = "/rapport/transactions", produces = MediaType.APPLICATION_PDF_VALUE)
	public ResponseEntity<byte[]> generateTransactionReport(
			@RequestParam(value = "bassinId", required = false) Long bassinId,
			@RequestParam(value = "startDate", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
			@RequestParam(value = "endDate", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {

		try {
			byte[] pdfBytes = bassinService.generateTransactionReport(bassinId, startDate, endDate);

			String filename = "rapport-transactions";
			if (bassinId != null) {
				filename += "-bassin-" + bassinId;
			}
			filename += ".pdf";

			return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=" + filename).body(pdfBytes);
		} catch (Exception e) {
			logger.error("Erreur lors de la génération du rapport: {}", e.getMessage());
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(("Erreur lors de la génération du rapport: " + e.getMessage()).getBytes());
		}
	}

	/*********************/
	@GetMapping(value = "/export-rapport", produces = MediaType.APPLICATION_PDF_VALUE)
	public ResponseEntity<byte[]> generateStockReport(
	        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date startDate,
	        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date endDate) {

	    try {
	        // Si aucune date n'est fournie, prendre les 3 derniers mois par défaut
	        if (startDate == null || endDate == null) {
	            Calendar calendar = Calendar.getInstance();
	            endDate = calendar.getTime();
	            calendar.add(Calendar.MONTH, -3); // 3 mois en arrière
	            startDate = calendar.getTime();
	        }

	        byte[] pdfBytes = bassinService.generateStockReport(null, true, startDate, endDate);
	        
	        String filename = "rapport-stock";
	        if (startDate != null && endDate != null) {
	            filename += "-" + formatDate(startDate) + "-" + formatDate(endDate);
	        }
	        filename += ".pdf";

	        return ResponseEntity.ok()
	                .header("Content-Disposition", "attachment; filename=" + filename)
	                .body(pdfBytes);
	    } catch (Exception e) {
	        logger.error("Erreur lors de la génération du rapport", e);
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
	    }
	}
@PostMapping("/{id}/mettre-a-jour-quantite")
    public ResponseEntity<?> mettreAJourQuantite(
            @PathVariable("id") Long id,
            @RequestParam("quantite") int quantite,
            @RequestParam("raison") String raison) {
        logger.info("Mise à jour quantité - ID: {}, Quantité: {}, Raison: {}", id, quantite, raison);
        try {
            Bassin updatedBassin = bassinService.mettreAJourQuantite(id, quantite, raison);
            try {
                String username = bassinService.getCurrentUsername();
                if (username != null) {
                    notificationServiceClient.handleAjustementStockNotification(
                        username,
                        updatedBassin.getNomBassin(),
                        updatedBassin.getStock()
                    );
                    logger.info("Notification d'ajustement envoyée pour le bassin: {}", updatedBassin.getNomBassin());
                } else {
                    logger.warn("No username found for notification");
                }
            } catch (Exception notifException) {
                logger.warn("Erreur lors de l'envoi de la notification: {}", notifException.getMessage());
            }
            logger.debug("Stock updated successfully for bassin ID: {}", id);
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of(
                        "message", "Stock updated successfully",
                        "bassin", updatedBassin
                    ));
        } catch (IllegalArgumentException e) {
            logger.error("Erreur de validation pour bassin ID {}: {}", id, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage(), "code", "VALIDATION_ERROR"));
        } catch (EntityNotFoundException e) {
            logger.error("Bassin non trouvé ID {}: {}", id, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Bassin non trouvé", "code", "NOT_FOUND"));
        } catch (Exception e) {
            logger.error("Erreur inattendue lors de la mise à jour du stock pour bassin ID {}: ", id, e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "error", "Erreur inattendue lors de la mise à jour du stock",
                        "details", e.getMessage(),
                        "code", "INTERNAL_ERROR"
                    ));
        }
    }

    @PostMapping("/update-stock")
    public ResponseEntity<?> updateStock(@RequestBody TransactionDTO transactionDTO) {
        logger.info("Updating stock for bassin ID: {}, Quantity: {}, Type: {}",
                transactionDTO.getBassinId(), transactionDTO.getQuantite(), transactionDTO.getTypeOperation());
        try {
            Bassin bassin = bassinService.adjustStock(
                transactionDTO.getBassinId(),
                transactionDTO.getQuantite(),
                transactionDTO.getRaison(),
                transactionDTO.getTypeOperation(),
                transactionDTO.getUtilisateur()
            );
            logger.debug("Stock updated successfully for bassin ID: {}", transactionDTO.getBassinId());
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of(
                        "message", "Stock updated successfully",
                        "bassin", bassin
                    ));
        } catch (IllegalArgumentException e) {
            logger.error("Validation error for bassin ID {}: {}", transactionDTO.getBassinId(), e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                        "error", e.getMessage(),
                        "code", "VALIDATION_ERROR"
                    ));
        } catch (EntityNotFoundException e) {
            logger.error("Bassin not found for ID {}: {}", transactionDTO.getBassinId(), e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "Bassin not found",
                        "code", "NOT_FOUND"
                    ));
        } catch (Exception e) {
            logger.error("Error updating stock for bassin ID {}: {}", transactionDTO.getBassinId(), e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "error", "Failed to update stock",
                        "details", e.getMessage(),
                        "code", "INTERNAL_ERROR"
                    ));
        }
    }
	@PostMapping("/transactions/process-order")
	@Transactional
	public ResponseEntity<?> processOrderTransactions(@RequestBody List<TransactionDTO> transactions) {
	    logger.info("Réception de {} transactions de commande", transactions.size());

	    List<String> errors = new ArrayList<>();

	    for (TransactionDTO transactionDTO : transactions) {
	        try {
	            // Mise à jour du stock
	            Bassin bassin = bassinService.getBassin(transactionDTO.getBassinId());
	            if (bassin == null) {
	                throw new IllegalArgumentException("Bassin non trouvé: " + transactionDTO.getBassinId());
	            }

	            // Vérification du stock
	            if (bassin.getStock() < transactionDTO.getQuantite()) {
	                throw new IllegalArgumentException("Stock insuffisant pour le bassin: " + bassin.getNomBassin());
	            }

	            // Création de la transaction
	            Transaction transaction = new Transaction();
	            transaction.setBassin(bassin);
	            transaction.setQuantite(transactionDTO.getQuantite());
	            transaction.setRaison(transactionDTO.getRaison());
	            transaction.setTypeOperation(transactionDTO.getTypeOperation());
	            transaction.setDateTransaction(new Date());
	            transaction.setReferenceExterne(transactionDTO.getReferenceExterne());
	            transaction.setDetailsProduit(transactionDTO.getDetailsProduit());
	            transaction.setPrixUnitaire(transactionDTO.getPrixUnitaire());
	            transaction.setMontantTotal(transactionDTO.getMontantTotal());

	            // Mise à jour du stock
	            bassin.setStock(bassin.getStock() + transactionDTO.getQuantite());
	            bassinRepository.save(bassin);
	            transactionRepository.save(transaction);

	        } catch (Exception e) {
	            String error = "Erreur pour le bassin ID " + transactionDTO.getBassinId() + ": " + e.getMessage();
	            logger.error(error);
	            errors.add(error);
	        }
	    }

	    if (errors.isEmpty()) {
	        return ResponseEntity.ok().build();
	    } else {
	        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).body(errors);
	    }
	}
}
