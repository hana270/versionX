package com.example.orders_microservice.service;

import com.example.orders_microservice.entities.Notification;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "notifications-microservice", url = "http://localhost:8087")
public interface NotificationServiceClient {

    @PostMapping("/api/notifications")
    Notification createNotification(@RequestBody Notification notification);

    @PostMapping("/api/notifications/send")
    void sendNotification(@RequestBody Notification notification);

    @GetMapping("/api/notifications/user/{username}")
    List<Notification> getUserNotifications(@PathVariable String username);

    @PutMapping("/api/notifications/read-all")
    void markAllAsRead();

    @PostMapping("/api/notifications/paiement-confirme")
    void envoyerNotificationPaiementConfirme(@RequestParam Long clientId, @RequestParam String numeroCommande);

    @PostMapping("/api/notifications/creation-commande")
    void envoyerNotificationCreationCommande(@RequestParam Long clientId, @RequestParam String numeroCommande);

    @PostMapping("/api/notifications/admin/creation-commande")
    void envoyerNotificationAdminCreationCommande(@RequestParam String numeroCommande);

    @PostMapping("/api/notifications/admin/paiement-confirme")
    void envoyerNotificationAdminPaiementConfirme(@RequestParam String numeroCommande);
}