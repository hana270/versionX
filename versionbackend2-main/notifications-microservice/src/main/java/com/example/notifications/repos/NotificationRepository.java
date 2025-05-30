package com.example.notifications.repos;

import com.example.notifications.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUsername(String username);

    List<Notification> findByUsernameAndReadFalse(String username);

    List<Notification> findByType(String type);

    List<Notification> findByUsernameAndReadFalseAndType(String username, String type);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.username = :username AND n.read = false")
    long countUnreadByUsername(@Param("username") String username);

    @Query("SELECT n FROM Notification n WHERE n.username = :username ORDER BY n.date DESC")
    List<Notification> findLatestByUsername(@Param("username") String username);

    List<Notification> findByReadFalse();

    // Optimized query for recent notifications
    @Query("SELECT n FROM Notification n WHERE n.username = :username ORDER BY n.date DESC")
    List<Notification> findTop10ByUsername(@Param("username") String username);
}