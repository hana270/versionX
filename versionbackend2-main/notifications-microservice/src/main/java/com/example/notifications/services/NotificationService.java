package com.example.notifications.services;

import com.example.notifications.entities.Notification;
import java.util.List;

public interface NotificationService {
    List<Notification> getAllNotifications();
    List<Notification> getUserNotifications(String username);
    List<Notification> getUserUnreadNotifications(String username); // Méthode manquante ajoutée
    Notification createNotification(Notification notification);
    Notification markAsRead(Long id);
    void markAllAsRead();
    void deleteNotification(Long id);
    void sendNotification(String title, String message, String username);
    void handleCreationCommandeNotification(Long clientId, String numeroCommande);
    void handlePaiementConfirmeNotification(Long clientId, String numeroCommande);
    void handleAjustementStockNotification(String adminUsername, String produit, int quantite);
    
    // Nouvelles méthodes pour gestion en temps réel
    void sendStockAlertNotification(String produit, int quantiteRestante, String adminUsername);
    void checkAndSendStockAlert(String produit, int nouvellequantite, String adminUsername);
}