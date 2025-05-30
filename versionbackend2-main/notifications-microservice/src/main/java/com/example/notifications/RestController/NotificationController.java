package com.example.notifications.RestController;

import com.example.notifications.entities.Notification;
import com.example.notifications.services.NotificationService;
import com.example.notifications.services.SseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);
    private final NotificationService notificationService;
    private final SseService sseService;

    public NotificationController(NotificationService notificationService, SseService sseService) {
        this.notificationService = notificationService;
        this.sseService = sseService;
        logger.info("NotificationController initialized");
    }

    @GetMapping(value = "/stream/{username}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> streamNotifications(@PathVariable String username) {
        logger.info("🔗 New SSE connection request from: {}", username);
        if (username == null || username.trim().isEmpty()) {
            logger.error("Invalid username provided for SSE connection");
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(null);
        }

        try {
            SseEmitter emitter = sseService.createConnection(username);
            emitter.onCompletion(() -> logger.info("✅ SSE completed for {}", username));
            emitter.onError(e -> logger.error("❌ SSE error for {}: {}", username, e.getMessage()));
            logger.debug("SSE emitter created successfully for {}", username);
            return ResponseEntity.ok(emitter);
        } catch (Exception e) {
            logger.error("Error creating SSE connection for {}: {}", username, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllNotifications() {
        logger.info("Fetching all notifications");
        try {
            List<Notification> notifications = notificationService.getAllNotifications();
            logger.debug("Retrieved {} notifications", notifications.size());
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            logger.error("Error fetching all notifications: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch notifications", "details", e.getMessage()));
        }
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserNotifications(@PathVariable String username) {
        logger.info("Fetching notifications for user: {}", username);
        try {
            List<Notification> notifications = notificationService.getUserNotifications(username);
            logger.debug("Retrieved {} notifications for {}", notifications.size(), username);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            logger.error("Error fetching notifications for {}: {}", username, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch user notifications", "details", e.getMessage()));
        }
    }

    @GetMapping("/user/{username}/unread")
    public ResponseEntity<?> getUserUnreadNotifications(@PathVariable String username) {
        logger.info("Fetching unread notifications for user: {}", username);
        try {
            List<Notification> notifications = notificationService.getUserUnreadNotifications(username);
            logger.debug("Retrieved {} unread notifications for {}", notifications.size(), username);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            logger.error("Error fetching unread notifications for {}: {}", username, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch unread notifications", "details", e.getMessage()));
        }
    }

    @GetMapping("/user/{username}/unread/count")
    public ResponseEntity<?> getUnreadCount(@PathVariable String username) {
        logger.info("Fetching unread notification count for user: {}", username);
        try {
            long count = notificationService.getUserUnreadNotifications(username).size();
            logger.debug("Unread notification count for {}: {}", username, count);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            logger.error("Error fetching unread count for {}: {}", username, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch unread count", "details", e.getMessage()));
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createNotification(@RequestBody Notification notification) {
        logger.info("Creating new notification: {}", notification.getTitle());
        try {
            Notification created = notificationService.createNotification(notification);
            logger.debug("Notification created with ID: {}", created.getId());
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(created);
        } catch (Exception e) {
            logger.error("Error creating notification: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create notification", "details", e.getMessage()));
        }
    }

    @PostMapping("/send")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendNotification(@RequestBody Notification notification) {
        logger.info("Sending notification to user: {}", notification.getUsername());
        try {
            notificationService.sendNotification(
                notification.getTitle(),
                notification.getMessage(),
                notification.getUsername()
            );
            logger.debug("Notification sent successfully to {}", notification.getUsername());
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of("message", "Notification sent successfully"));
        } catch (Exception e) {
            logger.error("Error sending notification: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send notification", "details", e.getMessage()));
        }
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        logger.info("Marking notification as read: {}", id);
        try {
            Notification updated = notificationService.markAsRead(id);
            logger.debug("Notification {} marked as read", id);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException e) {
            logger.error("Notification not found: {}", id);
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Notification not found", "details", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error marking notification as read: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to mark notification as read", "details", e.getMessage()));
        }
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        logger.info("Marking all notifications as read");
        try {
            notificationService.markAllAsRead();
            logger.debug("All notifications marked as read");
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of("message", "All notifications marked as read"));
        } catch (Exception e) {
            logger.error("Error marking all notifications as read: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to mark all notifications as read", "details", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        logger.info("Deleting notification: {}", id);
        try {
            notificationService.deleteNotification(id);
            logger.debug("Notification {} deleted", id);
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of("message", "Notification deleted successfully"));
        } catch (EntityNotFoundException e) {
            logger.error("Notification not found: {}", id);
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Notification not found", "details", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error deleting notification: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete notification", "details", e.getMessage()));
        }
    }

    @PostMapping("/creation-commande")
    public ResponseEntity<?> handleCreationCommandeNotification(
            @RequestParam Long clientId,
            @RequestParam String numeroCommande) {
        logger.info("Handling creation commande notification for client: {}, commande: {}", clientId, numeroCommande);
        try {
            notificationService.handleCreationCommandeNotification(clientId, numeroCommande);
            logger.debug("Commande creation notification sent for client {}", clientId);
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of("message", "Commande creation notification sent"));
        } catch (Exception e) {
            logger.error("Error handling commande creation notification: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send commande creation notification", "details", e.getMessage()));
        }
    }

    @PostMapping("/paiement-confirme")
    public ResponseEntity<?> handlePaiementConfirmeNotification(
            @RequestParam Long clientId,
            @RequestParam String numeroCommande) {
        logger.info("Handling paiement confirme notification for client: {}, commande: {}", clientId, numeroCommande);
        try {
            notificationService.handlePaiementConfirmeNotification(clientId, numeroCommande);
            logger.debug("Paiement confirmation notification sent for client {}", clientId);
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of("message", "Paiement confirmation notification sent"));
        } catch (Exception e) {
            logger.error("Error handling paiement confirmation notification: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send paiement confirmation notification", "details", e.getMessage()));
        }
    }

    @PostMapping("/ajustement-stock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> handleAjustementStockNotification(
            @RequestParam String adminUsername,
            @RequestParam String produit,
            @RequestParam int quantite) {
        logger.info("🔄 Stock adjustment received: {} = {} (Admin: {})", produit, quantite, adminUsername);
        try {
            notificationService.handleAjustementStockNotification(adminUsername, produit, quantite);
            logger.debug("Stock adjustment notification sent for {}", adminUsername);
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of("message", "Stock adjustment notification sent"));
        } catch (Exception e) {
            logger.error("Error handling stock adjustment notification: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send stock adjustment notification", "details", e.getMessage()));
        }
    }

    @PostMapping("/test-stock-alert")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> testStockAlert(
            @RequestParam String adminUsername,
            @RequestParam String produit,
            @RequestParam int quantite) {
        logger.info("🧪 Test stock alert: {} = {}", produit, quantite);
        try {
            notificationService.sendStockAlertNotification(produit, quantite, adminUsername);
            logger.debug("Test stock alert sent for {}", adminUsername);
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(Map.of("message", "Test stock alert sent"));
        } catch (Exception e) {
            logger.error("Error sending test stock alert: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to send test stock alert", "details", e.getMessage()));
        }
    }
}