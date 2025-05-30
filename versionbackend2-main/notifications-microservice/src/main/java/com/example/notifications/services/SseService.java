package com.example.notifications.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseService {

    private final Map<String, CopyOnWriteArrayList<SseEmitter>> userEmitters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SseEmitter createConnection(String username) {
        SseEmitter emitter = new SseEmitter(0L); // Permanent connection
        userEmitters.computeIfAbsent(username, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> {
            System.out.println("🔌 SSE connection closed for: " + username);
            removeEmitter(username, emitter);
        });

        emitter.onTimeout(() -> {
            System.out.println("⏰ SSE timeout for: " + username);
            removeEmitter(username, emitter);
        });

        emitter.onError((ex) -> {
            System.err.println("❌ SSE error for " + username + ": " + ex.getMessage());
            removeEmitter(username, emitter);
        });

        try {
            emitter.send(SseEmitter.event()
                .name("connected")
                .data("Real-time connection established for " + username)
                .id(String.valueOf(System.currentTimeMillis())));
            System.out.println("✅ SSE connection established successfully for: " + username);
        } catch (IOException e) {
            System.err.println("❌ Error sending connection message: " + e.getMessage());
            removeEmitter(username, emitter);
        }

        return emitter;
    }

    public void sendNotificationToUser(String username, Object data) {
        CopyOnWriteArrayList<SseEmitter> emitters = userEmitters.get(username);
        if (emitters != null && !emitters.isEmpty()) {
            System.out.println("📤 Sending SSE notification to " + username + " (" + emitters.size() + " connections)");
            emitters.removeIf(emitter -> {
                try {
                    String jsonData = objectMapper.writeValueAsString(data);
                    emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(jsonData)
                        .id(String.valueOf(System.currentTimeMillis())));
                    System.out.println("✅ Notification sent successfully to: " + username);
                    return false;
                } catch (IOException e) {
                    System.err.println("❌ Error sending SSE to " + username + ": " + e.getMessage());
                    return true;
                }
            });
            if (emitters.isEmpty()) {
                userEmitters.remove(username);
                System.out.println("🧹 Cleaned up closed connections for: " + username);
            }
        } else {
            System.out.println("⚠️ No active SSE connection for: " + username);
        }
    }

    public void sendNotificationToAll(Object data) {
        System.out.println("📢 Broadcasting notification to all connected users");
        userEmitters.forEach((username, emitters) -> sendNotificationToUser(username, data));
    }

    @Scheduled(fixedRate = 15000) // Send heartbeat every 15 seconds
    public void sendHeartbeat() {
        userEmitters.forEach((username, emitters) -> {
            emitters.removeIf(emitter -> {
                try {
                    emitter.send(SseEmitter.event()
                        .name("heartbeat")
                        .data("ping")
                        .id(String.valueOf(System.currentTimeMillis())));
                    return false;
                } catch (IOException e) {
                    System.err.println("💔 Heartbeat failed for: " + username);
                    return true;
                }
            });
        });
    }

    private void removeEmitter(String username, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emitters = userEmitters.get(username);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                userEmitters.remove(username);
                System.out.println("🗑️ Removed all connections for: " + username);
            }
        }
    }

    public Map<String, Integer> getConnectionStats() {
        Map<String, Integer> stats = new ConcurrentHashMap<>();
        userEmitters.forEach((username, emitters) -> stats.put(username, emitters.size()));
        return stats;
    }

    public int getTotalConnections() {
        return userEmitters.values().stream().mapToInt(CopyOnWriteArrayList::size).sum();
    }
}