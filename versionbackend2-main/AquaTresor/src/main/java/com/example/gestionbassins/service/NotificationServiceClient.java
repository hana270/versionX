package com.example.gestionbassins.service;

import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.gestionbassins.entities.Notification;

@FeignClient(name = "notification-service", url = "http://localhost:8087/notifications")
public interface NotificationServiceClient {
    
    @PostMapping("/api/notifications")
    Notification createNotification(@RequestBody Notification notification);
    
    @PostMapping("/api/notifications/send")
    void sendNotification(@RequestBody Notification notification);
    
    @GetMapping("/api/notifications/user/{username}")
    List<Notification> getUserNotifications(@PathVariable String username);
    
    @PutMapping("/api/notifications/read-all")
    void markAllAsRead();
    
    @PostMapping("/api/notifications/ajustement-stock")
    void handleAjustementStockNotification(
        @RequestParam String username,
        @RequestParam String nomBassin,
        @RequestParam int nouveauStock
    );
}