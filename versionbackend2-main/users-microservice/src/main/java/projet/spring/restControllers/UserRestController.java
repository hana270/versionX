package projet.spring.restControllers;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import projet.spring.dto.UpdateProfileRequest;
import projet.spring.dto.UserDto;
import projet.spring.entities.User;
import projet.spring.repos.UserRepository;
import projet.spring.service.FileStorageService;
import projet.spring.service.UserService;
import projet.spring.service.exceptions.*;
import projet.spring.service.register.RegistrationRequest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.io.IOException;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import projet.spring.dto.UpdateProfileRequest;
import projet.spring.entities.InstallerSpecialty;
import projet.spring.entities.Role;
import projet.spring.entities.User;
import projet.spring.repos.UserRepository;
import projet.spring.service.register.VerificationTokenRepository;
import projet.spring.security.SecParams;
import projet.spring.service.FileStorageService;
import projet.spring.service.UserService;
import projet.spring.service.exceptions.*;
import projet.spring.service.register.RegistrationRequest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.MalformedURLException;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;

import lombok.RequiredArgsConstructor;
import projet.spring.entities.User;
import projet.spring.security.SecParams;
import projet.spring.service.UserService;

@RestController
@RequestMapping("/api/users")
public class UserRestController {

	@Autowired
	UserRepository userRep;

	@Autowired
	VerificationTokenRepository verificationTokenRepo;

	@Autowired
	UserService userService;

	@Autowired
	private AuthenticationManager authenticationManager;

	private static final Logger logger = LoggerFactory.getLogger(UserRestController.class);

	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
		try {
			String username = credentials.get("username");
			String password = credentials.get("password");

			logger.info("Login attempt for user: {}", username);

			if (username == null || password == null) {
				return ResponseEntity.badRequest().body(Map.of("error", "Nom d'utilisateur et mot de passe requis"));
			}

			// Authenticate using Spring Security
			Authentication authentication = authenticationManager
					.authenticate(new UsernamePasswordAuthenticationToken(username, password));

			SecurityContextHolder.getContext().setAuthentication(authentication);

			// Find the user
			User user = userService.findUserByUsername(username);

			// Check if user is enabled
			if (!user.getEnabled()) {
				logger.warn("Login attempt for disabled account: {}", username);
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "ACCOUNT_NOT_ACTIVATED",
						"message", "Veuillez vérifier votre email pour activer votre compte"));
			}

			// Extract roles
			List<String> roles = user.getRoles().stream().map(Role::getRole).toList();

			// Create JWT with all necessary user info
			String jwt = JWT.create().withSubject(user.getUsername()).withClaim("userId", user.getUser_id())
					.withClaim("email", user.getEmail()).withClaim("username", user.getUsername())
					.withClaim("firstName", user.getFirstName()).withClaim("lastName", user.getLastName())
					.withClaim("phone", user.getPhone()).withClaim("enabled", user.getEnabled())
					.withClaim("defaultAddress", user.getDefaultAddress())
					.withClaim("profileImage", user.getProfileImage())
					.withArrayClaim("roles", roles.toArray(new String[0]))
					.withExpiresAt(new Date(System.currentTimeMillis() + SecParams.EXP_TIME))
					.sign(Algorithm.HMAC256(SecParams.SECRET));

			String tokenWithBearer = SecParams.PREFIX + jwt;

			// Create user data for response
			Map<String, Object> userData = new HashMap<>();
			userData.put("userId", user.getUser_id());
			userData.put("username", user.getUsername());
			userData.put("email", user.getEmail());
			userData.put("firstName", user.getFirstName());
			userData.put("lastName", user.getLastName());
			userData.put("phone", user.getPhone());
			userData.put("enabled", user.getEnabled());
			userData.put("defaultAddress", user.getDefaultAddress());
			userData.put("profileImage", user.getProfileImage());
			userData.put("roles", roles);

			// Créer la réponse
			Map<String, Object> response = new HashMap<>();
			response.put("jwt", jwt); // JWT sans le préfixe Bearer
			response.put("token", tokenWithBearer); // JWT avec le préfixe Bearer
			response.put("user", userData);

			logger.info("Login successful for user: {} with roles: {}", username, roles);

			return ResponseEntity.ok().header(HttpHeaders.AUTHORIZATION, tokenWithBearer)
					.header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.AUTHORIZATION).body(response);
		} catch (BadCredentialsException e) {
			logger.error("Authentication failed: {}", e.getMessage());
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(Map.of("error", "INVALID_CREDENTIALS", "message", "Identifiants incorrects"));
		} catch (Exception e) {
			logger.error("Login error: {}", e.getMessage(), e);
			return ResponseEntity.internalServerError()
					.body(Map.of("error", "SERVER_ERROR", "message", "Erreur lors de la connexion: " + e.getMessage()));
		}
	}

	@Autowired
	private FileStorageService fileStorageService;

	@GetMapping("/all")
	public List<User> getAllUsers() {
		System.out.println("Fetching all users with role CLIENT");
		List<User> users = userRep.findByRoles_Role("CLIENT");
		System.out.println("Users found: " + users.size());
		return users;
	}

	@GetMapping("/list-installateurs")
	public List<User> getAllInstallateurs() {
		System.out.println("Fetching all users with role INSTALLATEUR");
		List<User> users = userRep.findByRoles_Role("INSTALLATEUR");
		System.out.println("Users found: " + users.size());
		return users;
	}

	@PutMapping("/updateProfile")
	public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request) {
		try {
			boolean isUpdated = userService.updateUserProfile(request.getUsername(), request.getNewEmail(),
					request.getNewPassword(), request.getCurrentPassword(), request.getProfileImagePath());
			if (isUpdated) {
				return ResponseEntity.ok().body(Map.of("message", "Profil mis à jour avec succès."));
			} else {
				return ResponseEntity.status(HttpStatus.BAD_REQUEST)
						.body(Map.of("message", "Une erreur est survenue."));
			}
		} catch (EmailAlreadyExistsException e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
		} catch (RuntimeException e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
		}
	}

	@PostMapping("/uploadProfileImage")
	public ResponseEntity<?> uploadProfileImage(@RequestParam("file") MultipartFile file, @RequestParam String username,
			@RequestParam String currentPassword) {
		try {
			if (file.isEmpty()) {
				return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Le fichier est vide."));
			}

			// Enregistrer le fichier et récupérer le nom du fichier
			String fileName = fileStorageService.storeFile(file);

			// Mettre à jour le profil utilisateur avec le nom du fichier
			boolean isUpdated = userService.updateUserProfile(username, null, null, currentPassword, fileName);
			if (isUpdated) {
				// Construire l'URL complète pour l'affichage
				String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath().path("/uploads/") // Assurez-vous
																												// que
																												// ce
																												// chemin
																												// correspond
																												// à
																												// votre
																												// configuration
						.path(fileName).toUriString();

				return ResponseEntity.ok().body(
						Map.of("message", "Image de profil mise à jour avec succès.", "imageUrl", fileDownloadUri));
			} else {
				return ResponseEntity.status(HttpStatus.BAD_REQUEST)
						.body(Map.of("message", "Une erreur est survenue lors de la mise à jour du profil."));
			}
		} catch (IOException e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("message", "Erreur lors de l'upload de l'image."));
		} catch (RuntimeException e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
		}
	}

	@GetMapping("/downloadFile/{fileName}")
	public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
		try {
			Path filePath = fileStorageService.loadFile(fileName);
			Resource resource = new UrlResource(filePath.toUri());

			if (resource.exists() || resource.isReadable()) {
				return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + resource.getFilename() + "\"").body(resource);
			} else {
				throw new RuntimeException("Impossible de lire le fichier : " + fileName);
			}
		} catch (MalformedURLException e) {
			throw new RuntimeException("Erreur lors de la lecture du fichier : " + fileName, e);
		}
	}

	@GetMapping("/userProfile")
	public ResponseEntity<?> getUserProfile(Authentication authentication) {
		if (authentication == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Non authentifié"));
		}

		String username = authentication.getName();
		User user = userRep.findByUsername(username).orElse(null);

		if (user == null) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Utilisateur non trouvé"));
		}

		Map<String, Object> userInfo = new HashMap<>();
		userInfo.put("email", user.getEmail());
		userInfo.put("profileImage", user.getProfileImage());
		userInfo.put("username", user.getUsername());
		return ResponseEntity.ok(userInfo);
	}

	@PostMapping("/register")
	public ResponseEntity<?> register(@RequestBody RegistrationRequest request) {
		try {
			logger.info("Tentative d'inscription pour l'email: {}", request.getEmail());
			logger.debug("Données de la requête: {}", request);

			// Normaliser l'email avant vérification
			String normalizedEmail = request.getEmail().toLowerCase().trim();
			request.setEmail(normalizedEmail);

			// Vérifier d'abord si l'email existe
			logger.debug("Vérification de l'email existant: {}", normalizedEmail);
			if (userRep.findByEmail(normalizedEmail).isPresent()) {
				logger.warn("Email déjà utilisé: {}", normalizedEmail);
				return ResponseEntity.status(HttpStatus.CONFLICT)
						.body(Map.of("error", "EMAIL_ALREADY_EXISTS", "message", "Cet email est déjà utilisé"));
			}

			// Vérifier ensuite si le nom d'utilisateur existe
			logger.debug("Vérification du nom d'utilisateur existant: {}", request.getUsername());
			if (userRep.findByUsername(request.getUsername()).isPresent()) {
				logger.warn("Nom d'utilisateur déjà utilisé: {}", request.getUsername());
				return ResponseEntity.status(HttpStatus.CONFLICT).body(
						Map.of("error", "USERNAME_ALREADY_EXISTS", "message", "Ce nom d'utilisateur est déjà utilisé"));
			}

			logger.debug("Appel du service d'inscription");
			User user = userService.registerUser(request);
			logger.debug("Utilisateur créé avec ID: {}", user.getUser_id());

			// Générer le token JWT
			List<String> roles = user.getRoles().stream().map(Role::getRole).collect(Collectors.toList());
			logger.debug("Génération du token JWT pour l'utilisateur ID: {}", user.getUser_id());

			String jwt = JWT.create().withSubject(user.getUsername()).withClaim("userId", user.getUser_id())
					.withClaim("email", user.getEmail()).withClaim("firstName", user.getFirstName())
					.withClaim("lastName", user.getLastName()).withClaim("phone", user.getPhone())
					.withClaim("defaultAddress", user.getDefaultAddress())
					.withArrayClaim("roles", roles.toArray(new String[0]))
					.withExpiresAt(new Date(System.currentTimeMillis() + SecParams.EXP_TIME))
					.sign(Algorithm.HMAC256(SecParams.SECRET));

			HttpHeaders headers = new HttpHeaders();
			headers.add("Authorization", SecParams.PREFIX + jwt);
			headers.add("Access-Control-Expose-Headers", "Authorization");

			Map<String, Object> responseBody = new HashMap<>();
			responseBody.put("user", user);
			responseBody.put("jwt", SecParams.PREFIX + jwt);
			responseBody.put("message",
					"Inscription réussie! Veuillez vérifier votre email pour activer votre compte.");

			logger.info("Inscription réussie pour l'utilisateur: {}", user.getUsername());
			return ResponseEntity.status(HttpStatus.CREATED).headers(headers).body(responseBody);

		} catch (Exception e) {
			// Log détaillé de l'erreur pour faciliter le débogage
			logger.error("Erreur lors de l'inscription: {}", e.getMessage(), e);
			// Vérifier si c'est une erreur spécifique
			if (e instanceof DataIntegrityViolationException) {
				logger.error("Erreur d'intégrité des données: {}", e.getMessage());
				return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "DATA_INTEGRITY_ERROR",
						"message", "Erreur d'intégrité des données. Vérifiez vos informations."));
			}
			return ResponseEntity.internalServerError().body(
					Map.of("error", "SERVER_ERROR", "message", "Une erreur technique est survenue: " + e.getMessage()));
		}
	}

	private String generateJwtToken(User user) {
		List<String> roles = user.getRoles().stream().map(Role::getRole).collect(Collectors.toList());

		return JWT.create().withSubject(user.getUsername()).withClaim("userId", user.getUser_id())
				.withArrayClaim("roles", roles.toArray(new String[0]))
				.withExpiresAt(new Date(System.currentTimeMillis() + SecParams.EXP_TIME))
				.sign(Algorithm.HMAC256(SecParams.SECRET));
	}

	@PostMapping("/send-installer-invitation")
	public ResponseEntity<?> sendInstallerInvitation(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String specialtyStr = request.get("specialty");

		try {
			InstallerSpecialty specialty = InstallerSpecialty.valueOf(specialtyStr);
			userService.sendInstallerInvitation(email, specialty);
			return ResponseEntity.ok().body(Map.of("message", "Invitation envoyée avec succès !"));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", "Spécialité invalide"));
		}
	}

	/******/
	@PostMapping("/registerinstaller")
	public ResponseEntity<?> registerInstaller(@Valid @RequestBody RegistrationRequest request,
			@RequestParam(required = false) String token) {

		try {
		    // Validation
		    if (request.getSpecialty() == null) {
		        return ResponseEntity.badRequest().body(Map.of("error", "SPECIALTY_REQUIRED", "message",
		                "La spécialité est obligatoire pour les installateurs"));
		    }

		    User user = userService.registerInstaller(request);
		    return ResponseEntity.ok().body(
		            Map.of("user", user, "message", "Un code de vérification a été envoyé à votre adresse email"));
		} catch (RuntimeException e) {
		    return ResponseEntity.status(HttpStatus.CONFLICT)
		            .body(Map.of("error", e.getMessage(), "status", "ERROR", "timestamp", LocalDateTime.now()));
		}
	}

	/*****/

	@PostMapping("/request-reset-password")
	public ResponseEntity<?> requestResetPassword(@RequestBody Map<String, String> request) {
		String email = request.get("email");

		User user = userService.findUserByEmail(email);
		if (user == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Email non trouvé."));
		}

		String validationCode = userService.generateValidationCode();
		user.setValidationCode(validationCode);
		userRep.save(user);

		String emailContent = validationCode;
		userService.sendPasswordResetEmail(user, emailContent);

		return ResponseEntity.ok().body(Map.of("message", "Un code de validation a été envoyé à votre email."));
	}

	@PostMapping("/validate-code")
	public ResponseEntity<?> validateCode(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String code = request.get("code");

		if (userService.validateCode(email, code)) {
			return ResponseEntity.ok().body(Map.of("message", "Code valide."));
		} else {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Code invalide."));
		}
	}

	@PostMapping("/reset-password")
	public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String newPassword = request.get("newPassword");

		userService.resetPassword(email, newPassword);
		return ResponseEntity.ok().body(Map.of("message", "Mot de passe réinitialisé avec succès."));
	}

	@PutMapping("/deactivate/{userId}")
	public ResponseEntity<?> deactivateUser(@PathVariable Long userId) {
		try {
			userService.deactivateUser(userId);
			return ResponseEntity.ok().body(Map.of("message", "Compte désactivé avec succès."));
		} catch (RuntimeException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
		}
	}

	@PutMapping("/activate/{userId}")
	public ResponseEntity<?> activateUser(@PathVariable Long userId) {
		try {
			userService.activateUser(userId);
			return ResponseEntity.ok().body(Map.of("message", "Compte activé avec succès."));
		} catch (RuntimeException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
		}
	}

	@GetMapping("/validate/{userId}")
	public ResponseEntity<User> validateUser(@PathVariable Long userId) {
		User user = userRep.findById(userId).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
		return ResponseEntity.ok(user);
	}

	@PutMapping("/update")
	public ResponseEntity<?> updateUser(@RequestBody User user) {
		try {
			// Find the existing user by ID or username
			User existingUser = userRep.findById(user.getUser_id())
					.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

			// Update only allowed fields
			existingUser.setFirstName(user.getFirstName());
			existingUser.setLastName(user.getLastName());
			existingUser.setPhone(user.getPhone());
			existingUser.setDefaultAddress(user.getDefaultAddress());

			// Save the updated user
			User updatedUser = userRep.save(existingUser);

			return ResponseEntity.ok().body(Map.of("message", "Profil mis à jour avec succès", "user", updatedUser));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(Map.of("message", "Erreur lors de la mise à jour du profil: " + e.getMessage()));
		}
	}

	@PostMapping("/verify-email")
	public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> request) {
		try {
			String email = request.get("email");
			String code = request.get("code");

			if (email == null || code == null) {
				return ResponseEntity.badRequest()
						.body(Map.of("error", "INVALID_REQUEST", "message", "Email et code requis"));
			}

			User user = userService.validateToken(code);

			// Vérification supplémentaire que l'email correspond
			if (!user.getEmail().equalsIgnoreCase(email)) {
				return ResponseEntity.badRequest()
						.body(Map.of("error", "INVALID_CODE", "message", "Le code ne correspond pas à cet email"));
			}

			List<String> roles = user.getRoles().stream().map(Role::getRole).collect(Collectors.toList());

			String jwt = JWT.create().withSubject(user.getUsername()).withClaim("userId", user.getUser_id())
					.withClaim("email", user.getEmail()).withArrayClaim("roles", roles.toArray(new String[0]))
					.withExpiresAt(new Date(System.currentTimeMillis() + SecParams.EXP_TIME))
					.sign(Algorithm.HMAC256(SecParams.SECRET));

			HttpHeaders headers = new HttpHeaders();
			headers.add("Authorization", SecParams.PREFIX + jwt);
			headers.add("Access-Control-Expose-Headers", "Authorization");

			return ResponseEntity.ok().headers(headers)
					.body(Map.of("message", "Compte activé avec succès", "user", user, "roles", roles));

		} catch (InvalidTokenException e) {
			return ResponseEntity.badRequest()
					.body(Map.of("error", "INVALID_CODE", "message", "Code de vérification invalide"));
		} catch (Exception e) {
			return ResponseEntity.internalServerError()
					.body(Map.of("error", "SERVER_ERROR", "message", "Erreur lors de la vérification"));
		}
	}

	@PostMapping("/resend-verification")
	public ResponseEntity<?> resendVerificationCode(@RequestBody Map<String, String> request) {
		try {
			String email = request.get("email");

			if (email == null || email.isEmpty()) {
				return ResponseEntity.badRequest().body(Map.of("error", "INVALID_REQUEST", "message", "Email requis"));
			}

			// Renvoyer le code de vérification
			userService.resendVerificationCode(email);

			return ResponseEntity.ok()
					.body(Map.of("message", "Un nouveau code de vérification a été envoyé à votre adresse email"));

		} catch (AlreadyVerifiedException e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(Map.of("error", "ALREADY_VERIFIED", "message", e.getMessage()));
		} catch (RuntimeException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", "USER_NOT_FOUND", "message", e.getMessage()));
		} catch (Exception e) {
			logger.error("Erreur lors du renvoi du code de vérification", e);
			return ResponseEntity.internalServerError()
					.body(Map.of("error", "SERVER_ERROR", "message", "Erreur lors du renvoi du code"));
		}
	}

	/***************************/
	@GetMapping("/installateurs")
	public List<User> getInstallateurs() {
		return userRep.findByRoles_Role("INSTALLATEUR");
	}

	@GetMapping("/installateursCommmande")
	public List<UserDto> getInstallateursCommmande() {
		return userRep.findByRoles_Role("INSTALLATEUR").stream().map(user -> {
			UserDto dto = new UserDto();
			dto.setUser_id(user.getUser_id());
			dto.setUsername(user.getUsername());
			dto.setEmail(user.getEmail());
			// Nouveaux champs ajoutés
			dto.setFirstName(user.getFirstName());
			dto.setLastName(user.getLastName());
			dto.setPhone(user.getPhone());
			dto.setDefaultAddress(user.getDefaultAddress());
			dto.setSpecialty(user.getSpecialty()); // Une seule spécialité
			return dto;
		}).collect(Collectors.toList());
	}

	@GetMapping("/installateurs/filter")
	public ResponseEntity<List<UserDto>> getInstallateursBySpecialty(@RequestParam InstallerSpecialty specialty) {

		List<User> installateurs = userRep.findByRoles_RoleAndSpecialty("INSTALLATEUR", specialty);

		List<UserDto> dtos = installateurs.stream().map(user -> {
			UserDto dto = new UserDto();
			dto.setUser_id(user.getUser_id());
			dto.setUsername(user.getUsername());
			dto.setEmail(user.getEmail());
			dto.setFirstName(user.getFirstName()); // Ajouté
			dto.setLastName(user.getLastName()); // Ajouté
			dto.setPhone(user.getPhone()); // Ajouté
			dto.setSpecialty(user.getSpecialty()); // Une seule spécialité
			return dto;
		}).collect(Collectors.toList());

		return ResponseEntity.ok(dtos);
	}

	// update spécialité installateur
	@PutMapping("/installateurs/{userId}/specialty")
	public ResponseEntity<User> updateSpecialty(@PathVariable Long userId, @RequestParam InstallerSpecialty specialty) {
		User user = userRep.findById(userId).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
		user.setSpecialty(specialty);
		User updatedUser = userRep.save(user);
		return ResponseEntity.ok(updatedUser);
	}

	@GetMapping("/{userId}")
	public ResponseEntity<UserDto> getUserById(@PathVariable Long userId) {
		User user = userRep.findById(userId).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

		UserDto userDTO = new UserDto();
		userDTO.setUser_id(user.getUser_id());
		userDTO.setUsername(user.getUsername());
		userDTO.setEmail(user.getEmail());
		userDTO.setFirstName(user.getFirstName());
		userDTO.setLastName(user.getLastName());
		userDTO.setPhone(user.getPhone());
		userDTO.setDefaultAddress(user.getDefaultAddress());
		userDTO.setEnabled(user.getEnabled());
		userDTO.setProfileImage(user.getProfileImage());
		userDTO.setResetToken(user.getResetToken());
		userDTO.setValidationCode(user.getValidationCode());
		userDTO.setJwtToken(user.getJwtToken());
		userDTO.setSpecialty(user.getSpecialty());

		// Convertir les rôles
		Set<String> roles = user.getRoles().stream().map(role -> role.getRole()).collect(Collectors.toSet());
		userDTO.setRoles(roles);

		return ResponseEntity.ok(userDTO);
	}

	@GetMapping("/username/{username}")
	public ResponseEntity<UserDto> getUserByUsername(@PathVariable String username) {
		User user = userService.findUserByUsername(username);
		if (user == null) {
			return ResponseEntity.notFound().build();
		}

		UserDto userDTO = new UserDto();
		userDTO.setUser_id(user.getUser_id());
		userDTO.setUsername(user.getUsername());
		userDTO.setEmail(user.getEmail());
		userDTO.setFirstName(user.getFirstName());
		userDTO.setLastName(user.getLastName());
		userDTO.setPhone(user.getPhone());
		userDTO.setDefaultAddress(user.getDefaultAddress());
		userDTO.setEnabled(user.getEnabled());
		userDTO.setProfileImage(user.getProfileImage());
		userDTO.setResetToken(user.getResetToken());
		userDTO.setValidationCode(user.getValidationCode());
		userDTO.setJwtToken(user.getJwtToken());
		userDTO.setSpecialty(user.getSpecialty());

		// Convertir les rôles
		Set<String> roles = user.getRoles().stream().map(role -> role.getRole()).collect(Collectors.toSet());
		userDTO.setRoles(roles);

		return ResponseEntity.ok(userDTO);
	}


	@GetMapping("/photos_profile/{fileName:.+}")
	public ResponseEntity<Resource> serveProfileImage(@PathVariable String fileName) {
	    try {
	        Path filePath = fileStorageService.loadFile(fileName);
	        Resource resource = new UrlResource(filePath.toUri());

	        if (resource.exists() || resource.isReadable()) {
	            return ResponseEntity.ok()
	                .header(HttpHeaders.CONTENT_TYPE, Files.probeContentType(filePath))
	                .body(resource);
	        } else {
	            throw new RuntimeException("Could not read file: " + fileName);
	        }
	    } catch (IOException e) {
	        throw new RuntimeException("Error: " + e.getMessage());
	    }
	}

	@GetMapping("/uploads/{fileName:.+}")
	public ResponseEntity<Resource> serveFile(@PathVariable String fileName) {
	    try {
	        Path filePath = fileStorageService.loadFile(fileName);
	        Resource resource = new UrlResource(filePath.toUri());

	        if (resource.exists() || resource.isReadable()) {
	            return ResponseEntity.ok()
	                .header(HttpHeaders.CONTENT_TYPE, Files.probeContentType(filePath))
	                .body(resource);
	        } else {
	            throw new RuntimeException("Could not read file: " + fileName);
	        }
	    } catch (IOException e) {
	        throw new RuntimeException("Error: " + e.getMessage());
	    }
	}
}