package com.example.notifications.services;

import com.example.notifications.entities.Notification;
import com.example.notifications.repos.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationServiceImpl.class);
    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Notification> getUserNotifications(String username) {
        return notificationRepository.findByUsername(username);
    }

    @Override
    @Transactional
    public Notification createNotification(Notification notification) {
        if (notification.getDate() == null) {
            notification.setDate(LocalDateTime.now());
        }
        if (!notification.isRead()) {
            notification.setRead(false);
        }
        return notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void sendNotification(String title, String message, String username) {
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setUsername(username);
        notification.setType("INFO");
        notification.setDate(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
        logger.info("Notification envoyée à {} : {}", username, message);
    }

    @Override
    @Transactional
    public Notification markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification non trouvée avec l'ID : " + id));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead() {
        List<Notification> notifications = notificationRepository.findByReadFalse();
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    @Override
    @Transactional
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void clearAllNotifications() {
        notificationRepository.deleteAll();
    }

    @Override
    @Transactional
    public void handleCreationCommandeNotification(Long clientId, String numeroCommande) {
        Notification notification = new Notification();
        notification.setTitle("Commande Enregistrée");
        notification.setMessage(String.format("Votre commande n°%s est enregistrée. Paiement en attente.", numeroCommande));
        notification.setType("ORDER");
        notification.setUsername(clientId.toString());
        notification.setDate(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
        logger.info("Notification client pour création de commande : {}", numeroCommande);
    }

    @Override
    @Transactional
    public void handlePaiementConfirmeNotification(Long clientId, String numeroCommande) {
        Notification notification = new Notification();
        notification.setTitle("Paiement Confirmé");
        notification.setMessage(String.format("Paiement confirmé pour la commande n°%s. Préparation en cours.", numeroCommande));
        notification.setType("PAYMENT");
        notification.setUsername(clientId.toString());
        notification.setDate(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
        logger.info("Notification client pour paiement confirmé : {}", numeroCommande);
    }

    @Override
    @Transactional
    public void handleAjustementStockNotification(String username, String nomBassin, int nouveauStock) {
        Notification notification = new Notification();
        notification.setTitle("Stock Mis à Jour");
        notification.setMessage(String.format("Stock du bassin '%s' mis à jour : %d unités.", nomBassin, nouveauStock));
        notification.setType("STOCK");
        notification.setUsername(username);
        notification.setDate(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
        logger.info("Notification d'ajustement de stock pour : {}", username);
    }

    @Override
    @Transactional
    public void handleAdminCreationCommandeNotification(String numeroCommande) {
        Notification notification = new Notification();
        notification.setTitle("Nouvelle Commande");
        notification.setMessage(String.format("Nouvelle commande n°%s reçue. Paiement en attente.", numeroCommande));
        notification.setType("ORDER");
        notification.setUsername("admin");
        notification.setDate(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
        logger.info("Notification admin pour nouvelle commande : {}", numeroCommande);
    }

    @Override
    @Transactional
    public void handleAdminPaiementConfirmeNotification(String numeroCommande) {
        Notification notification = new Notification();
        notification.setTitle("Commande Payée");
        notification.setMessage(String.format("Commande n°%s payée. Préparation en cours.", numeroCommande));
        notification.setType("PAYMENT");
        notification.setUsername("admin");
        notification.setDate(LocalDateTime.now());
        notification.setRead(false);
        notificationRepository.save(notification);
        logger.info("Notification admin pour paiement confirmé : {}", numeroCommande);
    }
}