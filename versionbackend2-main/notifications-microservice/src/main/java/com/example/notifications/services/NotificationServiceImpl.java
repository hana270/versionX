package com.example.notifications.services;

import com.example.notifications.entities.Notification;
import com.example.notifications.repos.NotificationRepository;
import com.example.notifications.services.SseService;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Date;
import java.util.List;

@Service
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final SseService sseService;
    private final RestTemplate restTemplate;

    public NotificationServiceImpl(NotificationRepository notificationRepository, SseService sseService, RestTemplate restTemplate) {
        this.notificationRepository = notificationRepository;
        this.sseService = sseService;
        this.restTemplate = restTemplate;
        log.info("NotificationServiceImpl initialized");
    }

    @Override
    public List<Notification> getAllNotifications() {
        log.info("Fetching all notifications");
        try {
            List<Notification> notifications = notificationRepository.findAll();
            log.debug("Retrieved {} notifications", notifications.size());
            return notifications;
        } catch (Exception e) {
            log.error("Error fetching all notifications", e);
            throw new RuntimeException("Failed to fetch notifications: " + e.getMessage());
        }
    }

    @Override
    public List<Notification> getUserNotifications(String username) {
        log.info("Fetching notifications for user: {}", username);
        try {
            List<Notification> notifications = notificationRepository.findByUsername(username);
            log.debug("Retrieved {} notifications for {}", notifications.size(), username);
            return notifications;
        } catch (Exception e) {
            log.error("Error fetching notifications for {}", username, e);
            throw new RuntimeException("Failed to fetch user notifications: " + e.getMessage());
        }
    }

    @Override
    public List<Notification> getUserUnreadNotifications(String username) {
        log.info("Fetching unread notifications for user: {}", username);
        try {
            List<Notification> notifications = notificationRepository.findByUsernameAndReadFalse(username);
            log.debug("Retrieved {} unread notifications for {}", notifications.size(), username);
            return notifications;
        } catch (Exception e) {
            log.error("Error fetching unread notifications for {}", username, e);
            throw new RuntimeException("Failed to fetch unread notifications: " + e.getMessage());
        }
    }

    @Transactional
    public Notification createNotification(Notification notification) {
        log.info("Creating notification: {}", notification.getTitle());
        try {
            if (notification.getDate() == null) {
                notification.setDate(new Date());
                log.debug("Set notification date to: {}", notification.getDate());
            }
            if (notification.getType() == null) {
                notification.setType("info");
                log.debug("Set notification type to: info");
            }
            Notification saved = notificationRepository.save(notification);
            log.debug("Notification created with ID: {}", saved.getId());
            sseService.sendNotificationToUser(notification.getUsername(), saved);
            log.info("📤 Sending SSE notification to {}", notification.getUsername());
            return saved;
        } catch (Exception e) {
            log.error("Error creating notification", e);
            throw new RuntimeException("Failed to create notification: " + e.getMessage());
        }
    }

    @Transactional
    public Notification markAsRead(Long id) {
        log.info("Marking notification as read: {}", id);
        try {
            Notification notification = notificationRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Notification not found with id: " + id));
            notification.setRead(true);
            Notification updated = notificationRepository.save(notification);
            log.debug("Notification {} marked as read", id);
            return updated;
        } catch (EntityNotFoundException e) {
            log.error("Notification not found: {}", id);
            throw e;
        } catch (Exception e) {
            log.error("Error marking notification as read", e);
            throw new RuntimeException("Failed to mark notification as read: " + e.getMessage());
        }
    }

    @Transactional
    public void markAllAsRead() {
        log.info("Marking all notifications as read");
        try {
            List<Notification> unreadNotifications = notificationRepository.findByReadFalse();
            unreadNotifications.forEach(n -> n.setRead(true));
            notificationRepository.saveAll(unreadNotifications);
            log.debug("Marked {} notifications as read", unreadNotifications.size());
        } catch (Exception e) {
            log.error("Error marking all notifications as read", e);
            throw new RuntimeException("Failed to mark all notifications as read: " + e.getMessage());
        }
    }

    @Transactional
    public void deleteNotification(Long id) {
        log.info("Deleting notification: {}", id);
        try {
            if (notificationRepository.existsById(id)) {
                notificationRepository.deleteById(id);
                log.debug("Notification {} deleted", id);
            } else {
                log.error("Notification not found: {}", id);
                throw new EntityNotFoundException("Notification not found with ID: " + id);
            }
        } catch (Exception e) {
            log.error("Error deleting notification", e);
            throw new RuntimeException("Failed to delete notification: " + e.getMessage());
        }
    }

    @Transactional
    public void sendNotification(String title, String message, String username) {
        log.info("Sending notification - Title: {}, User: {}", title, username);
        try {
            Notification notification = new Notification();
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setUsername(username);
            notification.setType("info");
            notification.setDate(new Date());
            notification.setRead(false);
            Notification saved = notificationRepository.save(notification);
            sseService.sendNotificationToUser(username, saved);
            log.debug("Notification sent successfully, ID: {}", saved.getId());
        } catch (Exception e) {
            log.error("Error sending notification", e);
            throw new RuntimeException("Failed to send notification: " + e.getMessage());
        }
    }

    @Override
    public void handleCreationCommandeNotification(Long clientId, String numeroCommande) {
        log.info("Handling commande creation notification for client: {}, commande: {}", clientId, numeroCommande);
        try {
            String title = "Nouvelle commande créée";
            String message = "Votre commande #" + numeroCommande + " a été créée avec succès";
            sendNotification(title, message, clientId.toString());
            log.debug("Commande creation notification sent for client {}", clientId);
        } catch (Exception e) {
            log.error("Error handling commande creation notification", e);
            throw new RuntimeException("Failed to handle commande creation: " + e.getMessage());
        }
    }

    @Override
    public void handlePaiementConfirmeNotification(Long clientId, String numeroCommande) {
        log.info("Handling paiement confirmation notification for client: {}, commande: {}", clientId, numeroCommande);
        try {
            String title = "Paiement confirmé";
            String message = "Le paiement pour votre commande #" + numeroCommande + " a été confirmé";
            sendNotification(title, message, clientId.toString());
            log.debug("Paiement confirmation notification sent for client {}", clientId);
        } catch (Exception e) {
            log.error("Error handling paiement confirmation notification", e);
            throw new RuntimeException("Failed to handle paiement confirmation: " + e.getMessage());
        }
    }

    @Transactional
    public void handleAjustementStockNotification(String adminUsername, String produit, int quantite) {
        log.info("Processing stock adjustment notification - Admin: {}, Product: {}, Quantity: {}", 
                adminUsername, produit, quantite);
        try {
            String title = "Ajustement de stock";
            String message = String.format("Stock du produit '%s' ajusté à %d unités par %s", 
                                          produit, quantite, adminUsername);
            Notification notification = new Notification();
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setUsername(adminUsername);
            notification.setType("info");
            notification.setDate(new Date());
            notification.setRead(false);
            Notification savedNotification = notificationRepository.save(notification);
            log.debug("Stock adjustment notification saved with ID: {}", savedNotification.getId());
            sseService.sendNotificationToUser(adminUsername, savedNotification);

            if (quantite < 5) {
                log.warn("Critical stock detected for product: {} ({})", produit, quantite);
                sendStockAlertNotification(produit, quantite, adminUsername);
            }
        } catch (Exception e) {
            log.error("Error processing stock adjustment notification", e);
            throw new RuntimeException("Failed to send stock adjustment notification: " + e.getMessage());
        }
    }

    @Transactional
    public void sendStockAlertNotification(String produit, int quantite, String adminUsername) {
        log.info("Sending critical stock alert - Product: {}, Quantity: {}", produit, quantite);
        try {
            String title = "🚨 ALERTE STOCK CRITIQUE";
            String message = String.format("ATTENTION: Le stock du produit '%s' est critique (%d unités restantes). Réapprovisionnement nécessaire!", 
                                          produit, quantite);
            Notification alertNotification = new Notification();
            alertNotification.setTitle(title);
            alertNotification.setMessage(message);
            alertNotification.setUsername(adminUsername);
            alertNotification.setType("alert");
            alertNotification.setDate(new Date());
            alertNotification.setRead(false);
            Notification savedAlert = notificationRepository.save(alertNotification);
            log.debug("Critical stock alert saved with ID: {}", savedAlert.getId());
            sseService.sendNotificationToUser(adminUsername, savedAlert);
            sendAlertToAllAdmins(savedAlert);
        } catch (Exception e) {
            log.error("Error sending critical stock alert", e);
            throw new RuntimeException("Failed to send stock alert: " + e.getMessage());
        }
    }

    @Transactional
    public void sendAlertToAllAdmins(Notification alertNotification) {
        log.info("Sending alert to all admins");
        try {
            String userServiceUrl = "http://users-microservice/api/users/all?role=ROLE_ADMIN";
            UserDTO[] admins = restTemplate.getForObject(userServiceUrl, UserDTO[].class);
            if (admins != null) {
                Arrays.stream(admins).forEach(admin -> {
                    Notification adminNotification = new Notification();
                    adminNotification.setTitle(alertNotification.getTitle());
                    adminNotification.setMessage(alertNotification.getMessage());
                    adminNotification.setUsername(admin.getUsername());
                    adminNotification.setType("alert");
                    adminNotification.setDate(new Date());
                    adminNotification.setRead(false);
                    Notification saved = notificationRepository.save(adminNotification);
                    sseService.sendNotificationToUser(admin.getUsername(), saved);
                    log.debug("Alert sent to admin: {}, Notification ID: {}", admin.getUsername(), saved.getId());
                });
            } else {
                log.warn("No admins found for alert notification");
            }
        } catch (Exception e) {
            log.error("Error sending alert to all admins", e);
            throw new RuntimeException("Failed to send alert to admins: " + e.getMessage());
        }
    }

    @Override
    public void checkAndSendStockAlert(String produit, int nouvelleQuantite, String adminUsername) {
        log.info("Checking stock alert for product: {}, quantity: {}", produit, nouvelleQuantite);
        try {
            if (nouvelleQuantite < 5) {
                sendStockAlertNotification(produit, nouvelleQuantite, adminUsername);
                log.debug("Stock alert sent for low quantity");
            }
        } catch (Exception e) {
            log.error("Error checking stock alert", e);
            throw new RuntimeException("Failed to check stock alert: " + e.getMessage());
        }
    }
}

class UserDTO {
    private Long userId;
    private String username;
    private String email;
    private List<String> roles;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public List<String> roles() { return roles; } // Changed to match typical getter naming
    public void setRoles(List<String> roles) { this.roles = roles; }
}