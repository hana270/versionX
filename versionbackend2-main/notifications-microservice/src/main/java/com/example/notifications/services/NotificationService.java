package com.example.notifications.services;

import com.example.notifications.entities.Notification;

import java.util.List;

public interface NotificationService {
    List<Notification> getAllNotifications();
    List<Notification> getUserNotifications(String username);
    Notification createNotification(Notification notification);
    void sendNotification(String title, String message, String username);
    Notification markAsRead(Long id);
    void markAllAsRead();
    void deleteNotification(Long id);
    void clearAllNotifications();
    void handleCreationCommandeNotification(Long clientId, String numeroCommande);
    void handlePaiementConfirmeNotification(Long clientId, String numeroCommande);
    void handleAjustementStockNotification(String username, String nomBassin, int nouveauStock);
    void handleAdminCreationCommandeNotification(String numeroCommande);
    void handleAdminPaiementConfirmeNotification(String numeroCommande);
}