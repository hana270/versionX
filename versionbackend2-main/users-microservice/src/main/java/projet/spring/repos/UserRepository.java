package projet.spring.repos;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import projet.spring.entities.InstallerSpecialty;
import projet.spring.entities.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
   
    @Query("SELECT u FROM User u WHERE LOWER(u.username) = LOWER(:username)")
    Optional<User> findByUsernameCaseInsensitive(@Param("username") String username);

    Optional<User> findByEmail(String email);
    
    Optional<User> findByEmailIgnoreCase(String email);
    
    List<User> findByRoles_Role(String role);
    
 //// Nouvelle méthode pour filtrer par rôle et spécialité unique
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.role = :role AND u.specialty = :specialty")
    List<User> findByRoles_RoleAndSpecialty(
        @Param("role") String role, 
        @Param("specialty") InstallerSpecialty specialty);
}