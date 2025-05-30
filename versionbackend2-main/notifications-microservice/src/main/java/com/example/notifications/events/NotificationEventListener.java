package com.example.notifications.events;

import com.example.notifications.entities.Notification;
import com.example.notifications.services.SseService;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class NotificationEventListener {
    
    private final SseService sseService;
    
    public NotificationEventListener(SseService sseService) {
        this.sseService = sseService;
    }
    
    @EventListener
    @Async
    public void handleNotificationEvent(NotificationEvent event) {
        Notification notification = event.getNotification();
        
        // Envoyer la notification en temps réel via SSE
        sseService.sendNotificationToUser(notification.getUsername(), notification);
        
        // Log pour debug
        System.out.println("📢 Notification temps réel envoyée à: " + 
                          notification.getUsername() + 
                          " | Type: " + notification.getType() + 
                          " | Message: " + notification.getTitle());
    }
}