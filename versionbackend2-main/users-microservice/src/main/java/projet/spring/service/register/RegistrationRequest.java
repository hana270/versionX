package projet.spring.service.register;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import projet.spring.entities.InstallerSpecialty;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RegistrationRequest {
    private String username;
    private String password;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String defaultAddress;
    
    // Champ optionnel uniquement pour les installateurs
    private InstallerSpecialty specialty;
    
    public InstallerSpecialty getSpecialty() {
        return specialty;
    }

    public void setSpecialty(InstallerSpecialty specialty) {
        this.specialty = specialty;
    }
    
}