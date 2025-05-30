package projet.spring.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import projet.spring.entities.InstallerSpecialty;
import projet.spring.entities.Role;
import projet.spring.entities.User;
import projet.spring.entities.UserSpecialty;
import projet.spring.repos.RoleRepository;
import projet.spring.repos.UserRepository;
import projet.spring.repos.UserSpecialtyRepository;
import projet.spring.service.exceptions.AlreadyVerifiedException;
import projet.spring.service.exceptions.EmailAlreadyExistsException;
import projet.spring.service.exceptions.ExpiredTokenException;
import projet.spring.service.exceptions.InvalidTokenException;
import projet.spring.service.exceptions.UsernameAlreadyExistsException;
import projet.spring.service.register.RegistrationRequest;
import projet.spring.service.register.VerificationToken;
import projet.spring.service.register.VerificationTokenRepository;
import projet.spring.util.EmailSender;
import projet.spring.util.EmailService;

@Service
@Transactional
public class UserServiceImpl implements UserService {

	@Autowired
	private final UserRepository userRep;
	private final RoleRepository roleRep;

	@Autowired
	private BCryptPasswordEncoder bCryptPasswordEncoder;

	private final VerificationTokenRepository verificationTokenRepo;

	private final UserSpecialtyRepository userSpecialtyRep;

	@Autowired
	private EmailSender emailSender;
	private final EmailService emailService;

	private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);

	@Autowired
	public UserServiceImpl(UserRepository userRep, RoleRepository roleRep, BCryptPasswordEncoder bCryptPasswordEncoder,
			VerificationTokenRepository verificationTokenRepo, EmailService emailService,
			UserSpecialtyRepository userSpecialtyRep) {
		this.userRep = userRep;
		this.roleRep = roleRep;
		this.bCryptPasswordEncoder = bCryptPasswordEncoder;
		this.verificationTokenRepo = verificationTokenRepo;
		this.emailSender = emailSender;
		this.emailService = emailService;
		this.userSpecialtyRep = userSpecialtyRep;
	}

	@Override
	public User saveUser(User user) {
		if (!user.getPassword().startsWith("$2a$")) {
			user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
		}
		return userRep.save(user);
	}

	@Override
	public User addRoleToUser(String username, String rolename) {
		User usr = userRep.findByUsername(username)
				.orElseThrow(() -> new RuntimeException("User not found: " + username));

		Role r = roleRep.findByRole(rolename).orElseThrow(() -> new RuntimeException("Role not found: " + rolename));

		usr.getRoles().add(r);
		return userRep.save(usr);
	}

	@Override
	public User findUserByUsername(String username) {
		return userRep.findByUsername(username).orElse(null);
	}

	@Override
	public User findUserByEmail(String email) {
		return userRep.findByEmail(email).orElse(null);
	}

	public Role addRole(Role role) {
		return roleRep.save(role);
	}

	public void createInstallerRole() {
		if (roleRep.findByRole("INSTALLATEUR").isEmpty()) {
			Role installerRole = new Role("INSTALLATEUR");
			roleRep.save(installerRole);
		}
	}

	@PostConstruct
	public void initRoles() {
		try {
			// Vérification explicite avec log
			Optional<Role> existingRole = roleRep.findByRole("CLIENT");
			if (existingRole.isPresent()) {
				logger.info("Rôle CLIENT existant trouvé avec ID: {}", existingRole.get().getRole_id());
			} else {
				logger.info("Rôle CLIENT non trouvé, création en cours...");
				Role clientRole = new Role("CLIENT");
				Role savedRole = roleRep.save(clientRole);
				logger.info("Rôle CLIENT créé avec succès, ID: {}", savedRole.getRole_id());
			}
		} catch (Exception e) {
			logger.error("Erreur lors de l'initialisation du rôle CLIENT", e);
		}
	}

	@Override
	@Transactional
	public User registerUser(RegistrationRequest request) {
		// 1. Vérification de l'unicité de l'email
		String normalizedEmail = request.getEmail().toLowerCase().trim();
		Optional<User> existingUserByEmail = userRep.findByEmail(normalizedEmail);
		if (existingUserByEmail.isPresent()) {
			throw new EmailAlreadyExistsException("Cet email est déjà utilisé");
		}

		// 2. Vérification de l'unicité du username
		Optional<User> existingUserByUsername = userRep.findByUsername(request.getUsername());
		if (existingUserByUsername.isPresent()) {
			throw new UsernameAlreadyExistsException("Ce nom d'utilisateur est déjà utilisé");
		}

		// 3. Création du nouvel utilisateur
		User newUser = new User();
		newUser.setUsername(request.getUsername());
		newUser.setEmail(normalizedEmail);
		newUser.setPassword(bCryptPasswordEncoder.encode(request.getPassword()));
		newUser.setFirstName(request.getFirstName());
		newUser.setLastName(request.getLastName());
		newUser.setPhone(request.getPhone());
		newUser.setDefaultAddress(request.getDefaultAddress());
		newUser.setEnabled(false); // Compte désactivé jusqu'à vérification email

		// 4. Gestion du rôle CLIENT avec logs détaillés pour déboguer
		Role clientRole;
		Optional<Role> roleOptional = roleRep.findByRole("CLIENT");

		if (roleOptional.isPresent()) {
			clientRole = roleOptional.get();
			logger.info("Rôle CLIENT trouvé avec ID: {}", clientRole.getRole_id());
		} else {
			logger.warn("Rôle CLIENT non trouvé dans la base de données. Création d'un nouveau rôle.");
			Role newRole = new Role("CLIENT");
			clientRole = roleRep.save(newRole);
			logger.info("Nouveau rôle CLIENT créé avec ID: {}", clientRole.getRole_id());
		}

		// S'assurer que le Set de rôles est initialisé avant d'ajouter
		Set<Role> roles = new HashSet<>();
		roles.add(clientRole);
		newUser.setRoles(roles);

		// 5. Sauvegarde de l'utilisateur
		logger.info("Sauvegarde du nouvel utilisateur: {}", newUser.getUsername());
		User savedUser = userRep.save(newUser);
		logger.info("Utilisateur sauvegardé avec ID: {}", savedUser.getUser_id());

		// 6. Génération et envoi du code de vérification
		String verificationCode = generateCode();
		VerificationToken token = new VerificationToken(verificationCode, savedUser);
		verificationTokenRepo.save(token);
		logger.info("Token de vérification créé pour l'utilisateur: {}", savedUser.getUsername());

		// 7. Envoi de l'email de vérification
		try {
			sendEmailUser(savedUser, verificationCode);
			logger.info("Email de vérification envoyé à: {}", savedUser.getEmail());
		} catch (Exception e) {
			logger.error("Erreur lors de l'envoi de l'email de vérification: {}", e.getMessage(), e);
			// On ne rollback pas car l'utilisateur est valide, on peut renvoyer l'email
			// plus tard
		}

		return savedUser;
	}

	private String generateCode() {
		Random random = new Random();
		Integer code = 100000 + random.nextInt(900000);
		return code.toString();
	}

	@Override
	@Transactional(noRollbackFor = { InvalidTokenException.class, AlreadyVerifiedException.class,
			ExpiredTokenException.class })
	public User validateToken(String code) {
		VerificationToken token = verificationTokenRepo.findByToken(code);
		if (token == null) {
			throw new InvalidTokenException("Code de vérification invalide");
		}

		User user = token.getUser();
		if (user.getEnabled()) {
			throw new AlreadyVerifiedException("Ce compte est déjà vérifié");
		}

		if (token.isExpired()) {
			verificationTokenRepo.delete(token);
			throw new ExpiredTokenException("Le code a expiré, veuillez en demander un nouveau");
		}

		// Supprimer tous les tokens existants pour cet utilisateur
		verificationTokenRepo.deleteByUser(user);

		// Activer le compte
		user.setEnabled(true);
		User savedUser = userRep.save(user);

		// Envoyer l'email de bienvenue
		sendWelcomeEmail(savedUser);

		return savedUser;
	}

	@Override
	@Transactional
	public void resendVerificationCode(String email) {
		User user = userRep.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

		if (user.getEnabled()) {
			throw new AlreadyVerifiedException("Ce compte est déjà vérifié");
		}

		// Supprimer tous les anciens tokens
		verificationTokenRepo.deleteByUser(user);

		// Générer un nouveau code
		String newCode = generateCode();
		VerificationToken newToken = new VerificationToken(newCode, user);
		verificationTokenRepo.save(newToken);

		// Envoyer le nouveau code
		sendEmailUser(user, newCode);
	}

	@Override
	public boolean updateUserProfile(String username, String newEmail, String newPassword, String currentPassword,
			String profileImagePath) {
		User user = userRep.findByUsername(username).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

		// Vérification du mot de passe actuel
		if ((newEmail != null && !newEmail.isEmpty()) || (newPassword != null && !newPassword.isEmpty())) {
			if (currentPassword == null || currentPassword.isEmpty()) {
				throw new RuntimeException("Le mot de passe actuel est requis");
			}
			if (!bCryptPasswordEncoder.matches(currentPassword, user.getPassword())) {
				throw new RuntimeException("Mot de passe actuel incorrect");
			}
		}

		// Mise à jour de l'email
		if (newEmail != null && !newEmail.isEmpty()) {
			userRep.findByEmail(newEmail).ifPresent(existingUser -> {
				if (!existingUser.getUsername().equals(username)) {
					throw new EmailAlreadyExistsException("Cet email est déjà utilisé");
				}
			});
			user.setEmail(newEmail);
		}

		// Mise à jour du mot de passe
		if (newPassword != null && !newPassword.isEmpty()) {
			user.setPassword(bCryptPasswordEncoder.encode(newPassword));
		}

		// Mise à jour de l'image de profil
		if (profileImagePath != null && !profileImagePath.isEmpty()) {
			user.setProfileImage(profileImagePath);
		}

		userRep.save(user);
		return true;
	}

	@Override
	public String generateResetToken(String email) {
		User user = userRep.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

		String token = UUID.randomUUID().toString();
		user.setResetToken(token);
		userRep.save(user);

		return token;
	}

	@Override
	public String generateValidationCode() {
		Random random = new Random();
		// Génère un code à 6 chiffres entre 100000 et 999999
		int code = 100000 + random.nextInt(900000);
		return String.valueOf(code);
	}

	@Override
	public boolean validateCode(String email, String code) {
		User user = userRep.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

		return code.equals(user.getValidationCode());
	}

	@Override
	public void resetPassword(String email, String newPassword) {
		User user = userRep.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

		user.setPassword(bCryptPasswordEncoder.encode(newPassword));
		user.setResetToken(null);
		user.setValidationCode(null);
		userRep.save(user);
	}

	@Override
	public void deactivateUser(Long userId) {
		User user = userRep.findById(userId)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'ID : " + userId));
		user.setEnabled(false); // Désactiver le compte
		userRep.save(user);
	}

	@Override
	public void activateUser(Long userId) {
		User user = userRep.findById(userId)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'ID : " + userId));
		user.setEnabled(true); // Activer le compte
		userRep.save(user);
	}

	/**
	 * Envoie un email contenant le code de validation à l'utilisateur nouvellement
	 * inscrit Design professionnel avec CSS responsive et formatage HTML
	 * 
	 * @param user L'utilisateur destinataire
	 * @param code Le code de validation à envoyer
	 */

	@Override
	public void sendEmailUser(User user, String code) {
		String subject = "🔐 Votre code de validation - Confirmation de compte";

		Map<String, Object> variables = new HashMap<>();
		variables.put("username", user.getUsername());
		variables.put("code", code);

		// Use the correct template path - adjust as needed
		emailService.sendEmail(user.getEmail(), subject, "verification-email", variables);
	}

	/**
	 * Envoie une invitation à un installateur potentiel pour rejoindre la
	 * plateforme Design professionnel avec brand identity et CTA prominent
	 * 
	 * @param email L'adresse email du destinataire
	 */
	@Override
	public void sendInstallerInvitation(String email, InstallerSpecialty specialty) {
		String token = UUID.randomUUID().toString();
		String registrationUrl = String.format(
				"http://localhost:4200/installer-register?token=%s&specialty=%s&email=%s", token, specialty.name(),
				URLEncoder.encode(email, StandardCharsets.UTF_8));

		Map<String, Object> variables = new HashMap<>();
		variables.put("registrationUrl", registrationUrl);
		variables.put("specialty", specialty);

		emailService.sendEmail(email, "🔧 Invitation à rejoindre notre réseau d'installateurs professionnels",
				"email/installer-invitation", variables);
	}

	/**
	 * Envoie un email de récupération de mot de passe avec le code de
	 * réinitialisation
	 * 
	 * @param user L'utilisateur demandant la réinitialisation @ * @param resetCode
	 * Le code de réinitialisation généré
	 */
	@Override
	public void sendPasswordResetEmail(User user, String resetCode) {
		String subject = "🔒 Réinitialisation de votre mot de passe - Code de vérification";

		Map<String, Object> variables = new HashMap<>();
		variables.put("username", user.getUsername());
		variables.put("resetCode", resetCode);

		emailService.sendEmail(user.getEmail(), subject, "email/password-reset-email", // Chemin vers votre template
				variables);
	}

	/***/
	@Override
	@Transactional
	public boolean validateVerificationToken(User user, String token) {
		VerificationToken verificationToken = verificationTokenRepo.findByToken(token);

		if (verificationToken == null) {
			return false;
		}

		if (!verificationToken.getUser().getUser_id().equals(user.getUser_id())) {
			return false;
		}

		if (verificationToken.isExpired()) {
			verificationTokenRepo.delete(verificationToken);
			return false;
		}

		return true;
	}

	@Override
	public void sendWelcomeEmail(User user) {
		String subject = "🎉 Bienvenue sur notre plateforme !";

		Map<String, Object> variables = new HashMap<>();
		variables.put("username", user.getUsername());

		emailService.sendEmail(user.getEmail(), subject, "email/welcome-email", variables);
	}

	/*** pose problème pour register *///
	@Override
	@Transactional
	public User registerInstaller(RegistrationRequest request) {
	    // Check for existing username
	    userRep.findByUsername(request.getUsername())
	        .ifPresent(u -> { throw new UsernameAlreadyExistsException("Ce nom d'utilisateur est déjà utilisé"); });

	    // Normalize and check email
	    String normalizedEmail = request.getEmail().toLowerCase().trim();
	    userRep.findByEmail(normalizedEmail)
	        .ifPresent(u -> { throw new EmailAlreadyExistsException("Cet email est déjà utilisé"); });

	    if (request.getSpecialty() == null) {
	        throw new IllegalArgumentException("La spécialité est obligatoire pour les installateurs");
	    }

		userRep.findByEmailIgnoreCase(request.getEmail().toLowerCase()).ifPresent(u -> {
			throw new RuntimeException("Cet email est déjà utilisé");
		});

		userRep.findByEmailIgnoreCase(request.getEmail().toLowerCase()).ifPresent(u -> {
			throw new RuntimeException("Cet email est déjà utilisé");
		});

		if (request.getSpecialty() == null) {
			throw new RuntimeException("La spécialité est obligatoire pour les installateurs");
		}

		// Création de l'utilisateur
		User user = new User();
		user.setUsername(request.getUsername());
		user.setPassword(bCryptPasswordEncoder.encode(request.getPassword()));
		user.setEmail(request.getEmail().toLowerCase());
		user.setFirstName(request.getFirstName());
		user.setLastName(request.getLastName());
		user.setPhone(request.getPhone());
		user.setDefaultAddress(request.getDefaultAddress());
		user.setEnabled(false);
		user.setSpecialty(request.getSpecialty());

		// Attribution du rôle INSTALLATEUR
		Role installerRole = roleRep.findByRole("INSTALLATEUR")
				.orElseThrow(() -> new RuntimeException("Role INSTALLATEUR non trouvé"));
		user.setRoles(Set.of(installerRole));

		User savedUser = userRep.save(user);

		// Création de l'entrée dans users_specialities
		UserSpecialty userSpecialty = new UserSpecialty(savedUser, request.getSpecialty());
		userSpecialtyRep.save(userSpecialty);

		// Envoi du code de vérification
		String code = this.generateCode();
		VerificationToken token = new VerificationToken(code, savedUser);
		verificationTokenRepo.save(token);
		sendEmailUser(savedUser, code);

		return savedUser;
	}
}