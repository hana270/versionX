package projet.spring.entities;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "users_specialities")
public class UserSpecialty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InstallerSpecialty specialty;

    // Constructeur par défaut
    public UserSpecialty() {}

    // Constructeur avec paramètres
    public UserSpecialty(User user, InstallerSpecialty specialty) {
        this.user = user;
        this.specialty = specialty;
    }
}