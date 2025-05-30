package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.AccessoireDTO;
import com.example.gestionbassins.entities.Accessoire;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.BassinPersonnalise;
import com.example.gestionbassins.repos.AccessoireRepository;
import com.example.gestionbassins.repos.BassinPersonnaliseRepository;
import com.example.gestionbassins.repos.BassinRepository;

import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileSystemException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BassinPersonnaliseServiceImpl implements BassinPersonnaliseService{ 

    @Autowired
    private BassinPersonnaliseRepository bassinPersonnaliseRepository;

    @Autowired
    private BassinRepository bassinRepository; // Ajout du repository pour Bassin
    
    @Autowired
    private AccessoireRepository accessoireRepository;
    
    @Autowired
    private FileStorageService fileStorageService;

    private final String UPLOAD_DIR = "C:/shared/imagesaccessoiresbassin/";

    public BassinPersonnalise ajouterBassinPersonnalise(
            Long idBassin, // ID du bassin à personnaliser
            List<String> materiaux, // Liste des matériaux personnalisés
            List<String> dimensions, // Liste des dimensions personnalisées
            List<Accessoire> accessoires, // Liste des accessoires personnalisés
            List<MultipartFile> accessoireImages, // Liste des fichiers image pour les accessoires
            Integer dureeFabrication
    ) throws IOException {
        // Récupérer le bassin existant
        Bassin bassin = bassinRepository.findById(idBassin)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

        // Sauvegarder les images des accessoires
        for (int i = 0; i < accessoires.size(); i++) {
            Accessoire accessoire = accessoires.get(i);
            MultipartFile file = accessoireImages.get(i);

            if (file != null && !file.isEmpty()) {
                String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                Path path = Paths.get(UPLOAD_DIR + fileName);
                Files.createDirectories(path.getParent());
                Files.write(path, file.getBytes());

                accessoire.setImagePath(fileName);
            }
        }

        // Créer le bassin personnalisé
        BassinPersonnalise bassinPersonnalise = new BassinPersonnalise();
        bassinPersonnalise.setBassin(bassin);
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);
        bassinPersonnalise.setAccessoires(accessoires);
        bassinPersonnalise.setDureeFabrication(dureeFabrication);
        
     // Correction : Associer chaque accessoire à son BassinPersonnalise avant d'ajouter les accessoires à la liste
        for (Accessoire accessoire : accessoires) {
            accessoire.setBassinPersonnalise(bassinPersonnalise);
        }
        bassinPersonnalise.setAccessoires(accessoires);

        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }
    
    @Transactional
    public BassinPersonnalise save(BassinPersonnalise bassinPersonnalise) {
        // Vérifier si le bassin est valide
        if (bassinPersonnalise.getBassin() == null) {
            throw new IllegalArgumentException("Le bassin est obligatoire.");
        }

        // Sauvegarde dans la base de données
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }

    public List<BassinPersonnalise> listeBassinsPersonnalises() {
        return bassinPersonnaliseRepository.findAll();
    }

    public BassinPersonnalise trouverBassinPersonnaliseParIdBassin(Long idBassin) {
        return bassinPersonnaliseRepository.trouverBassinPersonnaliseParIdBassin(idBassin);
    }
    
   /* public void uploadImageAccessoire(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        // Créfinir le nom du fichier
        String originalFileName = file.getOriginalFilename();
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        String fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;

        // Supprimer l'ancienne image si elle existe
        if (accessoire.getImagePath() != null) {
            Path oldFilePath = Paths.get(accessoire.getImagePath());
            if (Files.exists(oldFilePath)) {
                Files.delete(oldFilePath);
                System.out.println("Ancien fichier supprimé : " + oldFilePath);
            }
        }

        // Sauvegarder la nouvelle image
        Path filePath = uploadPath.resolve(fileName);
        Files.write(filePath, file.getBytes());

        // Mettre à jour le chemin de l'image dans l'accessoire
        accessoire.setImagePath(filePath.toString());
    }*/
    /*public void uploadImageAccessoire(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);
        
     // Vérifier que l'ID de l'accessoire n'est pas null
        if (accessoire.getIdAccessoire() == null) {
            throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
        }

        // Créer le nom du fichier
        String originalFileName = file.getOriginalFilename();
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        String fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;

        System.out.println("Nom du fichier généré : " + fileName);
        System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));
        
        if (accessoire.getImagePath() != null) {
            // Accessoire existant : conserver le même nom de fichier
            fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();
        } else {
            // Nouvel accessoire : générer un nouveau nom de fichier
            fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
        }

        System.out.println("Nom du fichier généré : " + fileName);
        System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));
        
        // Supprimer l'ancienne image si elle existe
        if (accessoire.getImagePath() != null) {
            Path oldFilePath = Paths.get(accessoire.getImagePath());
            if (Files.exists(oldFilePath)) {
                try {
                    Files.delete(oldFilePath);
                    System.out.println("Ancien fichier supprimé : " + oldFilePath);
                } catch (FileSystemException e) {
                    System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                    // Réessayer après un court délai
                    try {
                        Thread.sleep(1000); // Attendre 1 seconde
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                    } catch (Exception ex) {
                        System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                    }
                }
            }
        }

        // Sauvegarder la nouvelle image
        Path filePath = uploadPath.resolve(fileName);
        System.out.println("Chemin du nouveau fichier : " + filePath);
        
        Files.write(filePath, file.getBytes());
        System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);


        // Mettre à jour le chemin de l'image dans l'accessoire
        accessoire.setImagePath(filePath.toString());
        System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
    }*/
    
    //fonctionnelle
  /*  public void uploadImageAccessoire(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        try {
            // Vérifier que l'ID de l'accessoire n'est pas null
            if (accessoire.getIdAccessoire() == null) {
                throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
            }

            // Vérifier que le fichier n'est pas vide
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Le fichier image est vide ou null.");
            }

            // Générer le nom du fichier
            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName;

            if (accessoire.getImagePath() != null) {
                // Accessoire existant : vérifier que l'ID correspond au nom de l'image
                Long extractedAccessoireId = extractAccessoireIdFromImageName(accessoire.getImagePath());

                System.out.println("ID de l'accessoire : " + accessoire.getIdAccessoire());
                System.out.println("Chemin de l'image existante : " + accessoire.getImagePath());
                System.out.println("ID extrait du nom de l'image : " + extractedAccessoireId);

                if (extractedAccessoireId == null || !extractedAccessoireId.equals(accessoire.getIdAccessoire())) {
                    throw new IllegalArgumentException("Le nom de l'image ne correspond pas à l'ID de l'accessoire.");
                }

                // Conserver le même nom de fichier
                fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();
            } else {
                // Nouvel accessoire : générer un nouveau nom de fichier
                fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
            }

            System.out.println("Nom du fichier généré : " + fileName);
            System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));

            // Supprimer l'ancienne image si elle existe
            if (accessoire.getImagePath() != null) {
                Path oldFilePath = Paths.get(accessoire.getImagePath());
                if (Files.exists(oldFilePath)) {
                    try {
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé : " + oldFilePath);
                    } catch (FileSystemException e) {
                        System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                        // Réessayer après un court délai
                        try {
                            Thread.sleep(1000); // Attendre 1 seconde
                            Files.delete(oldFilePath);
                            System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                        } catch (Exception ex) {
                            System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                        }
                    }
                }
            }

            // Sauvegarder la nouvelle image
            Path filePath = uploadPath.resolve(fileName);
            System.out.println("Chemin du nouveau fichier : " + filePath);

            Files.write(filePath, file.getBytes());
            System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);

            // Mettre à jour le chemin de l'image dans l'accessoire
            accessoire.setImagePath(filePath.toString());
            System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
        } catch (Exception e) {
            // Log de l'erreur
            System.err.println("Erreur lors de l'upload de l'image de l'accessoire : " + e.getMessage());
            e.printStackTrace();
            throw e; // Relancer l'exception pour la gestion globale des erreurs
        }
    }*/
    
    private String normalizePath(String path) {
        if (path == null) return null;
        // Remplace tous les anti-slash par des slash et supprime les doubles slash
        return path.replace("\\", "/").replace("//", "/");
    }
    
    public void uploadImageAccessoireForAdd(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        // 1. Configuration du répertoire de stockage (déjà en format normalisé)
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        try {
            // 2. Validation des prérequis
            if (accessoire.getIdAccessoire() == null) {
                throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être persisté en base avant l'upload.");
            }

            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Fichier image vide ou null.");
            }

            // 3. Génération du nom de fichier
            String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
            String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName;

            if (accessoire.getImagePath() != null) {
                // Cas d'un accessoire existant
                Long extractedId = extractAccessoireIdFromImageName(accessoire.getImagePath());
                
                if (extractedId == null || !extractedId.equals(accessoire.getIdAccessoire())) {
                    // ID incohérent : générer un nouveau nom
                    fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
                } else {
                    // Conserver le nom existant (en extrayant seulement le nom du fichier)
                    fileName = Paths.get(normalizePath(accessoire.getImagePath())).getFileName().toString();
                }
            } else {
                // Nouvel accessoire
                fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
            }

            // 4. Suppression de l'ancienne image si elle existe
            if (accessoire.getImagePath() != null) {
                Path oldFilePath = Paths.get(normalizePath(accessoire.getImagePath()));
                if (Files.exists(oldFilePath)) {
                    try {
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé : " + oldFilePath);
                    } catch (IOException e) {
                        System.err.println("Échec suppression fichier : " + e.getMessage());
                        // Tentative de réessai après 1s
                        try {
                            Thread.sleep(1000);
                            Files.deleteIfExists(oldFilePath);
                        } catch (Exception ex) {
                            System.err.println("Échec suppression après réessai : " + ex.getMessage());
                        }
                    }
                }
            }

            // 5. Sauvegarde du nouveau fichier
            Path filePath = uploadPath.resolve(fileName).normalize();
            Files.createDirectories(filePath.getParent()); // Création des dossiers si inexistants
            Files.write(filePath, file.getBytes());

            // 6. Mise à jour du chemin normalisé dans l'entité
            String normalizedPath = normalizePath(filePath.toString());
            accessoire.setImagePath(normalizedPath);
            
            // Logs de confirmation
            System.out.println("Fichier enregistré : " + filePath);
            System.out.println("Chemin normalisé en BDD : " + normalizedPath);

        } catch (Exception e) {
            System.err.println("ERREUR Upload Image: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Méthode pour extraire l'ID de l'accessoire du nom de l'image
    private Long extractAccessoireIdFromImageName(String imageName) {
        if (imageName == null || !imageName.contains("_")) {
            return null; // Le nom de l'image ne correspond pas au format attendu
        }

        try {
            // Extraire la partie après le premier "_" et avant le "."
            String idPart = imageName.substring(imageName.indexOf("_") + 1, imageName.lastIndexOf("."));
            return Long.parseLong(idPart); // Convertir en Long
        } catch (Exception e) {
            System.err.println("Erreur lors de l'extraction de l'ID de l'accessoire depuis le nom de l'image : " + imageName);
            return null;
        }
    }

    
    @Transactional
    public void supprimerBassinPersonnalise(Long idBassinPersonnalise) {
        // Récupérer le bassin personnalisé
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise));

        // Supprimer les fichiers images associés
        supprimerImagesAccessoires(bassinPersonnalise);

        // Supprimer le bassin personnalisé de la base de données
        bassinPersonnaliseRepository.delete(bassinPersonnalise);
    }
    
	private final Path imageStorageLocation = Paths.get("C:/shared/imagesaccessoiresbassin").toAbsolutePath().normalize();


    private void supprimerImagesAccessoires(BassinPersonnalise bassinPersonnalise) {
        // Parcourir tous les accessoires du bassin personnalisé
        for (Accessoire accessoire : bassinPersonnalise.getAccessoires()) {
            if (accessoire.getImagePath() != null) {
                try {
                    // Extraire le nom du fichier à partir du chemin complet
                    String fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();

                    // Construire le chemin complet du fichier
                    Path filePath = imageStorageLocation.resolve(fileName).normalize();

                    // Supprimer le fichier s'il existe
                    if (Files.exists(filePath)) {
                        Files.delete(filePath);
                        System.out.println("Fichier supprimé : " + filePath);
                    }
                } catch (IOException e) {
                    System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                }
            }
        }
    }
    
    public List<Accessoire> convertirAccessoireDTOEnAccessoire(List<AccessoireDTO> accessoireDTOs) {
        return accessoireDTOs.stream()
                .map(accessoireDTO -> {
                    Accessoire accessoire = new Accessoire();
                    accessoire.setIdAccessoire(accessoireDTO.getIdAccessoire());
                    accessoire.setNomAccessoire(accessoireDTO.getNomAccessoire());
                    accessoire.setPrixAccessoire(accessoireDTO.getPrixAccessoire());
                    accessoire.setImagePath(accessoireDTO.getImagePath());
                    // Ignorer imageModified car il n'est pas dans l'entité

                    return accessoire;
                })
                .collect(Collectors.toList());
    }
    
    /*@Transactional
    public BassinPersonnalise mettreAJourBassinPersonnalise(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            List<MultipartFile> accessoireImages
    ) throws IOException {
        // Récupérer le bassin personnalisé existant
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise));

        // Récupérer le bassin existant par son ID
        Bassin bassin = bassinRepository.findById(idBassin)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + idBassin));

        // Mettre à jour les propriétés du bassin personnalisé
        bassinPersonnalise.setBassin(bassin);
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);

        // Log des IDs des accessoires avant la suppression
        System.out.println("IDs des accessoires avant suppression :");
        for (Accessoire accessoire : bassinPersonnalise.getAccessoires()) {
            System.out.println("Accessoire ID : " + accessoire.getIdAccessoire());
        }
        
        // Supprimer les anciens accessoires
        bassinPersonnalise.getAccessoires().clear();

     // Log des IDs des nouveaux accessoires avant ajout
        System.out.println("IDs des nouveaux accessoires avant ajout :");
        for (Accessoire accessoire : accessoires) {
            System.out.println("Accessoire ID : " + accessoire.getIdAccessoire());
        }
        
        // Ajouter les nouveaux accessoires
        for (Accessoire accessoire : accessoires) {
            accessoire.setBassinPersonnalise(bassinPersonnalise);
            bassinPersonnalise.getAccessoires().add(accessoire);
        }

        // Log des IDs des accessoires après ajout
        System.out.println("IDs des accessoires après ajout :");
        for (Accessoire accessoire : bassinPersonnalise.getAccessoires()) {
            System.out.println("Accessoire ID : " + accessoire.getIdAccessoire());
        }
        
        // Sauvegarder le bassin personnalisé pour obtenir les IDs des accessoires
        bassinPersonnalise = bassinPersonnaliseRepository.save(bassinPersonnalise);

        // Log des IDs des accessoires après sauvegarde
        System.out.println("IDs des accessoires après sauvegarde :");
        for (Accessoire accessoire : bassinPersonnalise.getAccessoires()) {
            System.out.println("Accessoire ID : " + accessoire.getIdAccessoire());
        }
        
        // Sauvegarder les images des accessoires
        if (accessoireImages != null && !accessoireImages.isEmpty()) {
            for (int i = 0; i < accessoireImages.size(); i++) {
                MultipartFile file = accessoireImages.get(i);

                if (file != null && !file.isEmpty()) {
                	// Associer l'image au bon accessoire
                    if (i < bassinPersonnalise.getAccessoires().size()) {
                        Accessoire accessoire = bassinPersonnalise.getAccessoires().get(i);
                        uploadImageAccessoire(bassinPersonnalise, accessoire, file);
                    }
                }
            }
        }

        // Sauvegarder le bassin personnalisé mis à jour
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }*/
    
    //fonctionnelle
 /*   @Transactional
    public BassinPersonnalise mettreAJourBassinPersonnalise(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            List<MultipartFile> accessoireImages
    ) throws IOException {
        // Récupérer le bassin personnalisé existant
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise));

        // Récupérer le bassin existant par son ID
        Bassin bassin = bassinRepository.findById(idBassin)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + idBassin));

        // Mettre à jour les propriétés du bassin personnalisé
        bassinPersonnalise.setBassin(bassin);
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);

        // Liste des accessoires existants avant la mise à jour
        List<Accessoire> accessoiresExistants = new ArrayList<>(bassinPersonnalise.getAccessoires());

        // Supprimer les anciens accessoires
        bassinPersonnalise.getAccessoires().clear();

        // Ajouter les nouveaux accessoires
        for (Accessoire accessoire : accessoires) {
            // Vérifier si l'accessoire existe déjà
            Optional<Accessoire> accessoireExistant = accessoiresExistants.stream()
                    .filter(a -> a.getIdAccessoire() != null && a.getIdAccessoire().equals(accessoire.getIdAccessoire()))
                    .findFirst();

            if (accessoireExistant.isPresent()) {
                // Accessoire existant : conserver l'ID et le chemin de l'image
                Accessoire existingAccessoire = accessoireExistant.get();
                accessoire.setIdAccessoire(existingAccessoire.getIdAccessoire());
                accessoire.setImagePath(existingAccessoire.getImagePath());
            } else {
                // Nouvel accessoire : associer au bassin personnalisé
                accessoire.setBassinPersonnalise(bassinPersonnalise);
            }
            bassinPersonnalise.getAccessoires().add(accessoire);
        }

        // Sauvegarder le bassin personnalisé pour obtenir les IDs des nouveaux accessoires
        bassinPersonnalise = bassinPersonnaliseRepository.save(bassinPersonnalise);

        // Sauvegarder les images des accessoires
        if (accessoireImages != null && !accessoireImages.isEmpty()) {
            for (int i = 0; i < accessoireImages.size(); i++) {
                MultipartFile file = accessoireImages.get(i);

                if (file != null && !file.isEmpty()) {
                    // Associer l'image au bon accessoire
                    if (i < bassinPersonnalise.getAccessoires().size()) {
                        Accessoire accessoire = bassinPersonnalise.getAccessoires().get(i);
                        uploadImageAccessoireForUpdate(bassinPersonnalise, accessoire, file);
                    }
                }
            }
        }

        // Sauvegarder le bassin personnalisé mis à jour
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }

    public void uploadImageAccessoireForUpdate(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        try {
            // Vérifier que l'ID de l'accessoire n'est pas null
            if (accessoire.getIdAccessoire() == null) {
                throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
            }

            // Vérifier que le fichier n'est pas vide
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Le fichier image est vide ou null.");
            }

            // Générer le nom du fichier
            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName;

            if (accessoire.getImagePath() != null) {
                // Accessoire existant : conserver le même nom de fichier
                fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();
            } else {
                // Nouvel accessoire : générer un nouveau nom de fichier
                fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
            }

            System.out.println("Nom du fichier généré pour la mise à jour : " + fileName);
            System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));

            // Supprimer l'ancienne image si elle existe
            if (accessoire.getImagePath() != null) {
                Path oldFilePath = Paths.get(accessoire.getImagePath());
                if (Files.exists(oldFilePath)) {
                    try {
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé : " + oldFilePath);
                    } catch (FileSystemException e) {
                        System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                        // Réessayer après un court délai
                        try {
                            Thread.sleep(1000); // Attendre 1 seconde
                            Files.delete(oldFilePath);
                            System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                        } catch (Exception ex) {
                            System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                        }
                    }
                }
            }

            // Sauvegarder la nouvelle image
            Path filePath = uploadPath.resolve(fileName);
            Files.write(filePath, file.getBytes());
            System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);

            // Mettre à jour le chemin de l'image dans l'accessoire
            accessoire.setImagePath(filePath.toString());
            System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
        } catch (Exception e) {
            // Log de l'erreur
            System.err.println("Erreur lors de l'upload de l'image de l'accessoire pour la mise à jour : " + e.getMessage());
            e.printStackTrace();
            throw e; // Relancer l'exception pour la gestion globale des erreurs
        }
    }
*/
    @Transactional
    public BassinPersonnalise mettreAJourBassinPersonnalise(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            List<MultipartFile> accessoireImages,
            Integer dureeFabrication) throws IOException {
        
        // 1. Récupérer le bassin personnalisé existant
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise));

        // 2. Récupérer le bassin existant
        Bassin bassin = bassinRepository.findById(idBassin)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + idBassin));

        // 3. Mettre à jour les propriétés de base
        bassinPersonnalise.setBassin(bassin);
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);
        bassinPersonnalise.setDureeFabrication(dureeFabrication);

        // 4. Gérer les accessoires existants
        List<Accessoire> accessoiresExistants = new ArrayList<>(bassinPersonnalise.getAccessoires());
        Map<Long, Accessoire> mapAccessoiresExistants = accessoiresExistants.stream()
                .collect(Collectors.toMap(Accessoire::getIdAccessoire, a -> a));

        // 5. Préparer la nouvelle liste d'accessoires
        List<Accessoire> nouveauxAccessoires = new ArrayList<>();

        for (int i = 0; i < accessoires.size(); i++) {
            Accessoire accessoire = accessoires.get(i);
            
            // Vérifier si c'est un accessoire existant ou nouveau
            if (accessoire.getIdAccessoire() != null && mapAccessoiresExistants.containsKey(accessoire.getIdAccessoire())) {
                // Accessoire existant - mettre à jour les propriétés
                Accessoire existant = mapAccessoiresExistants.get(accessoire.getIdAccessoire());
                existant.setNomAccessoire(accessoire.getNomAccessoire());
                existant.setPrixAccessoire(accessoire.getPrixAccessoire());
                nouveauxAccessoires.add(existant);
            } else {
                // Nouvel accessoire - créer et associer
                accessoire.setBassinPersonnalise(bassinPersonnalise);
                nouveauxAccessoires.add(accessoire);
            }
        }

        // 6. Sauvegarder temporairement pour obtenir les IDs des nouveaux accessoires
        bassinPersonnalise.getAccessoires().clear();
        bassinPersonnalise.getAccessoires().addAll(nouveauxAccessoires);
        bassinPersonnalise = bassinPersonnaliseRepository.save(bassinPersonnalise);

        // 7. Traiter les images des accessoires
        if (accessoireImages != null) {
            for (int i = 0; i < accessoireImages.size(); i++) {
                MultipartFile file = accessoireImages.get(i);
                if (file != null && !file.isEmpty() && i < nouveauxAccessoires.size()) {
                    Accessoire accessoire = nouveauxAccessoires.get(i);
                    String newImagePath = saveAccessoireImage(
                        bassinPersonnalise.getIdBassinPersonnalise(),
                        accessoire.getIdAccessoire(),
                        file
                    );
                    accessoire.setImagePath(newImagePath);
                }
            }
        }

        // 8. Sauvegarder les modifications finales
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }

    // Internal implementation using Map
   /* @Transactional
    public BassinPersonnalise mettreAJourBassinPersonnaliseWithMap(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            Map<Integer, MultipartFile> accessoireImagesMap,
            Integer dureeFabrication
    ) throws IOException {
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

        // Update basic properties
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);
        bassinPersonnalise.setDureeFabrication(dureeFabrication);

        // Manage existing accessories
        Map<Long, Accessoire> existingAccessoires = bassinPersonnalise.getAccessoires().stream()
                .collect(Collectors.toMap(Accessoire::getIdAccessoire, a -> a));

        List<Accessoire> updatedAccessoires = new ArrayList<>();

        for (int i = 0; i < accessoires.size(); i++) {
            Accessoire incoming = accessoires.get(i);
            Accessoire accessoire;
            
            if (incoming.getIdAccessoire() != null && existingAccessoires.containsKey(incoming.getIdAccessoire())) {
                // Update existing accessory
                accessoire = existingAccessoires.get(incoming.getIdAccessoire());
                accessoire.setNomAccessoire(incoming.getNomAccessoire());
                accessoire.setPrixAccessoire(incoming.getPrixAccessoire());
            } else {
                // Create new accessory
                accessoire = new Accessoire();
                accessoire.setNomAccessoire(incoming.getNomAccessoire());
                accessoire.setPrixAccessoire(incoming.getPrixAccessoire());
                accessoire.setBassinPersonnalise(bassinPersonnalise);
            }

            // Handle image if it exists for this index
            if (accessoireImagesMap.containsKey(i)) {
                uploadImageAccessoire(bassinPersonnalise, accessoire, accessoireImagesMap.get(i));
            }

            updatedAccessoires.add(accessoire);
        }

        // Replace the collection
        bassinPersonnalise.getAccessoires().clear();
        bassinPersonnalise.getAccessoires().addAll(updatedAccessoires);

        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }
 */
    // Helper method to convert List<MultipartFile> to Map<Integer, MultipartFile>
    private Map<Integer, MultipartFile> convertToImageMap(List<MultipartFile> images) {
        Map<Integer, MultipartFile> map = new HashMap<>();
        if (images != null) {
            for (int i = 0; i < images.size(); i++) {
                if (images.get(i) != null && !images.get(i).isEmpty()) {
                    map.put(i, images.get(i));
                }
            }
        }
        return map;
    }
   
    
    @Transactional
    public BassinPersonnalise mettreAJourBassinPersonnaliseWithMap(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            Map<Integer, MultipartFile> accessoireImagesMap,
            Integer dureeFabrication) throws IOException {
        
        // 1. Retrieve existing personalized pool
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé"));

        // 2. Get list of existing accessories before update
        List<Accessoire> existingAccessoires = new ArrayList<>(bassinPersonnalise.getAccessoires());
        
        // 3. Update basic properties
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);
        bassinPersonnalise.setDureeFabrication(dureeFabrication);

        // Create final copy for use in lambda
        final BassinPersonnalise finalBassinPersonnalise = bassinPersonnalise;

        // 4. Create a copy of existing accessories for reference
        bassinPersonnalise.getAccessoires().clear(); // Clear the collection to avoid orphan issues
        
        // 5. First pass: create/update all accessories without images
        Map<Integer, Accessoire> accessoireIndexMap = new HashMap<>();
        
        for (int i = 0; i < accessoires.size(); i++) {
            Accessoire incoming = accessoires.get(i);
            Accessoire accessoire;

            if (incoming.getIdAccessoire() != null) {
                // Existing accessory - find and update
                accessoire = existingAccessoires.stream()
                        .filter(a -> a.getIdAccessoire().equals(incoming.getIdAccessoire()))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Accessoire non trouvé: " + incoming.getIdAccessoire()));
                
                accessoire.setNomAccessoire(incoming.getNomAccessoire());
                accessoire.setPrixAccessoire(incoming.getPrixAccessoire());
            } else {
                // New accessory - create new
                accessoire = new Accessoire();
                accessoire.setNomAccessoire(incoming.getNomAccessoire());
                accessoire.setPrixAccessoire(incoming.getPrixAccessoire());
                accessoire.setBassinPersonnalise(bassinPersonnalise);
                
                // Sauvegarder immédiatement pour obtenir un ID
                accessoire = accessoireRepository.save(accessoire);
            }
            
            // Add to collection
            bassinPersonnalise.getAccessoires().add(accessoire);
            
            // Store by index for later image processing
            accessoireIndexMap.put(i, accessoire);
        }
        
        // 6. Identify and delete images of removed accessories
        List<Accessoire> removedAccessoires = existingAccessoires.stream()
                .filter(existing -> finalBassinPersonnalise.getAccessoires().stream()
                        .noneMatch(updated -> updated.getIdAccessoire() != null 
                                && updated.getIdAccessoire().equals(existing.getIdAccessoire())))
                .collect(Collectors.toList());
        
        for (Accessoire removed : removedAccessoires) {
            if (removed.getImagePath() != null) {
                try {
                    Path imagePath = Paths.get(removed.getImagePath());
                    if (Files.exists(imagePath)) {
                        Files.delete(imagePath);
                        System.out.println("Image supprimée: " + imagePath);
                    }
                } catch (IOException e) {
                    System.err.println("Erreur lors de la suppression de l'image: " + e.getMessage());
                }
            }
        }
        
        // 7. Save the entity to ensure all accessoires have IDs
        bassinPersonnalise = bassinPersonnaliseRepository.save(bassinPersonnalise);
        
        // 8. Second pass: process images with the saved accessoires
        for (Map.Entry<Integer, MultipartFile> entry : accessoireImagesMap.entrySet()) {
            Integer index = entry.getKey();
            MultipartFile file = entry.getValue();
            
            if (accessoireIndexMap.containsKey(index) && file != null && !file.isEmpty()) {
                Accessoire accessoire = accessoireIndexMap.get(index);
                
                // Vérifier que l'ID de l'accessoire existe
                if (accessoire.getIdAccessoire() == null) {
                    // Sauvegarder à nouveau l'accessoire pour s'assurer qu'il a un ID
                    accessoire = accessoireRepository.save(accessoire);
                }
                
                // Maintenant nous sommes sûrs que l'accessoire a un ID
                // Utiliser FileStorageService pour sauvegarder l'image
                String fileName = fileStorageService.saveAccessoireImage(idBassinPersonnalise, accessoire.getIdAccessoire(), file);
                
                // Path complète pour la base de données
                String imagePath = fileStorageService.getAccessoireUploadDir() + fileName;
                
                // Supprimer l'ancienne image si elle existe
                if (accessoire.getImagePath() != null && !accessoire.getImagePath().isEmpty()) {
                    try {
                        Files.deleteIfExists(Paths.get(accessoire.getImagePath()));
                    } catch (IOException e) {
                        System.out.println("Impossible de supprimer l'ancienne image: " + e.getMessage());
                    }
                }
                
                accessoire.setImagePath(imagePath);
                
                // Mettre à jour l'accessoire avec le chemin d'image
                accessoireRepository.save(accessoire);
                
                // Debug
                System.out.println("Image d'accessoire sauvegardée pour l'accessoire " + accessoire.getIdAccessoire() + " : " + imagePath);
            }
        }
        
        // 9. Save and return
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }
    
    
    private String getFileExtension(String filename) {
        return filename.substring(filename.lastIndexOf("."));
    }

    private String generateImageName(Long bassinId, Long accessoireId, String originalFilename) {
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        return bassinId + "_" + accessoireId + extension;
    }

    private String saveAccessoireImage(Long bassinId, Long accessoireId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        // Validate file type
        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        
        // Generate filename
        String fileName = bassinId + "_" + accessoireId + extension;
        Path filePath = Paths.get(UPLOAD_DIR).resolve(fileName).normalize();

        // Create directory if not exists
        if (!Files.exists(filePath.getParent())) {
            Files.createDirectories(filePath.getParent());
        }

        // Save file
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
        }

        // Return full path
        return filePath.toString();
    }
    
    private void uploadImageAccessoire(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return;
        }

        String originalFileName = file.getOriginalFilename();
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        String fileName;

        if (accessoire.getIdAccessoire() == null) {
            // Nouvel accessoire - nom temporaire
            fileName = "temp_" + System.currentTimeMillis() + extension;
        } else {
            // Accessoire existant
            fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
        }

        // Supprimer l'ancienne image si elle existe
        if (accessoire.getImagePath() != null && !accessoire.getImagePath().isEmpty()) {
            Path oldFilePath = Paths.get(accessoire.getImagePath());
            if (Files.exists(oldFilePath)) {
                Files.delete(oldFilePath);
            }
        }

        // Sauvegarder la nouvelle image
        Path filePath = Paths.get(UPLOAD_DIR + fileName);
        Files.createDirectories(filePath.getParent());
        Files.write(filePath, file.getBytes());

        // Mettre à jour le chemin de l'image
        accessoire.setImagePath(filePath.toString());
    }

   
    public void uploadImageAccessoireForUpdate(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        try {
            // Vérifier que l'ID de l'accessoire n'est pas null
            if (accessoire.getIdAccessoire() == null) {
                throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
            }

            // Afficher l'ID de l'accessoire
            System.out.println("ID de l'accessoire lors de la mise à jour de l'image : " + accessoire.getIdAccessoire());

            // Vérifier que le fichier n'est pas vide
            if (file == null || file.isEmpty()) {
                return; // Ne rien faire si aucune image n'est fournie
            }

            // Générer le nom du fichier
            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;

            System.out.println("Nom du fichier généré pour la mise à jour : " + fileName);
            System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));

            // Supprimer l'ancienne image si elle existe
            if (accessoire.getImagePath() != null) {
                Path oldFilePath = Paths.get(accessoire.getImagePath());
                if (Files.exists(oldFilePath)) {
                    try {
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé : " + oldFilePath);
                    } catch (FileSystemException e) {
                        System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                        // Réessayer après un court délai
                        try {
                            Thread.sleep(1000); // Attendre 1 seconde
                            Files.delete(oldFilePath);
                            System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                        } catch (Exception ex) {
                            System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                        }
                    }
                }
            }

            // Sauvegarder la nouvelle image
            Path filePath = uploadPath.resolve(fileName);
            Files.write(filePath, file.getBytes());
            System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);

            // Mettre à jour le chemin de l'image dans l'accessoire
            accessoire.setImagePath(filePath.toString());
            System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
        } catch (Exception e) {
            // Log de l'erreur
            System.err.println("Erreur lors de l'upload de l'image de l'accessoire pour la mise à jour : " + e.getMessage());
            e.printStackTrace();
            throw e; // Relancer l'exception pour la gestion globale des erreurs
        }
    }
    
    public List<Accessoire> getAccessoiresByBassinPersonnaliseId(Long idBassinPersonnalise) {
        return bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise))
                .getAccessoires();
    }
    
    public Map<String, Object> getOptionsForBassin(Long idBassin) {
        // Récupérer le bassin personnalisé associé à l'ID du bassin
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.trouverBassinPersonnaliseParIdBassin(idBassin);

        if (bassinPersonnalise == null) {
            throw new RuntimeException("Aucun bassin personnalisé trouvé pour l'ID du bassin : " + idBassin);
        }

        // Récupérer les matériaux, dimensions et accessoires
        List<String> materiaux = bassinPersonnalise.getMateriaux();
        List<String> dimensions = bassinPersonnalise.getDimensions();
        List<Accessoire> accessoires = bassinPersonnalise.getAccessoires();

        // Construire la réponse
        Map<String, Object> options = new HashMap<>();
        options.put("materiaux", materiaux);
        options.put("dimensions", dimensions);
        options.put("accessoires", accessoires);

        return options;
    }
    
    public BassinPersonnalise getBassinPersonnaliseByBassinId(Long idBassin) {
        return bassinPersonnaliseRepository.findByBassinId(idBassin);
    }
}