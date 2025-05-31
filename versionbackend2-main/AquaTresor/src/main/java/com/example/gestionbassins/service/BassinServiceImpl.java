package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.BassinDTO;
import com.example.gestionbassins.dto.UserDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.BassinPersonnalise;
import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.entities.ImageBassin;
import com.example.gestionbassins.entities.Notification;
import com.example.gestionbassins.entities.Transaction;
import com.example.gestionbassins.entities.User;
import com.example.gestionbassins.repos.*;
import com.itextpdf.kernel.colors.Color;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.*;
import com.itextpdf.layout.borders.*;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.pdf.canvas.draw.DashedLine;
import com.itextpdf.kernel.pdf.canvas.draw.ILineDrawer;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class BassinServiceImpl implements BassinService {
	private static final Logger logger = LoggerFactory.getLogger(BassinServiceImpl.class);

	@Autowired
	private BassinRepository bassinRepository;

	@Autowired
	private TransactionRepository transactionRepository;

	@Autowired
	private NotificationServiceClient notificationServiceClient;

	@Autowired
	private UserServiceClient userServiceClient;

	@Autowired
	private ImageBassinService imageBassinService;

	@Autowired
	private ImageBassinRepository imageBassinRepository;

	@Autowired
	private BassinPersonnaliseRepository bassinPersonnaliseRepository;

	@Autowired
	private AccessoireRepository accessoireRepository;

	@Autowired
	private PdfReportService pdfReportService;

	// Couleurs pour le design du rapport
	private static final DeviceRgb PRIMARY_COLOR = new DeviceRgb(0, 90, 170); // Bleu principal
	private static final DeviceRgb SECONDARY_COLOR = new DeviceRgb(70, 130, 180); // Bleu secondaire
	private static final DeviceRgb ACCENT_COLOR = new DeviceRgb(0, 150, 200); // Bleu accent
	private static final DeviceRgb SUCCESS_COLOR = new DeviceRgb(0, 128, 0); // Vert succès
	private static final DeviceRgb WARNING_COLOR = new DeviceRgb(255, 140, 0); // Orange avertissement
	private static final DeviceRgb DANGER_COLOR = new DeviceRgb(220, 20, 60); // Rouge danger
	private static final DeviceRgb LIGHT_BG_COLOR = new DeviceRgb(240, 248, 255); // Fond clair
	private static final DeviceRgb HEADER_BG_COLOR = new DeviceRgb(245, 249, 252); // Fond d'en-tête
	private static final DeviceRgb BORDER_COLOR = new DeviceRgb(220, 230, 240); // Couleur de bordure
	private static final DeviceRgb WHITE_COLOR = new DeviceRgb(255, 255, 255);

	@Transactional
	@Override
	public Bassin mettreAJourQuantite(Long bassinId, int quantite, String raison) {
		logger.info("Mise à jour de la quantité pour le bassin ID: {}, quantité: {}, raison: {}", bassinId, quantite,
				raison);

		// Validation des paramètres
		if (bassinId == null) {
			throw new IllegalArgumentException("L'ID du bassin ne peut pas être null");
		}

		if (raison == null || raison.trim().isEmpty()) {
			throw new IllegalArgumentException("La raison de l'ajustement est obligatoire");
		}

		// Récupération du bassin
		Bassin bassin = bassinRepository.findById(bassinId)
				.orElseThrow(() -> new EntityNotFoundException("Bassin non trouvé avec l'ID: " + bassinId));

		int stockActuel = bassin.getStock();
		int nouvelleQuantite = stockActuel + quantite;

		logger.info("Stock actuel: {}, Ajustement: {}, Nouveau stock calculé: {}", stockActuel, quantite,
				nouvelleQuantite);

		// Vérification des droits utilisateur
		String username = getCurrentUsername();
		boolean isAdmin = isAdminUser(username);

		logger.debug("Utilisateur: {}, Est admin: {}", username, isAdmin);

		// Validation du stock négatif pour les non-admins
		if (!isAdmin && nouvelleQuantite < 0) {
			logger.error(
					"Tentative de rendre le stock négatif pour le bassin ID: {}. " + "Stock actuel: {}, Ajustement: {}",
					bassinId, stockActuel, quantite);
			throw new IllegalArgumentException(String.format(
					"La quantité ne peut pas rendre le stock négatif. " + "Stock actuel: %d, Tentative de retrait: %d",
					stockActuel, Math.abs(quantite)));
		}

		// Mise à jour du stock
		bassin.setStock(nouvelleQuantite);

		try {
			// Création de l'enregistrement de transaction
			Transaction transaction = new Transaction();
			transaction.setBassin(bassin);
			transaction.setQuantite(quantite);
			transaction.setRaison(raison);
			transaction.setTypeOperation(determinerTypeOperation(quantite));
			transaction.setDateTransaction(new Date());

			// Gestion sécurisée de l'ID utilisateur
			Long userId = getUserIdFromUsername(username);
			transaction.setUserId(userId);

			// Sauvegarde en base de données
			transactionRepository.save(transaction);
			Bassin updatedBassin = bassinRepository.save(bassin);

			// Mise à jour du statut et notifications
			updateBassinStatus(updatedBassin);

			logger.info("Stock mis à jour avec succès pour le bassin ID: {}. Nouveau stock: {}", bassinId,
					updatedBassin.getStock());

			return updatedBassin;

		} catch (Exception e) {
			logger.error("Erreur lors de la sauvegarde pour le bassin ID: {}", bassinId, e);
			throw new RuntimeException("Erreur lors de la mise à jour du stock: " + e.getMessage(), e);
		}
	}

// Méthodes utilitaires améliorées
	private String determinerTypeOperation(int quantite) {
		if (quantite > 0) {
			return "AJOUT";
		} else if (quantite < 0) {
			return "RETRAIT";
		} else {
			return "AJUSTEMENT";
		}
	}

	public String getCurrentUsername() {
		try {
			Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
			if (authentication != null && authentication.isAuthenticated()) {
				String username = authentication.getName();
				// Eviter les utilisateurs anonymes
				if (!"anonymousUser".equals(username)) {
					return username;
				}
			}
			logger.debug("Aucun utilisateur authentifié trouvé, utilisation de 'system'");
			return "system";
		} catch (Exception e) {
			logger.warn("Impossible de récupérer le nom d'utilisateur actuel", e);
			return "system";
		}
	}

	private boolean isAdminUser(String username) {
		if (username == null || "system".equals(username)) {
			logger.debug("Utilisateur système ou null, considéré comme admin");
			return true; // L'utilisateur système a tous les droits
		}

		try {
			UserDTO user = userServiceClient.getUserByUsername(username);
			boolean isAdmin = user != null && user.getRoles() != null && user.getRoles().contains("ADMIN");
			logger.debug("Vérification rôle admin pour {}: {}", username, isAdmin);
			return isAdmin;
		} catch (Exception e) {
			logger.warn("Impossible de vérifier le rôle de l'utilisateur: {}, considéré comme non-admin", username, e);
			return false; // En cas d'erreur, pas de privilèges admin
		}
	}

	private Long getUserIdFromUsername(String username) {
		if (username == null || "system".equals(username)) {
			return null; // Pas d'ID pour l'utilisateur système
		}

		try {
			UserDTO user = userServiceClient.getUserByUsername(username);
			return user != null ? user.getUserId() : null;
		} catch (Exception e) {
			logger.warn("Impossible de récupérer l'ID de l'utilisateur: {}", username, e);
			return null;
		}
	}

	@Override
	public Bassin saveBassin(Bassin b) {
		if (bassinRepository.existsByNomBassin(b.getNomBassin())) {
			throw new RuntimeException("Un bassin avec ce nom existe déjà");
		}
		return bassinRepository.save(b);
	}

	@Override
	public boolean existsByNomBassin(String nomBassin) {
		return bassinRepository.existsByNomBassin(nomBassin);
	}

	@Override
	public Bassin updateBassin(Bassin b) {
		Bassin existingBassin = bassinRepository.findByIdWithImages(b.getIdBassin())
				.orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + b.getIdBassin()));

		existingBassin.setNomBassin(b.getNomBassin());
		existingBassin.setDescription(b.getDescription());
		existingBassin.setPrix(b.getPrix());
		existingBassin.setMateriau(b.getMateriau());
		existingBassin.setCouleur(b.getCouleur());
		existingBassin.setDimensions(b.getDimensions());
		existingBassin.setDisponible(b.isDisponible());
		existingBassin.setStock(b.getStock());
		existingBassin.setCategorie(b.getCategorie());

		if (b.getImagesBassin() != null && !b.getImagesBassin().isEmpty()) {
			existingBassin.getImagesBassin().removeIf(existingImage -> b.getImagesBassin().stream()
					.noneMatch(newImage -> newImage.getIdImage().equals(existingImage.getIdImage())));
			for (ImageBassin newImage : b.getImagesBassin()) {
				if (newImage.getIdImage() == null) {
					newImage.setBassin(existingBassin);
					existingBassin.getImagesBassin().add(newImage);
				}
			}
		}
		return bassinRepository.save(existingBassin);
	}

	@Override
	public void deleteBassin(Bassin b) {
		bassinRepository.delete(b);
	}

	@Override
	public void deleteBassinById(Long id) {
		Bassin b = getBassin(id);
		if (b == null) {
			throw new RuntimeException("Bassin not found with ID: " + id);
		}

		BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findByBassinId(id);
		if (bassinPersonnalise != null) {
			if (bassinPersonnalise.getAccessoires() != null && !bassinPersonnalise.getAccessoires().isEmpty()) {
				accessoireRepository.deleteAll(bassinPersonnalise.getAccessoires());
			}
			bassinPersonnaliseRepository.delete(bassinPersonnalise);
		}

		if (b.getImagesBassin() != null && !b.getImagesBassin().isEmpty()) {
			for (ImageBassin image : b.getImagesBassin()) {
				String filePath = "C:/shared/images/" + image.getImagePath();
				try {
					Path path = Paths.get(filePath);
					if (Files.exists(path)) {
						Files.delete(path);
					}
				} catch (IOException e) {
					logger.error("Erreur lors de la suppression du fichier : {}", filePath, e);
				}
			}
		}

		imageBassinRepository.deleteAll(b.getImagesBassin());
		bassinRepository.deleteById(id);
	}

	@Override
	public Bassin getBassin(Long id) {
		return bassinRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + id));
	}

	@Override
	public List<Bassin> getAllBassins() {
		return bassinRepository.findAll();
	}

	@Override
	public List<Bassin> findByNomBassin(String nom) {
		return bassinRepository.findByNomBassin(nom).map(List::of).orElse(Collections.emptyList());
	}

	@Override
	public List<Bassin> findByNomBassinContains(String nom) {
		return bassinRepository.findByNomBassinContains(nom);
	}

	@Override
	public List<Bassin> findByCategorie(Categorie c) {
		return bassinRepository.findByCategorie(c);
	}

	@Override
	public List<Bassin> findByCategorieIdCategorie(Long id) {
		return bassinRepository.findByCategorieIdCategorie(id);
	}

	@Override
	public List<Bassin> findByOrderByNomBassinAsc() {
		return bassinRepository.findByOrderByNomBassinAsc();
	}

	@Override
	public List<Bassin> trierBassinsNomsPrix() {
		return bassinRepository.trierBassinNomPrix();
	}

	@Override
	public BassinDTO toBassinDTO(Bassin bassin) {
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
		return dto;
	}

	@Override
	public Bassin getBassinById(Long id) {
		return bassinRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + id));
	}

	@Override
	public Bassin updateBassin(Long id, Bassin bassin) {
		Bassin existingBassin = bassinRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
		existingBassin.setNomBassin(bassin.getNomBassin());
		existingBassin.setDescription(bassin.getDescription());
		existingBassin.setPrix(bassin.getPrix());
		existingBassin.setMateriau(bassin.getMateriau());
		existingBassin.setCouleur(bassin.getCouleur());
		existingBassin.setDimensions(bassin.getDimensions());
		existingBassin.setDisponible(bassin.isDisponible());
		existingBassin.setStock(bassin.getStock());
		return bassinRepository.save(existingBassin);
	}

	@Override
	public Bassin desarchiverBassin(Long id, int nouvelleQuantite) {
		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
		bassin.setArchive(false);
		bassin.setStock(nouvelleQuantite);
		return bassinRepository.save(bassin);
	}

	@Override
	@Transactional
	public Bassin archiverBassin(Long id) {
		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

		if (bassin.getStock() != 0) {
			throw new IllegalStateException("Impossible d'archiver un bassin dont le stock n'est pas à 0");
		}

		bassin.setStatut("ARCHIVE");
		bassin.setArchive(true);

		Notification notification = new Notification();
		notification.setTitle("Bassin Archivé");
		notification.setMessage("✅ Bassin " + bassin.getNomBassin() + " a été archivé (Rupture définitive)");
		notification.setType("STOCK"); // Use valid enum value
		notification.setDate(LocalDateTime.now()); // Use LocalDateTime
		notification.setRead(false);
		notification.setUsername("admin"); // Required field

		notificationServiceClient.createNotification(notification);

		return bassinRepository.save(bassin);
	}

	@Override
	@Transactional
	public Bassin mettreSurCommande(Long id) {
		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

		if (bassin.getStock() != 0) {
			throw new IllegalStateException("Le bassin doit avoir un stock à 0 pour être mis sur commande");
		}

		bassin.setStatut("SUR_COMMANDE");
		bassin.setArchive(false);

		Notification notification = new Notification();
		notification.setTitle("Bassin Mis Sur Commande");
		notification.setMessage("ℹ️ Bassin " + bassin.getNomBassin() + " est maintenant sur commande");
		notification.setType("STOCK"); // Use valid enum value
		notification.setDate(LocalDateTime.now()); // Use LocalDateTime
		notification.setRead(false);
		notification.setUsername("admin"); // Required field

		notificationServiceClient.createNotification(notification);

		return bassinRepository.save(bassin);
	}

	@Transactional
	public Bassin updateDureeFabrication(Long id, int dureeMin, int dureeMax) {
		if (dureeMin <= 0 || dureeMax <= 0 || dureeMin > dureeMax) {
			throw new IllegalArgumentException("La durée doit être une fourchette valide (min <= max)");
		}

		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

		if (bassin.getStock() == 0 && !"SUR_COMMANDE".equals(bassin.getStatut())) {
			bassin.setStatut("SUR_COMMANDE");
			bassin.setSurCommande(true);
		}

		if (!"SUR_COMMANDE".equals(bassin.getStatut())) {
			throw new IllegalStateException(
					"La durée de fabrication ne peut être modifiée que pour les bassins sur commande");
		}

		bassin.setDureeFabricationJoursMin(dureeMin);
		bassin.setDureeFabricationJoursMax(dureeMax);

		Notification notification = new Notification();
		notification.setTitle("Mise à jour de la durée de fabrication");
		notification
				.setMessage(String.format("La durée de fabrication du bassin '%s' a été mise à jour : %d à %d jours.",
						bassin.getNomBassin(), dureeMin, dureeMax));
		notification.setType("STOCK"); // Use valid enum value
		notification.setDate(LocalDateTime.now()); // Use LocalDateTime
		notification.setRead(false);
		notification.setUsername("admin"); // Required field

		notificationServiceClient.createNotification(notification);

		return bassinRepository.save(bassin);
	}

	@Transactional
	public Bassin mettreSurCommande(Long id, Integer dureeFabrication) {
		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

		if ("SUR_COMMANDE".equals(bassin.getStatut())) {
			throw new IllegalStateException("Le bassin est déjà sur commande");
		}

		bassin.setStatut("SUR_COMMANDE");
		bassin.setSurCommande(true);
		bassin.setDureeFabricationJoursMin(dureeFabrication);
		bassin.setDureeFabricationJoursMax(dureeFabrication);

		Notification notification = new Notification();
		notification.setTitle("Bassin mis sur commande");
		notification.setMessage(
				String.format("Le bassin '%s' est maintenant sur commande avec une durée de fabrication de %d jours.",
						bassin.getNomBassin(), dureeFabrication));
		notification.setType("STOCK"); // Use valid enum
		notification.setDate(LocalDateTime.now()); // Use LocalDateTime
		notification.setRead(false);
		notification.setUsername("admin"); // Required field

		notificationServiceClient.createNotification(notification);

		return bassinRepository.save(bassin);
	}

	public List<Bassin> getBassinsNonArchives() {
		return bassinRepository.findByArchiveFalse();
	}

	@Override
	public List<Bassin> getBassinsArchives() {
		return bassinRepository.findByArchiveTrue();
	}

	private void addCategoryStatCard(Table table, String label, String value, DeviceRgb valueColor) {
		Cell cell = new Cell().setPadding(8).setBackgroundColor(LIGHT_BG_COLOR);
		cell.add(new Paragraph(label).setFontSize(10).setTextAlignment(TextAlignment.CENTER));
		Paragraph valuePara = new Paragraph(value).setFontSize(12).setBold().setTextAlignment(TextAlignment.CENTER);
		if (valueColor != null) {
			valuePara.setFontColor(valueColor);
		}
		cell.add(valuePara);
		table.addCell(cell);
	}

	@Override
	public Bassin updateDureeFabrication(Long id, Integer duree) {
		return updateDureeFabrication(id, duree, duree);
	}

	@Override
	@Transactional
	public Bassin updateDureeFabrication(Long id, Integer dureeMin, Integer dureeMax) {
		if (dureeMin == null || dureeMax == null || dureeMin <= 0 || dureeMax <= 0 || dureeMin > dureeMax) {
			throw new IllegalArgumentException("La durée doit être une fourchette valide (min ≤ max)");
		}

		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

		if (bassin.getStock() == 0 && !"SUR_COMMANDE".equals(bassin.getStatut())) {
			bassin.setStatut("SUR_COMMANDE");
			bassin.setSurCommande(true);
		}

		if (!"SUR_COMMANDE".equals(bassin.getStatut())) {
			throw new IllegalStateException(
					"La durée de fabrication ne peut être modifiée que pour les bassins sur commande");
		}

		if (dureeMin.equals(dureeMax)) {
			bassin.setDureeFabricationJours(dureeMin);
			bassin.setDureeFabricationJoursMin(null);
			bassin.setDureeFabricationJoursMax(null);
		} else {
			bassin.setDureeFabricationJours(null);
			bassin.setDureeFabricationJoursMin(dureeMin);
			bassin.setDureeFabricationJoursMax(dureeMax);
		}

		Notification notification = new Notification();
		notification.setTitle("Mise à jour de la durée de fabrication");
		notification.setMessage("ℹ️ Durée de fabrication mise à jour pour '" + bassin.getNomBassin() + "': "
				+ bassin.getDureeFabricationDisplay());
		notification.setType("STOCK"); // Use valid enum value
		notification.setDate(LocalDateTime.now()); // Use LocalDateTime
		notification.setRead(false);
		notification.setUsername("admin"); // Required field

		notificationServiceClient.createNotification(notification);

		return bassinRepository.save(bassin);
	}

	@Override
	@Transactional
	public void notifierStockFaible() {
		List<Bassin> bassins = bassinRepository.findByArchiveFalse();
		for (Bassin bassin : bassins) {
			if (bassin.getStock() < 5 && bassin.getStock() > 0) {
				Notification notification = new Notification();
				notification.setTitle("Stock faible");
				notification.setMessage("⚠️ ALERTE : Stock faible pour le bassin '" + bassin.getNomBassin()
						+ "' (Quantité : " + bassin.getStock() + ")");
				notification.setType("STOCK"); // Use valid enum value
				notification.setDate(LocalDateTime.now()); // Use LocalDateTime
				notification.setRead(false);
				notification.setUsername("admin"); // Required field

				notificationServiceClient.createNotification(notification);
			}
		}
	}

	@Override
	public List<Transaction> getTransactions() {
		return transactionRepository.findAll(); // No user fetching here
	}

	@Override
	public void adjustStock(Long bassinId, int quantityDelta) {
		Bassin bassin = getBassinById(bassinId);
		bassin.setStock(bassin.getStock() + quantityDelta);
		bassinRepository.save(bassin);
	}

	@Override
	@Transactional
	public Bassin adjustStock(Long bassinId, int quantityDelta, String raison, String typeOperation, String username) {
		logger.info("Ajustement du stock pour le bassin ID: {}, delta: {}, raison: {}", bassinId, quantityDelta,
				raison);

		Bassin bassin = getBassinById(bassinId);
		int oldStock = bassin.getStock();

		// Vérifier si le stock ne devient pas négatif
		if (oldStock + quantityDelta < 0) {
			logger.error("Tentative de réduction du stock en dessous de zéro pour le bassin ID: {}", bassinId);
			throw new IllegalArgumentException("La quantité ne peut pas rendre le stock négatif");
		}

		// Mettre à jour le stock
		bassin.setStock(oldStock + quantityDelta);
		logger.debug("Stock mis à jour de {} à {} pour le bassin {}", oldStock, bassin.getStock(),
				bassin.getNomBassin());

		// Créer une transaction
		Transaction transaction = new Transaction();
		transaction.setBassin(bassin);
		transaction.setQuantite(quantityDelta);
		transaction.setRaison(raison);
		transaction.setTypeOperation(typeOperation);
		transaction.setDateTransaction(new Date());

		// Récupérer l'ID utilisateur si disponible
		if (username != null && !username.isEmpty()) {
			try {
				UserDTO user = userServiceClient.getUserByUsername(username);
				if (user != null) {
					transaction.setUserId(user.getUserId());
				}
			} catch (Exception e) {
				logger.warn("Impossible de récupérer l'utilisateur: {}", username, e);
			}
		}

		transactionRepository.save(transaction);

		// Gérer le statut du bassin en fonction du stock
		updateBassinStatus(bassin);

		return bassinRepository.save(bassin);
	}

	private void updateBassinStatus(Bassin bassin) {
		// Vérifie si le stock est épuisé
		if (bassin.getStock() == 0) {
			bassin.setStatut("SUR_COMMANDE");
			bassin.setSurCommande(true);

			Notification notification = new Notification();
			notification.setTitle("Rupture de stock");
			notification.setMessage("Le bassin '" + bassin.getNomBassin() + "' est actuellement en rupture de stock.");
			notification.setType("STOCK"); // Use valid enum value
			notification.setDate(LocalDateTime.now()); // Use LocalDateTime
			notification.setRead(false);
			notification.setUsername("admin"); // Required field

			notificationServiceClient.createNotification(notification);
		}
		// Vérifie si un bassin précédemment en rupture est de nouveau disponible
		else if (bassin.getStock() > 0 && "SUR_COMMANDE".equals(bassin.getStatut())) {
			bassin.setStatut("DISPONIBLE");
			bassin.setSurCommande(false);
		}

		// Notifie si le stock est faible (inférieur à 5 unités)
		if (bassin.getStock() > 0 && bassin.getStock() < 5) {
			Notification notification = new Notification();
			notification.setTitle("Stock faible");
			notification.setMessage("Le stock du bassin '" + bassin.getNomBassin() + "' est faible : "
					+ bassin.getStock() + " unité(s) restante(s).");
			notification.setType("STOCK"); // Use valid enum value
			notification.setDate(LocalDateTime.now()); // Use LocalDateTime
			notification.setRead(false);
			notification.setUsername("admin"); // Required field

			notificationServiceClient.createNotification(notification);
		}
	}

	@Override
	public List<Transaction> getBassinTransactions(Long bassinId) {
		return transactionRepository.findByBassin_IdBassinOrderByDateTransactionDesc(bassinId);
	}

	@Override
	public List<Transaction> getBassinTransactionsWithDateRange(Long bassinId, Date startDate, Date endDate) {
		if (startDate == null && endDate == null) {
			return transactionRepository.findByBassin_IdBassinOrderByDateTransactionDesc(bassinId);
		} else if (startDate != null && endDate != null) {
			return transactionRepository.findByBassin_IdBassinAndDateTransactionBetweenOrderByDateTransactionDesc(
					bassinId, startDate, endDate);
		} else if (startDate != null) {
			return transactionRepository
					.findByBassin_IdBassinAndDateTransactionAfterOrderByDateTransactionDesc(bassinId, startDate);
		} else {
			return transactionRepository
					.findByBassin_IdBassinAndDateTransactionBeforeOrderByDateTransactionDesc(bassinId, endDate);
		}
	}

	@Override
	public byte[] generateStockReport(Long categorieId, boolean showArchived) {
		return generateStockReport(categorieId, showArchived, null, null);
	}

	private void addTransactionSummary(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie,
			Date startDate, Date endDate) {
		document.add(new Paragraph("SYNTHÈSE DES TRANSACTIONS").setFontSize(14).setBold().setFontColor(PRIMARY_COLOR)
				.setMarginTop(20).setMarginBottom(10));

		String periodInfo = "Période analysée: ";
		if (startDate != null && endDate != null) {
			periodInfo += formatDateShort(startDate) + " au " + formatDateShort(endDate);
		} else {
			periodInfo += "3 derniers mois";
		}

		document.add(
				new Paragraph(periodInfo).setFontSize(10).setItalic().setFontColor(ACCENT_COLOR).setMarginBottom(15));

		Table summaryTable = new Table(UnitValue.createPercentArray(new float[] { 2, 2, 2, 2, 2 }))
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

		summaryTable.addHeaderCell(createModernHeaderCell("Catégorie"));
		summaryTable.addHeaderCell(createModernHeaderCell("Entrées"));
		summaryTable.addHeaderCell(createModernHeaderCell("Sorties"));
		summaryTable.addHeaderCell(createModernHeaderCell("Solde"));
		summaryTable.addHeaderCell(createModernHeaderCell("Valeur"));

		for (Map.Entry<Categorie, List<Bassin>> entry : bassinsParCategorie.entrySet()) {
			Categorie categorie = entry.getKey();
			List<Bassin> bassins = entry.getValue();

			int totalEntrees = 0;
			int totalSorties = 0;
			double totalValeur = 0;

			for (Bassin bassin : bassins) {
				List<Transaction> transactions = getBassinTransactionsWithDateRange(bassin.getIdBassin(), startDate,
						endDate);

				for (Transaction t : transactions) {
					if (t.getQuantite() > 0) {
						totalEntrees += t.getQuantite();
						totalValeur += t.getQuantite() * bassin.getPrix();
					} else {
						totalSorties += Math.abs(t.getQuantite());
						totalValeur -= Math.abs(t.getQuantite()) * bassin.getPrix();
					}
				}
			}

			String categorieName = categorie != null ? categorie.getNomCategorie() : "Non classé";
			summaryTable.addCell(createStyledCell(categorieName, WHITE_COLOR, TextAlignment.LEFT));

			Cell entreesCell = createStyledCell(String.valueOf(totalEntrees), WHITE_COLOR, TextAlignment.CENTER);
			entreesCell.setFontColor(SUCCESS_COLOR);
			summaryTable.addCell(entreesCell);

			Cell sortiesCell = createStyledCell(String.valueOf(totalSorties), WHITE_COLOR, TextAlignment.CENTER);
			sortiesCell.setFontColor(DANGER_COLOR);
			summaryTable.addCell(sortiesCell);

			int balance = totalEntrees - totalSorties;
			Cell balanceCell = createStyledCell(String.valueOf(balance), WHITE_COLOR, TextAlignment.CENTER);
			balanceCell.setFontColor(balance >= 0 ? SUCCESS_COLOR : DANGER_COLOR);
			summaryTable.addCell(balanceCell);

			summaryTable.addCell(
					createStyledCell(String.format("%,.2f DT", totalValeur), WHITE_COLOR, TextAlignment.RIGHT));
		}

		document.add(summaryTable);

		// Ajouter le tableau détaillé des transactions sans limite de 50
		List<Transaction> allTransactions = new ArrayList<>();
		for (List<Bassin> bassins : bassinsParCategorie.values()) {
			for (Bassin bassin : bassins) {
				allTransactions.addAll(getBassinTransactionsWithDateRange(bassin.getIdBassin(), startDate, endDate));
			}
		}

		if (!allTransactions.isEmpty()) {
			document.add(new Paragraph("DÉTAIL DES TRANSACTIONS").setFontSize(12).setBold().setFontColor(PRIMARY_COLOR)
					.setMarginTop(10).setMarginBottom(5));

			// Updated to 5 columns (removed Utilisateur)
			Table detailTable = new Table(UnitValue.createPercentArray(new float[] { 2, 2, 2, 2, 2 }))
					.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

			detailTable.addHeaderCell(createModernHeaderCell("Date"));
			detailTable.addHeaderCell(createModernHeaderCell("Bassin"));
			detailTable.addHeaderCell(createModernHeaderCell("Type"));
			detailTable.addHeaderCell(createModernHeaderCell("Quantité"));
			detailTable.addHeaderCell(createModernHeaderCell("Raison"));

			SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");
			boolean alternate = false;

			for (Transaction t : allTransactions) {
				DeviceRgb bgColor = alternate ? LIGHT_BG_COLOR : WHITE_COLOR;

				detailTable.addCell(
						createStyledCell(dateFormat.format(t.getDateTransaction()), bgColor, TextAlignment.CENTER));

				String bassinName = t.getBassin() != null ? t.getBassin().getNomBassin() : "Bassin inconnu";
				detailTable.addCell(createStyledCell(bassinName, bgColor, TextAlignment.LEFT));

				detailTable.addCell(createStyledCell(t.getTypeOperation(), bgColor, TextAlignment.CENTER));

				Cell qtyCell = createStyledCell(String.valueOf(t.getQuantite()), bgColor, TextAlignment.CENTER);
				if (t.getQuantite() > 0) {
					qtyCell.setFontColor(SUCCESS_COLOR);
				} else {
					qtyCell.setFontColor(DANGER_COLOR);
				}
				detailTable.addCell(qtyCell);

				detailTable.addCell(createStyledCell(t.getRaison(), bgColor, TextAlignment.LEFT));

				alternate = !alternate;
			}

			document.add(detailTable);
		}
	}

	private void addDetailedInventory(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie,
			boolean showArchived) {
		document.add(new Paragraph("INVENTAIRE DÉTAILLÉ PAR CATÉGORIE").setFontSize(14).setBold()
				.setFontColor(PRIMARY_COLOR).setMarginBottom(10));

		for (Map.Entry<Categorie, List<Bassin>> entry : bassinsParCategorie.entrySet()) {
			Categorie categorie = entry.getKey();
			List<Bassin> bassins = entry.getValue();

// Ignorer les catégories vides
			if (bassins.isEmpty())
				continue;

			String nomCategorie = categorie != null ? categorie.getNomCategorie() : "Bassins Non Classés";

			document.add(new Paragraph(nomCategorie).setFontSize(12).setBold().setFontColor(SECONDARY_COLOR)
					.setMarginTop(15).setMarginBottom(5));

			Table table = new Table(UnitValue.createPercentArray(new float[] { 1, 3, 1, 1, 1, 1, 1 }))
					.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(15);

// En-têtes
			table.addHeaderCell(createHeaderCell("ID"));
			table.addHeaderCell(createHeaderCell("Nom"));
			table.addHeaderCell(createHeaderCell("Dimensions"));
			table.addHeaderCell(createHeaderCell("Prix Unit."));
			table.addHeaderCell(createHeaderCell("Stock"));
			table.addHeaderCell(createHeaderCell("Valeur"));
			table.addHeaderCell(createHeaderCell("Statut"));

// Données
			boolean alternate = false;
			for (Bassin bassin : bassins) {
				DeviceRgb bgColor = alternate ? LIGHT_BG_COLOR : new DeviceRgb(255, 255, 255);

				if (bassin.isArchive()) {
					bgColor = new DeviceRgb(245, 245, 245); // Gris clair pour archivés
				}

// ID
				table.addCell(createCell(bassin.getIdBassin().toString(), bgColor, TextAlignment.CENTER));

// Nom
				table.addCell(createCell(bassin.getNomBassin(), bgColor, TextAlignment.LEFT));

// Dimensions
				table.addCell(createCell(bassin.getDimensions(), bgColor, TextAlignment.CENTER));

// Prix
				table.addCell(createCell(String.format("%.2f DT", bassin.getPrix()), bgColor, TextAlignment.RIGHT));

// Stock avec couleur
				Cell stockCell = createCell(String.valueOf(bassin.getStock()), bgColor, TextAlignment.CENTER);
				if (bassin.getStock() == 0) {
					stockCell.setFontColor(DANGER_COLOR);
				} else if (bassin.getStock() < 5) {
					stockCell.setFontColor(WARNING_COLOR);
				}
				table.addCell(stockCell);

// Valeur
				table.addCell(createCell(String.format("%.2f DT", bassin.getPrix() * bassin.getStock()), bgColor,
						TextAlignment.RIGHT));

// Statut avec couleur
				String statut = bassin.getStatut();
				if (bassin.isSurCommande()) {
					statut = "SUR_COMMANDE";
				}

				Cell statutCell = createCell(statut, bgColor, TextAlignment.CENTER);
				if ("SUR_COMMANDE".equals(statut)) {
					statutCell.setFontColor(WARNING_COLOR);
				} else if (bassin.isArchive()) {
					statutCell.setFontColor(SECONDARY_COLOR);
				} else {
					statutCell.setFontColor(SUCCESS_COLOR);
				}
				table.addCell(statutCell);

				alternate = !alternate;
			}

			document.add(table);

// Statistiques de la catégorie
			int totalStock = bassins.stream().filter(b -> !b.isArchive()).mapToInt(Bassin::getStock).sum();
			double totalValue = bassins.stream().filter(b -> !b.isArchive())
					.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

			document.add(new Paragraph(String.format("Total pour '%s': %d bassins, %d en stock, valeur: %.2f DT",
					nomCategorie, bassins.size(), totalStock, totalValue)).setFontSize(10).setItalic()
					.setMarginBottom(20));
		}
	}

	private void addGlobalStatistics(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie,
			Date startDate, Date endDate) {
		// Calculate all statistics
		long totalBassins = bassinsParCategorie.values().stream().mapToLong(List::size).sum();
		long archived = bassinsParCategorie.values().stream().flatMap(List::stream).filter(Bassin::isArchive).count();
		long active = totalBassins - archived;

		long lowStock = bassinsParCategorie.values().stream().flatMap(List::stream)
				.filter(b -> !b.isArchive() && b.getStock() < 5 && b.getStock() > 0).count();
		long outOfStock = bassinsParCategorie.values().stream().flatMap(List::stream)
				.filter(b -> !b.isArchive() && b.getStock() == 0).count();

		double totalValue = bassinsParCategorie.values().stream().flatMap(List::stream).filter(b -> !b.isArchive())
				.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

		double archivedValue = bassinsParCategorie.values().stream().flatMap(List::stream).filter(Bassin::isArchive)
				.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

		// Add statistics section
		document.add(new Paragraph("STATISTIQUES GLOBALES").setFontSize(14).setBold().setFontColor(PRIMARY_COLOR)
				.setMarginBottom(10));

		// Create stats cards
		Table statsCards = new Table(UnitValue.createPercentArray(new float[] { 1, 1, 1, 1 }))
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

		addStatCard(statsCards, "Catégories", String.valueOf(bassinsParCategorie.size()), null);
		addStatCard(statsCards, "Bassins Actifs", String.valueOf(active), SUCCESS_COLOR);
		addStatCard(statsCards, "Bassins Archivés", String.valueOf(archived), DANGER_COLOR);
		addStatCard(statsCards, "Valeur Active", String.format("%,.2f DT", totalValue), PRIMARY_COLOR);

		document.add(statsCards);

		// Add detailed stats table
		Table statsTable = new Table(UnitValue.createPercentArray(new float[] { 2, 3 }))
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

		statsTable
				.addHeaderCell(new Cell(1, 2).add(new Paragraph("DÉTAILS DU STOCK")).setBackgroundColor(SECONDARY_COLOR)
						.setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.CENTER));

		addStatRow(statsTable, "Total bassins", String.valueOf(totalBassins), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Bassins actifs", String.valueOf(active), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Bassins archivés", String.valueOf(archived), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Stock faible (1-4)", String.valueOf(lowStock), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Rupture de stock", String.valueOf(outOfStock), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Valeur active", String.format("%,.2f DT", totalValue), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Valeur archivée", String.format("%,.2f DT", archivedValue), LIGHT_BG_COLOR);

		document.add(statsTable);
	}

	@Override
	public byte[] generateBassinStockReport(Long bassinId, Date startDate, Date endDate) {
		try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
			PdfWriter writer = new PdfWriter(baos);
			writer.setCompressionLevel(9);

			PdfDocument pdfDoc = new PdfDocument(writer);
			pdfDoc.setDefaultPageSize(PageSize.A4);

			Document document = new Document(pdfDoc);
			document.setMargins(36, 36, 36, 36);

			Bassin bassin = getBassinById(bassinId);
			if (bassin == null) {
				document.add(new Paragraph("Bassin non trouvé avec l'ID: " + bassinId)
						.setFontColor(new DeviceRgb(255, 0, 0))); // DANGER_COLOR as DeviceRgb
				document.close();
				return baos.toByteArray();
			}

			String dateRange = "";
			if (startDate != null && endDate != null) {
				dateRange = " | Période: " + formatDateShort(startDate) + " à " + formatDateShort(endDate);
			} else if (startDate != null) {
				dateRange = " | Depuis: " + formatDateShort(startDate);
			} else if (endDate != null) {
				dateRange = " | Jusqu'à: " + formatDateShort(endDate);
			}

			addReportHeader(document, "RAPPORT D'HISTORIQUE DU BASSIN",
					bassin.getNomBassin() + " (ID: " + bassinId + ")" + dateRange);

			// Informations du bassin
			document.add(new Paragraph("FICHE DÉTAILLÉE").setFontSize(14).setBold().setFontColor(PRIMARY_COLOR)
					.setMarginBottom(10));

			Table infoTable = new Table(UnitValue.createPercentArray(new float[] { 3, 7 }))
					.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

			addInfoRow(infoTable, "Nom", bassin.getNomBassin());
			addInfoRow(infoTable, "Catégorie",
					bassin.getCategorie() != null ? bassin.getCategorie().getNomCategorie() : "Non classé");

			String[] dimensions = bassin.getDimensions() != null ? bassin.getDimensions().split("x") : new String[0];
			String dimensionsDisplay = "Non spécifiées";

			if (dimensions.length >= 3) {
				try {
					float longueur = Float.parseFloat(dimensions[0].trim());
					float largeur = Float.parseFloat(dimensions[1].trim());
					float profondeur = Float.parseFloat(dimensions[2].trim());
					dimensionsDisplay = String.format("%.2f x %.2f x %.2f m", longueur, largeur, profondeur);
				} catch (NumberFormatException e) {
					dimensionsDisplay = bassin.getDimensions(); // Format original si parse impossible
				}
			} else if (bassin.getDimensions() != null) {
				dimensionsDisplay = bassin.getDimensions();
			}

			addInfoRow(infoTable, "Dimensions", dimensionsDisplay);

			// Calcul du volume si possible
			String volumeDisplay = "Non calculé";
			if (dimensions.length >= 3) {
				try {
					float longueur = Float.parseFloat(dimensions[0].trim());
					float largeur = Float.parseFloat(dimensions[1].trim());
					float profondeur = Float.parseFloat(dimensions[2].trim());
					float volume = longueur * largeur * profondeur * 1000; // En litres
					volumeDisplay = String.format("%.2f L", volume);
				} catch (NumberFormatException e) {
					// Garder la valeur par défaut
				}
			}

			addInfoRow(infoTable, "Volume", volumeDisplay);
			addInfoRow(infoTable, "Prix unitaire", String.format("%.2f DT", bassin.getPrix()));
			addInfoRow(infoTable, "Stock actuel", String.valueOf(bassin.getStock()));
			addInfoRow(infoTable, "Valeur stock", String.format("%.2f DT", bassin.getPrix() * bassin.getStock()));
			addInfoRow(infoTable, "Statut", bassin.getStatut());
			addInfoRow(infoTable, "Archivé", bassin.isArchive() ? "Oui" : "Non");

			document.add(infoTable);

			// Historique des transactions
			document.add(new Paragraph("HISTORIQUE DES MOUVEMENTS").setFontSize(14).setBold()
					.setFontColor(PRIMARY_COLOR).setMarginBottom(10));

			List<Transaction> transactions = getBassinTransactionsWithDateRange(bassinId, startDate, endDate);
			if (transactions.isEmpty()) {
				document.add(new Paragraph("Aucune transaction dans la période spécifiée").setItalic()
						.setFontColor(SECONDARY_COLOR));
			} else {
				Table transactionTable = new Table(UnitValue.createPercentArray(new float[] { 2, 1, 2, 3, 2 }))
						.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

				// En-têtes
				transactionTable.addHeaderCell(createHeaderCell("Date"));
				transactionTable.addHeaderCell(createHeaderCell("Quantité"));
				transactionTable.addHeaderCell(createHeaderCell("Type"));
				transactionTable.addHeaderCell(createHeaderCell("Raison"));
				transactionTable.addHeaderCell(createHeaderCell("Utilisateur"));

				// Lignes de transactions
				SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");
				boolean alternate = false;
				for (Transaction t : transactions) {
					DeviceRgb bgColor = alternate ? LIGHT_BG_COLOR : new DeviceRgb(255, 255, 255); // ColorConstants.WHITE
																									// as DeviceRgb

					transactionTable.addCell(createCell(dateFormat.format(t.getDateTransaction()), bgColor));

					Cell quantityCell = createCell(String.valueOf(t.getQuantite()), bgColor);
					if (t.getQuantite() > 0) {
						quantityCell.setFontColor(SUCCESS_COLOR);
					} else if (t.getQuantite() < 0) {
						quantityCell.setFontColor(DANGER_COLOR);
					}
					transactionTable.addCell(quantityCell);

					transactionTable.addCell(createCell(t.getTypeOperation(), bgColor));
					transactionTable.addCell(createCell(t.getRaison(), bgColor));

					String userName = "Système";
					if (t.getUserId() != null) {
						try {
							UserDTO user = userServiceClient.getUserByUsername(t.getUserId().toString());
							if (user != null) {
								// Corriger l'accès aux attributs de l'utilisateur
								userName = user.getFirstName() + " " + user.getLastName();
							}
						} catch (Exception e) {
							logger.warn("Impossible de récupérer l'utilisateur: {}", t.getUserId(), e);
						}
					}
					transactionTable.addCell(createCell(userName, bgColor));

					alternate = !alternate;
				}

				document.add(transactionTable);

				// Statistiques des transactions
				int totalEntrees = 0;
				int totalSorties = 0;

				for (Transaction t : transactions) {
					if (t.getQuantite() > 0) {
						totalEntrees += t.getQuantite();
					} else {
						totalSorties += Math.abs(t.getQuantite());
					}
				}

				document.add(new Paragraph("RÉSUMÉ DES MOUVEMENTS").setFontSize(14).setBold()
						.setFontColor(PRIMARY_COLOR).setMarginBottom(10));

				Table statsTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1, 1 }))
						.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

				statsTable.addHeaderCell(createHeaderCell("Total entrées"));
				statsTable.addHeaderCell(createHeaderCell("Total sorties"));
				statsTable.addHeaderCell(createHeaderCell("Balance"));

				Cell entreesCell = createCell(String.valueOf(totalEntrees), new DeviceRgb(255, 255, 255)); // ColorConstants.WHITE
																											// as
																											// DeviceRgb
				entreesCell.setFontColor(SUCCESS_COLOR).setBold();
				statsTable.addCell(entreesCell);

				Cell sortiesCell = createCell(String.valueOf(totalSorties), new DeviceRgb(255, 255, 255)); // ColorConstants.WHITE
																											// as
																											// DeviceRgb
				sortiesCell.setFontColor(DANGER_COLOR).setBold();
				statsTable.addCell(sortiesCell);

				Cell balanceCell = createCell(String.valueOf(totalEntrees - totalSorties),
						new DeviceRgb(255, 255, 255)); // ColorConstants.WHITE as DeviceRgb
				if (totalEntrees > totalSorties) {
					balanceCell.setFontColor(SUCCESS_COLOR);
				} else if (totalEntrees < totalSorties) {
					balanceCell.setFontColor(DANGER_COLOR);
				}
				balanceCell.setBold();
				statsTable.addCell(balanceCell);

				document.add(statsTable);
			}

			addFooter(document);
			document.close();
			return baos.toByteArray();
		} catch (Exception e) {
			logger.error(
					"Erreur lors de la génération du rapport pour le bassin: bassinId={}, startDate={}, endDate={}",
					bassinId, startDate, endDate, e);
			throw new RuntimeException("Erreur lors de la génération du rapport de bassin: " + e.getMessage(), e);
		}
	}

	private Cell createHeaderCell(String text) {
		return new Cell().add(new Paragraph(text).setBold()).setBackgroundColor(SECONDARY_COLOR)
				.setFontColor(new DeviceRgb(255, 255, 255)) // White color
				.setTextAlignment(TextAlignment.CENTER);
	}

	private Cell createCell(String text, DeviceRgb bgColor, TextAlignment alignment) {
		return new Cell().add(new Paragraph(text)).setBackgroundColor(bgColor).setTextAlignment(alignment);
	}

	private void addGlobalStatistics(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie) {
		// Calculate statistics
		long totalBassins = bassinsParCategorie.values().stream().mapToLong(List::size).sum();
		long archived = bassinsParCategorie.values().stream().flatMap(List::stream).filter(Bassin::isArchive).count();
		long active = totalBassins - archived;

		long lowStock = bassinsParCategorie.values().stream().flatMap(List::stream)
				.filter(b -> !b.isArchive() && b.getStock() < 5 && b.getStock() > 0).count();
		long outOfStock = bassinsParCategorie.values().stream().flatMap(List::stream)
				.filter(b -> !b.isArchive() && b.getStock() == 0).count();

		double totalValue = bassinsParCategorie.values().stream().flatMap(List::stream).filter(b -> !b.isArchive())
				.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

		double archivedValue = bassinsParCategorie.values().stream().flatMap(List::stream).filter(Bassin::isArchive)
				.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

		// Add statistics section
		document.add(new Paragraph("STATISTIQUES GLOBALES").setFontSize(14).setBold().setFontColor(PRIMARY_COLOR)
				.setMarginBottom(10));

		// Create stats cards
		Table statsCards = new Table(UnitValue.createPercentArray(new float[] { 1, 1, 1, 1 }))
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

		addStatCard(statsCards, "Catégories", String.valueOf(bassinsParCategorie.size()), null);
		addStatCard(statsCards, "Bassins Actifs", String.valueOf(active), SUCCESS_COLOR);
		addStatCard(statsCards, "Bassins Archivés", String.valueOf(archived), DANGER_COLOR);
		addStatCard(statsCards, "Valeur Active", String.format("%,.2f DT", totalValue), PRIMARY_COLOR);

		document.add(statsCards);

		// Add detailed stats table
		Table statsTable = new Table(UnitValue.createPercentArray(new float[] { 2, 3 }))
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

		statsTable
				.addHeaderCell(new Cell(1, 2).add(new Paragraph("DÉTAILS DU STOCK")).setBackgroundColor(SECONDARY_COLOR)
						.setFontColor(new DeviceRgb(255, 255, 255)).setTextAlignment(TextAlignment.CENTER));

		addStatRow(statsTable, "Total bassins", String.valueOf(totalBassins), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Bassins actifs", String.valueOf(active), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Bassins archivés", String.valueOf(archived), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Stock faible (1-4)", String.valueOf(lowStock), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Rupture de stock", String.valueOf(outOfStock), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Valeur active", String.format("%,.2f DT", totalValue), LIGHT_BG_COLOR);
		addStatRow(statsTable, "Valeur archivée", String.format("%,.2f DT", archivedValue), LIGHT_BG_COLOR);

		document.add(statsTable);
	}

	private void addStatCard(Table table, String title, String value, DeviceRgb valueColor) {
		Cell cell = new Cell();
		cell.setPadding(10);
		cell.setBorder(null);
		cell.setBackgroundColor(LIGHT_BG_COLOR);

		cell.add(new Paragraph(title).setFontSize(10).setFontColor(SECONDARY_COLOR));

		Paragraph valuePara = new Paragraph(value).setFontSize(16).setBold();

		if (valueColor != null) {
			valuePara.setFontColor(valueColor);
		}

		cell.add(valuePara);
		table.addCell(cell);
	}

	private void addStatRow(Table table, String label, String value, DeviceRgb bgColor) {
		table.addCell(new Cell().add(new Paragraph(label).setBold()).setBackgroundColor(bgColor)
				.setTextAlignment(TextAlignment.RIGHT));
		table.addCell(
				new Cell().add(new Paragraph(value)).setBackgroundColor(bgColor).setTextAlignment(TextAlignment.LEFT));
	}

	private Cell createCell(String text, DeviceRgb bgColor) {
		return new Cell().add(new Paragraph(text)).setBackgroundColor(bgColor).setTextAlignment(TextAlignment.CENTER);
	}

	private void addInfoRow(Table table, String label, String value) {
		table.addCell(new Cell().add(new Paragraph(label).setBold()).setBackgroundColor(LIGHT_BG_COLOR)
				.setTextAlignment(TextAlignment.RIGHT));
		table.addCell(new Cell().add(new Paragraph(value)).setTextAlignment(TextAlignment.LEFT));
	}

	private void addDetailedInventory(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie,
			boolean showArchived, Date startDate, Date endDate) {
		document.add(new Paragraph("INVENTAIRE DÉTAILLÉ PAR CATÉGORIE").setFontSize(14).setBold()
				.setFontColor(PRIMARY_COLOR).setMarginBottom(10));

		for (Map.Entry<Categorie, List<Bassin>> entry : bassinsParCategorie.entrySet()) {
			Categorie categorie = entry.getKey();
			List<Bassin> bassins = entry.getValue();

			// Ignorer les catégories vides (peut arriver avec les bassins non-classés)
			if (bassins.isEmpty())
				continue;

			String nomCategorie = categorie.getIdCategorie() != null ? categorie.getNomCategorie()
					: "Bassins Non Classés";

			document.add(new Paragraph(nomCategorie).setFontSize(12).setBold().setFontColor(SECONDARY_COLOR)
					.setMarginTop(15).setMarginBottom(5));

			Table table = new Table(UnitValue.createPercentArray(new float[] { 1, 3, 1, 1, 1, 1, 1 }))
					.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(15);

			// Entêtes
			table.addHeaderCell(createHeaderCell("ID"));
			table.addHeaderCell(createHeaderCell("Nom"));
			table.addHeaderCell(createHeaderCell("Dimensions"));
			table.addHeaderCell(createHeaderCell("Prix Unit."));
			table.addHeaderCell(createHeaderCell("Stock"));
			table.addHeaderCell(createHeaderCell("Valeur"));
			table.addHeaderCell(createHeaderCell("Statut"));

			// Données
			boolean alternate = false;
			for (Bassin bassin : bassins) {
				DeviceRgb bgColor = alternate ? LIGHT_BG_COLOR : new DeviceRgb(255, 255, 255);

				// Appliquer une couleur différente pour les bassins archivés
				if (bassin.isArchive()) {
					bgColor = new DeviceRgb(245, 245, 245); // Gris très clair
				}

				table.addCell(createCell(bassin.getIdBassin().toString(), bgColor, TextAlignment.CENTER));
				table.addCell(createCell(bassin.getNomBassin(), bgColor, TextAlignment.LEFT));
				table.addCell(createCell(bassin.getDimensions(), bgColor, TextAlignment.CENTER));
				table.addCell(createCell(String.format("%.2f DT", bassin.getPrix()), bgColor, TextAlignment.RIGHT));

				// Stock avec couleur selon niveau
				Cell stockCell = createCell(String.valueOf(bassin.getStock()), bgColor, TextAlignment.CENTER);
				if (bassin.getStock() == 0) {
					stockCell.setFontColor(DANGER_COLOR);
				} else if (bassin.getStock() < 5) {
					stockCell.setFontColor(WARNING_COLOR);
				}
				table.addCell(stockCell);

				table.addCell(createCell(String.format("%.2f DT", bassin.getPrix() * bassin.getStock()), bgColor,
						TextAlignment.RIGHT));

				// Statut avec mise en forme
				String statut = bassin.getStatut();
				if (bassin.isSurCommande()) {
					statut = "SUR_COMMANDE";
				}

				Cell statutCell = createCell(statut, bgColor, TextAlignment.CENTER);
				if ("SUR_COMMANDE".equals(statut)) {
					statutCell.setFontColor(WARNING_COLOR);
				} else if (bassin.isArchive()) {
					statutCell.setFontColor(SECONDARY_COLOR);
				} else {
					statutCell.setFontColor(SUCCESS_COLOR);
				}
				table.addCell(statutCell);

				alternate = !alternate;
			}

			document.add(table);

			// Statistiques de la catégorie
			int totalStock = bassins.stream().filter(b -> !b.isArchive()).mapToInt(Bassin::getStock).sum();
			double totalValue = bassins.stream().filter(b -> !b.isArchive())
					.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

			document.add(new Paragraph(String.format("Total pour '%s': %d bassins, %d en stock, valeur: %.2f DT",
					nomCategorie, bassins.size(), totalStock, totalValue)).setFontSize(10).setItalic()
					.setMarginBottom(20));
		}
	}

	private void addReportHeader(Document document, String title, String subtitle) {
		document.add(new Paragraph(title).setFontSize(18).setBold().setFontColor(PRIMARY_COLOR)
				.setTextAlignment(TextAlignment.CENTER));

		document.add(new Paragraph(subtitle).setFontSize(12).setItalic().setFontColor(SECONDARY_COLOR)
				.setTextAlignment(TextAlignment.CENTER).setMarginBottom(20));

		document.add(new Paragraph("Généré le " + formatDateLong(new Date())).setFontSize(10)
				.setTextAlignment(TextAlignment.RIGHT).setMarginBottom(20));
	}

	private void addReportHeader(Document document, String title, String subtitle, Date startDate, Date endDate) {
		document.add(new Paragraph(title).setFontSize(18).setBold().setFontColor(PRIMARY_COLOR)
				.setTextAlignment(TextAlignment.CENTER));

		document.add(new Paragraph(subtitle).setFontSize(12).setItalic().setFontColor(SECONDARY_COLOR)
				.setTextAlignment(TextAlignment.CENTER));

		// Ajouter la période couverte
		String periodInfo = "Période couverte: ";
		if (startDate != null && endDate != null) {
			periodInfo += formatDateShort(startDate) + " au " + formatDateShort(endDate);
		} else {
			periodInfo += "3 derniers mois";
		}

		document.add(
				new Paragraph(periodInfo).setFontSize(10).setTextAlignment(TextAlignment.CENTER).setMarginBottom(10));

		document.add(new Paragraph("Généré le " + formatDateLong(new Date())).setFontSize(10)
				.setTextAlignment(TextAlignment.RIGHT).setMarginBottom(20));
	}

	private void addFooter(Document document) {
		document.add(new Paragraph("© " + java.time.Year.now().getValue() + " - Système de Gestion des Bassins")
				.setFontSize(8).setFontColor(SECONDARY_COLOR).setTextAlignment(TextAlignment.CENTER).setMarginTop(20));
	}

	@Override
	public byte[] generateGlobalStockReport(Date startDate, Date endDate) {
		try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
			PdfWriter writer = new PdfWriter(baos);
			writer.setCompressionLevel(9);

			PdfDocument pdfDoc = new PdfDocument(writer);
			pdfDoc.setDefaultPageSize(PageSize.A4.rotate());

			Document document = new Document(pdfDoc);
			document.setMargins(36, 36, 36, 36);

			// Titre avec période si spécifiée
			String subtitle = "(Inclut toutes les transactions)";
			if (startDate != null && endDate != null) {
				subtitle += " | Période: " + formatDateShort(startDate) + " à " + formatDateShort(endDate);
			} else if (startDate != null) {
				subtitle += " | Depuis: " + formatDateShort(startDate);
			} else if (endDate != null) {
				subtitle += " | Jusqu'à: " + formatDateShort(endDate);
			}

			addReportHeader(document, "RAPPORT COMPLET DE STOCK ET TRANSACTIONS", subtitle);

			// Organiser les bassins par catégorie
			Map<Categorie, List<Bassin>> bassinsParCategorie = organizeBassinsByCategory(null, true);

			if (bassinsParCategorie.isEmpty()) {
				document.add(new Paragraph("Aucun bassin trouvé").setItalic().setFontColor(SECONDARY_COLOR));
				addFooter(document);
				document.close();
				return baos.toByteArray();
			}

			// Statistiques globales
			addGlobalStatistics(document, bassinsParCategorie);

			// Détails du stock
			addDetailedInventory(document, bassinsParCategorie, true);

			// Section des transactions
			addAllTransactionsSection(document, startDate, endDate);

			addFooter(document);
			document.close();
			return baos.toByteArray();
		} catch (Exception e) {
			logger.error("Erreur lors de la génération du rapport global", e);
			throw new RuntimeException("Erreur lors de la génération du rapport global", e);
		}
	}

	private void addAllTransactionsSection(Document document, Date startDate, Date endDate) {
		document.add(new Paragraph("HISTORIQUE COMPLET DES TRANSACTIONS").setFontSize(14).setBold()
				.setFontColor(PRIMARY_COLOR).setMarginTop(20).setMarginBottom(10));

		// Récupérer toutes les transactions dans la période
		List<Transaction> transactions;
		if (startDate != null && endDate != null) {
			transactions = transactionRepository.findByDateTransactionBetweenOrderByDateTransactionDesc(startDate,
					endDate);
		} else if (startDate != null) {
			transactions = transactionRepository.findByDateTransactionAfterOrderByDateTransactionDesc(startDate);
		} else if (endDate != null) {
			transactions = transactionRepository.findByDateTransactionBeforeOrderByDateTransactionDesc(endDate);
		} else {
			transactions = transactionRepository.findAllByOrderByDateTransactionDesc();
		}

		if (transactions.isEmpty()) {
			document.add(new Paragraph("Aucune transaction trouvée").setItalic().setFontColor(SECONDARY_COLOR));
			return;
		}

		// Tableau des transactions
		Table transactionTable = new Table(UnitValue.createPercentArray(new float[] { 2, 2, 3, 2, 2, 3, 2 }))
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

		// En-têtes
		transactionTable.addHeaderCell(createHeaderCell("Date"));
		transactionTable.addHeaderCell(createHeaderCell("Bassin"));
		transactionTable.addHeaderCell(createHeaderCell("Description"));
		transactionTable.addHeaderCell(createHeaderCell("Type"));
		transactionTable.addHeaderCell(createHeaderCell("Quantité"));
		transactionTable.addHeaderCell(createHeaderCell("Raison"));
		transactionTable.addHeaderCell(createHeaderCell("Utilisateur"));

		// Format de date
		SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");

		// Remplir le tableau
		boolean alternate = false;
		for (Transaction t : transactions) {
			DeviceRgb bgColor = alternate ? LIGHT_BG_COLOR : new DeviceRgb(255, 255, 255);

			// Date
			transactionTable.addCell(createCell(dateFormat.format(t.getDateTransaction()), bgColor));

			// Nom du bassin
			String bassinName = "Bassin inconnu";
			if (t.getBassin() != null) {
				bassinName = t.getBassin().getNomBassin() + " (ID: " + t.getBassin().getIdBassin() + ")";
			}
			transactionTable.addCell(createCell(bassinName, bgColor));

			// Détails produit
			String details = t.getDetailsProduit() != null ? t.getDetailsProduit() : "";
			transactionTable.addCell(createCell(details, bgColor));

			// Type d'opération
			transactionTable.addCell(createCell(t.getTypeOperation(), bgColor));

			// Quantité avec couleur
			Cell quantityCell = createCell(String.valueOf(t.getQuantite()), bgColor);
			if (t.getQuantite() > 0) {
				quantityCell.setFontColor(SUCCESS_COLOR);
			} else if (t.getQuantite() < 0) {
				quantityCell.setFontColor(DANGER_COLOR);
			}
			transactionTable.addCell(quantityCell);

			// Raison
			transactionTable.addCell(createCell(t.getRaison(), bgColor));

			// Utilisateur
			String userName = "Système";
			if (t.getUserId() != null) {
				try {
					UserDTO user = userServiceClient.getUserById(t.getUserId());
					if (user != null) {
						userName = user.getFirstName() + " " + user.getLastName();
					}
				} catch (Exception e) {
					logger.warn("Impossible de récupérer l'utilisateur: {}", t.getUserId(), e);
				}
			}
			transactionTable.addCell(createCell(userName, bgColor));

			alternate = !alternate;
		}

		document.add(transactionTable);

		// Statistiques des transactions
		addTransactionStatistics(document, transactions);
	}

	private void addTransactionStatistics(Document document, List<Transaction> transactions) {
		document.add(new Paragraph("STATISTIQUES DES TRANSACTIONS").setFontSize(14).setBold()
				.setFontColor(PRIMARY_COLOR).setMarginTop(20).setMarginBottom(10));

		// Calculer les totaux
		int totalEntrees = 0;
		int totalSorties = 0;
		double totalValeur = 0;

		for (Transaction t : transactions) {
			if (t.getBassin() != null) {
				double prixUnitaire = t.getBassin().getPrix();
				if (t.getQuantite() > 0) {
					totalEntrees += t.getQuantite();
					totalValeur += t.getQuantite() * prixUnitaire;
				} else {
					totalSorties += Math.abs(t.getQuantite());
					totalValeur -= Math.abs(t.getQuantite()) * prixUnitaire;
				}
			}
		}

		// Tableau des statistiques
		Table statsTable = new Table(UnitValue.createPercentArray(new float[] { 2, 2, 2, 2 }))
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

		// En-têtes
		statsTable.addHeaderCell(createHeaderCell("Total Entrées"));
		statsTable.addHeaderCell(createHeaderCell("Total Sorties"));
		statsTable.addHeaderCell(createHeaderCell("Balance"));
		statsTable.addHeaderCell(createHeaderCell("Valeur Totale"));

		// Données
		Cell entreesCell = createCell(String.valueOf(totalEntrees), new DeviceRgb(255, 255, 255));
		entreesCell.setFontColor(SUCCESS_COLOR).setBold();
		statsTable.addCell(entreesCell);

		Cell sortiesCell = createCell(String.valueOf(totalSorties), new DeviceRgb(255, 255, 255));
		sortiesCell.setFontColor(DANGER_COLOR).setBold();
		statsTable.addCell(sortiesCell);

		int balance = totalEntrees - totalSorties;
		Cell balanceCell = createCell(String.valueOf(balance), new DeviceRgb(255, 255, 255));
		balanceCell.setFontColor(balance >= 0 ? SUCCESS_COLOR : DANGER_COLOR).setBold();
		statsTable.addCell(balanceCell);

		statsTable.addCell(createCell(String.format("%,.2f DT", totalValeur), new DeviceRgb(255, 255, 255))
				.setTextAlignment(TextAlignment.RIGHT).setBold());

		document.add(statsTable);
	}

	@Override
	public byte[] generateTransactionReport(Long bassinId, Date startDate, Date endDate) {
		// TODO Auto-generated method stub
		return null;
	}

	/***************************************************/

	@Override
	public byte[] generateStockReport(Long categorieId, boolean showArchived, Date startDate, Date endDate) {
		try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
			PdfWriter writer = new PdfWriter(baos);
			writer.setCompressionLevel(9);

			PdfDocument pdfDoc = new PdfDocument(writer);
			pdfDoc.setDefaultPageSize(PageSize.A4.rotate());

			Document document = new Document(pdfDoc);
			document.setMargins(36, 36, 36, 36);

			// En-tête avec logo et informations
			addProfessionalHeader(document);

			// Titre principal avec deux lignes
			addMainTitle(document, "RAPPORT DE STOCK COMPLET",
					"Analyse détaillée des niveaux de stock et des mouvements");

			// Sous-titre avec période
			String subtitle = showArchived ? "(Inclut les bassins archivés)" : "(Bassins actifs seulement)";
			if (startDate != null && endDate != null) {
				subtitle += " | Période: " + formatDateShort(startDate) + " à " + formatDateShort(endDate);
			}
			addSubtitle(document, subtitle);

			// Organiser les bassins par catégorie
			Map<Categorie, List<Bassin>> bassinsParCategorie = organizeBassinsByCategory(categorieId, showArchived);

			if (bassinsParCategorie.isEmpty()) {
				document.add(new Paragraph("Aucun bassin trouvé pour les critères spécifiés").setItalic()
						.setFontColor(SECONDARY_COLOR));
				addProfessionalFooter(document);
				document.close();
				return baos.toByteArray();
			}

			// Section de résumé exécutif
			addExecutiveSummary(document, bassinsParCategorie);

			// Statistiques globales avec design amélioré
			addEnhancedGlobalStatistics(document, bassinsParCategorie);

			// Détails du stock avec tableau professionnel
			addProfessionalInventoryTable(document, bassinsParCategorie, showArchived);

			// Section des détails des transactions
			document.add(new Paragraph("DÉTAIL DES TRANSACTIONS").setFontSize(14).setBold().setFontColor(PRIMARY_COLOR)
					.setMarginTop(20).setMarginBottom(10));

			// Récupérer toutes les transactions pour les bassins dans la période
			List<Transaction> allTransactions = new ArrayList<>();
			for (List<Bassin> bassins : bassinsParCategorie.values()) {
				for (Bassin bassin : bassins) {
					allTransactions
							.addAll(getBassinTransactionsWithDateRange(bassin.getIdBassin(), startDate, endDate));
				}
			}

			if (allTransactions.isEmpty()) {
				document.add(new Paragraph("Aucune transaction trouvée pour la période spécifiée").setItalic()
						.setFontColor(SECONDARY_COLOR).setMarginBottom(20));
			} else {
				// Créer le tableau des transactions
				Table detailTable = new Table(UnitValue.createPercentArray(new float[] { 2, 3, 2, 2, 3 }))
						.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20);

				// En-têtes
				detailTable.addHeaderCell(createModernHeaderCell("Date"));
				detailTable.addHeaderCell(createModernHeaderCell("Bassin"));
				detailTable.addHeaderCell(createModernHeaderCell("Type"));
				detailTable.addHeaderCell(createModernHeaderCell("Quantité"));
				detailTable.addHeaderCell(createModernHeaderCell("Raison"));

				// Format de date
				SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");
				boolean alternate = false;

				// Remplir le tableau
				for (Transaction t : allTransactions) {
					DeviceRgb bgColor = alternate ? LIGHT_BG_COLOR : WHITE_COLOR;

					detailTable.addCell(
							createStyledCell(dateFormat.format(t.getDateTransaction()), bgColor, TextAlignment.CENTER));

					String bassinName = t.getBassin() != null ? t.getBassin().getNomBassin() : "Bassin inconnu";
					detailTable.addCell(createStyledCell(bassinName, bgColor, TextAlignment.LEFT));

					detailTable.addCell(createStyledCell(t.getTypeOperation(), bgColor, TextAlignment.CENTER));

					Cell qtyCell = createStyledCell(String.valueOf(t.getQuantite()), bgColor, TextAlignment.CENTER);
					if (t.getQuantite() > 0) {
						qtyCell.setFontColor(SUCCESS_COLOR);
					} else {
						qtyCell.setFontColor(DANGER_COLOR);
					}
					detailTable.addCell(qtyCell);

					detailTable.addCell(createStyledCell(t.getRaison(), bgColor, TextAlignment.LEFT));

					alternate = !alternate;
				}

				document.add(detailTable);
			}

			// Pied de page professionnel
			addProfessionalFooter(document);

			document.close();
			return baos.toByteArray();
		} catch (Exception e) {
			logger.error("Erreur lors de la génération du rapport", e);
			throw new RuntimeException("Erreur lors de la génération du rapport de stock", e);
		}
	}

	/**
	 * Ajoute un en-tête professionnel au document avec un espacement amélioré et
	 * une mise en page équilibrée.
	 * 
	 * @param document Le document PDF auquel ajouter l'en-tête
	 * @throws IOException En cas d'erreur lors du traitement des fichiers
	 */
	private void addProfessionalHeader(Document document) throws IOException {
		// Création d'une table avec 3 colonnes pour un alignement optimal
		Table headerTable = new Table(new float[] { 1f, 3f, 1f }) // Ratio proportionnel plus naturel
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20) // Plus d'espace sous l'en-tête
				.setHorizontalAlignment(HorizontalAlignment.CENTER);

		// ---- COLONNE 1: LOGO ----
		try {
			InputStream logoStream = getClass().getClassLoader().getResourceAsStream("icon.png");
			if (logoStream != null) {
				Image logo = new Image(ImageDataFactory.create(logoStream.readAllBytes())).setWidth(70) // Légèrement
																										// plus grand
																										// pour
																										// meilleure
																										// visibilité
						.setHeight(70).setHorizontalAlignment(HorizontalAlignment.LEFT);

				Cell logoCell = new Cell().add(logo).setBorder(Border.NO_BORDER)
						.setVerticalAlignment(VerticalAlignment.MIDDLE).setPaddingLeft(15) // Plus d'espace à gauche
						.setPaddingRight(10).setPaddingTop(10).setPaddingBottom(10);

				headerTable.addCell(logoCell);
			} else {
				headerTable.addCell(new Cell().setBorder(Border.NO_BORDER));
			}
		} catch (Exception e) {
			logger.error("Erreur lors du chargement du logo", e);
			headerTable.addCell(new Cell().setBorder(Border.NO_BORDER));
		}

		// ---- COLONNE 2: INFORMATIONS DE L'ENTREPRISE ----
		Paragraph companyTitle = new Paragraph("AQUATRESOR").setBold().setFontSize(22) // Titre plus grand
				.setFontColor(PRIMARY_COLOR).setTextAlignment(TextAlignment.CENTER);

		Paragraph companyAddress = new Paragraph("8050 Hammamet, Nabeul").setFontSize(11).setFontColor(SECONDARY_COLOR)
				.setTextAlignment(TextAlignment.CENTER);

		Paragraph companyContact = new Paragraph("Tél: +216 25 345 678 • Email: contact@aquatresor.com").setFontSize(10)
				.setFontColor(SECONDARY_COLOR).setTextAlignment(TextAlignment.CENTER);

		Cell infoCell = new Cell().add(companyTitle).add(new Paragraph().setMarginBottom(8)) // Espace après le titre
				.add(companyAddress).add(new Paragraph().setMarginBottom(4)) // Espace après l'adresse
				.add(companyContact).setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE)
				.setPaddingTop(10).setPaddingBottom(10);

		headerTable.addCell(infoCell);

		// ---- COLONNE 3: DATE ----
		Paragraph dateLabel = new Paragraph("Généré le").setFontSize(9).setFontColor(SECONDARY_COLOR)
				.setTextAlignment(TextAlignment.RIGHT);

		Paragraph dateValue = new Paragraph(formatDateLong(new Date())).setFontSize(11).setBold()
				.setFontColor(PRIMARY_COLOR).setTextAlignment(TextAlignment.RIGHT);

		Cell dateCell = new Cell().add(dateLabel).add(new Paragraph().setMarginBottom(3)) // Espace entre label et
																							// valeur
				.add(dateValue).setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE)
				.setHorizontalAlignment(HorizontalAlignment.RIGHT).setPaddingRight(15) // Plus d'espace à droite
				.setPaddingTop(10).setPaddingBottom(10);

		headerTable.addCell(dateCell);

		// Ajout de la table d'en-tête au document
		document.add(headerTable);

		// Ligne de séparation stylisée plus épaisse et avec plus d'espace autour
		document.add(new Paragraph().setMarginBottom(5)); // Espace avant la ligne
		addDividerLine(document, PRIMARY_COLOR, 1.5f); // Ligne légèrement plus épaisse
		document.add(new Paragraph().setMarginBottom(15)); // Plus d'espace après la ligne
	}

// Méthode pour la ligne de séparation
	private void addDividerLine(Document document, Color color, float thickness) {
		SolidLine line = new SolidLine(thickness);
		line.setColor(color);
		document.add(new LineSeparator(line).setMarginTop(5).setMarginBottom(5));
	}

	private void addMainTitle(Document document, String title1, String title2) {
		document.add(new Paragraph(title1).setFontSize(18).setBold().setFontColor(PRIMARY_COLOR)
				.setTextAlignment(TextAlignment.CENTER).setMarginBottom(5));

		document.add(new Paragraph(title2).setFontSize(14).setFontColor(SECONDARY_COLOR)
				.setTextAlignment(TextAlignment.CENTER).setMarginBottom(15));
	}

	private void addSubtitle(Document document, String subtitle) {
		document.add(new Paragraph(subtitle).setFontSize(11).setItalic().setFontColor(ACCENT_COLOR)
				.setTextAlignment(TextAlignment.CENTER).setMarginBottom(20));
	}

	private void addDividerLine(Document document, DeviceRgb color, float width) {
		SolidLine line = new SolidLine(width);
		line.setColor(color);
		document.add(new LineSeparator(line).setMarginTop(5).setMarginBottom(15));
	}

	private void addExecutiveSummary(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie) {
		long totalBassins = bassinsParCategorie.values().stream().mapToLong(List::size).sum();
		long archived = bassinsParCategorie.values().stream().flatMap(List::stream).filter(Bassin::isArchive).count();
		long active = totalBassins - archived;
		double totalValue = bassinsParCategorie.values().stream().flatMap(List::stream).filter(b -> !b.isArchive())
				.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

		document.add(new Paragraph("RÉSUMÉ EXÉCUTIF").setFontSize(14).setBold().setFontColor(PRIMARY_COLOR)
				.setMarginBottom(10));

		Table summaryContainer = new Table(1).setWidth(UnitValue.createPercentValue(100))
				.setBackgroundColor(HEADER_BG_COLOR).setBorder(new SolidBorder(BORDER_COLOR, 1)).setMarginBottom(20);

		String summaryText = String.format("Ce rapport présente une analyse complète du stock actuel. "
				+ "Le système compte actuellement %d bassins actifs et %d bassins archivés, "
				+ "représentant une valeur totale de stock de %,.2f DT.", active, archived, totalValue);

		summaryContainer.addCell(new Cell().add(new Paragraph(summaryText)).setPadding(10).setBorder(Border.NO_BORDER));

		document.add(summaryContainer);
	}

	private void addEnhancedGlobalStatistics(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie) {
		// Calculate statistics
		long totalBassins = bassinsParCategorie.values().stream().mapToLong(List::size).sum();
		long archived = bassinsParCategorie.values().stream().flatMap(List::stream).filter(Bassin::isArchive).count();
		long active = totalBassins - archived;
		long lowStock = bassinsParCategorie.values().stream().flatMap(List::stream)
				.filter(b -> !b.isArchive() && b.getStock() < 5 && b.getStock() > 0).count();
		long outOfStock = bassinsParCategorie.values().stream().flatMap(List::stream)
				.filter(b -> !b.isArchive() && b.getStock() == 0).count();
		double totalValue = bassinsParCategorie.values().stream().flatMap(List::stream).filter(b -> !b.isArchive())
				.mapToDouble(b -> b.getPrix() * b.getStock()).sum();
		double archivedValue = bassinsParCategorie.values().stream().flatMap(List::stream).filter(Bassin::isArchive)
				.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

		// Add section title
		document.add(new Paragraph("INDICATEURS CLÉS").setFontSize(14).setBold().setFontColor(PRIMARY_COLOR)
				.setTextAlignment(TextAlignment.CENTER).setMarginBottom(15));

		// Create table with professional styling (3 columns: Indicateur, Quantité,
		// Valeur)
		Table statsTable = new Table(UnitValue.createPercentArray(new float[] { 3, 2, 2 }))
				.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(20)
				.setBorder(new SolidBorder(BORDER_COLOR, 1)).setBackgroundColor(WHITE_COLOR);

		// Add header cells with enhanced styling
		statsTable.addHeaderCell(createModernHeaderCell("Indicateur").setBackgroundColor(PRIMARY_COLOR)
				.setFontColor(ColorConstants.WHITE).setPadding(10));
		statsTable.addHeaderCell(createModernHeaderCell("Quantité").setBackgroundColor(PRIMARY_COLOR)
				.setFontColor(ColorConstants.WHITE).setPadding(10));
		statsTable.addHeaderCell(createModernHeaderCell("Valeur").setBackgroundColor(PRIMARY_COLOR)
				.setFontColor(ColorConstants.WHITE).setPadding(10));

		// Add data rows with consistent styling
		addStatRow(statsTable, "Bassins Actifs", String.valueOf(active), String.format("%,.2f DT", totalValue));
		addStatRow(statsTable, "Stock Faible (1-4 unités)", String.valueOf(lowStock), "-");
		addStatRow(statsTable, "Bassins Archivés", String.valueOf(archived), String.format("%,.2f DT", archivedValue));

		document.add(statsTable);
	}

	private void addStatRow(Table table, String label, String quantity, String value) {
		// Indicateur (Label)
		table.addCell(new Cell().add(new Paragraph(label).setBold()).setBackgroundColor(LIGHT_BG_COLOR)
				.setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(8).setTextAlignment(TextAlignment.LEFT));

		// Quantité
		table.addCell(new Cell().add(new Paragraph(quantity).setBold()).setBackgroundColor(LIGHT_BG_COLOR)
				.setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(8).setTextAlignment(TextAlignment.CENTER));

		// Valeur
		table.addCell(new Cell().add(new Paragraph(value)).setBackgroundColor(LIGHT_BG_COLOR)
				.setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
	}

	private void addStatRow(Table table, String label, String quantity, String value, String status,
			DeviceRgb statusColor) {
		// Indicateur (Label)
		table.addCell(new Cell().add(new Paragraph(label).setBold()).setBackgroundColor(LIGHT_BG_COLOR)
				.setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(8).setTextAlignment(TextAlignment.LEFT));

		// Quantité
		table.addCell(new Cell().add(new Paragraph(quantity).setBold()).setBackgroundColor(LIGHT_BG_COLOR)
				.setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(8).setTextAlignment(TextAlignment.CENTER));

		// Valeur
		table.addCell(new Cell().add(new Paragraph(value)).setBackgroundColor(LIGHT_BG_COLOR)
				.setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));

		// Statut
		table.addCell(new Cell().add(new Paragraph(status).setFontColor(statusColor).setBold())
				.setBackgroundColor(LIGHT_BG_COLOR).setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(8)
				.setTextAlignment(TextAlignment.CENTER));
	}

	private Cell createModernHeaderCell(String text) {
		return new Cell().add(new Paragraph(text).setBold().setFontSize(11)).setTextAlignment(TextAlignment.CENTER)
				.setVerticalAlignment(VerticalAlignment.MIDDLE).setBorder(new SolidBorder(BORDER_COLOR, 1))
				.setPadding(8);
	}

	private void addProfessionalInventoryTable(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie,
			boolean showArchived) {
		document.add(new Paragraph("DÉTAIL DU STOCK PAR CATÉGORIE").setFontSize(14).setBold()
				.setFontColor(PRIMARY_COLOR).setMarginBottom(15));

		for (Categorie categorie : bassinsParCategorie.keySet()) {
			List<Bassin> bassins = bassinsParCategorie.get(categorie);

			if (bassins.isEmpty())
				continue;

			String nomCategorie = categorie != null ? categorie.getNomCategorie() : "Bassins Non Classés";

			document.add(
					new Paragraph(nomCategorie.toUpperCase()).setFontSize(12).setBold().setFontColor(SECONDARY_COLOR)
							.setBackgroundColor(HEADER_BG_COLOR).setPaddingLeft(10).setPaddingTop(5).setPaddingBottom(5)
							.setMarginBottom(5).setBorder(new SolidBorder(BORDER_COLOR, 1)));

			Table table = new Table(UnitValue.createPercentArray(new float[] { 1, 3, 1, 1, 1, 1, 1 }))
					.setWidth(UnitValue.createPercentValue(100)).setMarginBottom(15);

			table.addHeaderCell(createModernHeaderCell("ID"));
			table.addHeaderCell(createModernHeaderCell("Nom"));
			table.addHeaderCell(createModernHeaderCell("Dimensions"));
			table.addHeaderCell(createModernHeaderCell("Prix Unit."));
			table.addHeaderCell(createModernHeaderCell("Stock"));
			table.addHeaderCell(createModernHeaderCell("Valeur"));
			table.addHeaderCell(createModernHeaderCell("Statut"));

			boolean alternate = false;
			for (Bassin bassin : bassins) {
				DeviceRgb bgColor = alternate ? LIGHT_BG_COLOR : WHITE_COLOR;
				if (bassin.isArchive()) {
					bgColor = new DeviceRgb(250, 250, 250);
				}

				table.addCell(createStyledCell(bassin.getIdBassin().toString(), bgColor, TextAlignment.CENTER));

				Paragraph namePara = new Paragraph(bassin.getNomBassin());
				if (bassin.isArchive()) {
					namePara.setItalic().setFontColor(SECONDARY_COLOR);
				}
				table.addCell(new Cell().add(namePara).setBackgroundColor(bgColor)
						.setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(5));

				table.addCell(createStyledCell(bassin.getDimensions(), bgColor, TextAlignment.CENTER));

				table.addCell(
						createStyledCell(String.format("%.2f DT", bassin.getPrix()), bgColor, TextAlignment.RIGHT));

				Cell stockCell = createStyledCell(String.valueOf(bassin.getStock()), bgColor, TextAlignment.CENTER);
				if (bassin.getStock() == 0) {
					stockCell.setFontColor(DANGER_COLOR).setBold();
				} else if (bassin.getStock() < 5) {
					stockCell.setFontColor(WARNING_COLOR);
				}
				table.addCell(stockCell);

				table.addCell(createStyledCell(String.format("%.2f DT", bassin.getPrix() * bassin.getStock()), bgColor,
						TextAlignment.RIGHT));

				String statut = bassin.getStatut();
				if (bassin.isSurCommande()) {
					statut = "SUR COMMANDE";
				}
				Cell statutCell = createStyledCell(statut, bgColor, TextAlignment.CENTER);
				if ("SUR COMMANDE".equals(statut)) {
					statutCell.setFontColor(WARNING_COLOR);
				} else if (bassin.isArchive()) {
					statutCell.setFontColor(SECONDARY_COLOR);
				} else {
					statutCell.setFontColor(SUCCESS_COLOR);
				}
				table.addCell(statutCell);

				alternate = !alternate;
			}

			document.add(table);

			int totalStock = bassins.stream().filter(b -> !b.isArchive()).mapToInt(Bassin::getStock).sum();
			double totalValue = bassins.stream().filter(b -> !b.isArchive())
					.mapToDouble(b -> b.getPrix() * b.getStock()).sum();

			Paragraph totalPara = new Paragraph()
					.add(new Text(String.format("Total %s: ", nomCategorie)).setFontColor(SECONDARY_COLOR))
					.add(new Text(String.format("%d bassins, %d en stock, valeur: %.2f DT", bassins.size(), totalStock,
							totalValue)).setBold())
					.setTextAlignment(TextAlignment.RIGHT).setMarginBottom(20).setFontSize(10);

			document.add(totalPara);
		}
	}

	private void addProfessionalFooter(Document document) {
		addDividerLine(document, PRIMARY_COLOR, 0.5f);

		Table footerTable = new Table(new float[] { 1, 1, 1 }).setWidth(UnitValue.createPercentValue(100))
				.setMarginTop(10);

		footerTable.addCell(new Cell()
				.add(new Paragraph("Généré automatiquement par le système").setFontSize(8)
						.setFontColor(SECONDARY_COLOR))
				.setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.LEFT));

		footerTable.addCell(new Cell()
				.add(new Paragraph(String.format("© AquaTresor", java.time.Year.now().getValue())).setFontSize(8)
						.setFontColor(SECONDARY_COLOR))
				.setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.CENTER));

		footerTable.addCell(new Cell().add(new Paragraph("Page 1/1").setFontSize(8).setFontColor(SECONDARY_COLOR))
				.setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT));

		document.add(footerTable);
	}

	private Cell createStyledCell(String text, DeviceRgb bgColor, TextAlignment alignment) {
		return new Cell().add(new Paragraph(text)).setBackgroundColor(bgColor).setTextAlignment(alignment)
				.setBorder(new SolidBorder(BORDER_COLOR, 1)).setPadding(5);
	}

	private String formatDateShort(Date date) {
		return new SimpleDateFormat("dd/MM/yyyy").format(date);
	}

	private String formatDateLong(Date date) {
		return new SimpleDateFormat("dd MMMM yyyy à HH:mm:ss").format(date);
	}

	private Map<Categorie, List<Bassin>> organizeBassinsByCategory(Long categorieId, boolean showArchived) {
		List<Bassin> bassins;

		if (categorieId != null) {
			if (showArchived) {
				bassins = bassinRepository.findByCategorieIdCategorie(categorieId);
			} else {
				bassins = bassinRepository.findByCategorieIdCategorieAndArchiveFalse(categorieId);
			}
		} else {
			bassins = showArchived ? bassinRepository.findAll() : bassinRepository.findByArchiveFalse();
		}

		Map<Categorie, List<Bassin>> bassinsParCategorie = new LinkedHashMap<>();
		Categorie nonClasses = new Categorie();
		nonClasses.setNomCategorie("Bassins Non Classés");

		for (Bassin bassin : bassins) {
			Categorie categorie = bassin.getCategorie();
			if (categorie == null) {
				bassinsParCategorie.computeIfAbsent(nonClasses, k -> new ArrayList<>()).add(bassin);
			} else {
				bassinsParCategorie.computeIfAbsent(categorie, k -> new ArrayList<>()).add(bassin);
			}
		}

		return bassinsParCategorie;
	}

}