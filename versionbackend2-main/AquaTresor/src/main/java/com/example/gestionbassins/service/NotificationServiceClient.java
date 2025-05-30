package com.example.gestionbassins.service;

import com.example.gestionbassins.entities.Notification;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "notifications-microservice", url = "http://localhost:8087/notifications")

public interface NotificationServiceClient {

	    @PostMapping
	    Notification createNotification(@RequestBody Notification notification);

	    @PostMapping("/send")
	    void sendNotification(@RequestBody Notification notification);

	    @GetMapping("/user/{username}")
	    List<Notification> getUserNotifications(@PathVariable String username);

	    @PutMapping("/read-all")
	    void markAllAsRead();

	    @PostMapping("/ajustement-stock")
	    void handleAjustementStockNotification(
	            @RequestParam String adminUsername,
	            @RequestParam String produit,
	            @RequestParam int quantite);
	}