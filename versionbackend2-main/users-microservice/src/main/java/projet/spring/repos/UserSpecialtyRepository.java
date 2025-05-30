package projet.spring.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import projet.spring.entities.User;

import jakarta.transaction.Transactional;
import projet.spring.entities.UserSpecialty;

public interface UserSpecialtyRepository extends JpaRepository<UserSpecialty, Long> {
	@Transactional
    @Modifying
    @Query("DELETE FROM UserSpecialty us WHERE us.user.id = :userId")
    void deleteByUserId(Long userId);
    
    // Ajoutez aussi cette méthode si vous voulez pouvoir supprimer par objet User
    @Transactional
    @Modifying
    @Query("DELETE FROM UserSpecialty us WHERE us.user = :user")
    void deleteByUser(User user);
}