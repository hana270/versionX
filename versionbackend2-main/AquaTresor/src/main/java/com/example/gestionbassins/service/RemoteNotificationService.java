package com.example.gestionbassins.service;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.example.gestionbassins.entities.Notification;
/*
@Service
public class RemoteNotificationService {
    
    private final RestTemplate restTemplate;
    private final String notificationServiceUrl = "http://NOTIFICATIONS-MICROSERVICE/notifications/api/notifications";

    public RemoteNotificationService(@LoadBalanced RestTemplateBuilder builder) {
        this.restTemplate = builder.build();
    }

    public void sendNotification(String title, String message, String username) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setUsername(username);
        
        HttpEntity<Notification> request = new HttpEntity<>(notification, headers);
        restTemplate.postForObject(notificationServiceUrl + "/send", request, Void.class);
    }
}*/