package projet.spring.service.register;

import java.util.Calendar;
import java.util.Date;

import jakarta.persistence.*;
import lombok.*;
import projet.spring.entities.InstallerSpecialty;
import projet.spring.entities.User;

@Data
@Entity
@NoArgsConstructor
public class VerificationToken {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	private String token;
	private Date expirationTime;
	private static final int EXPIRATION_TIME = 15;

	  @ManyToOne(fetch = FetchType.LAZY)
	    @JoinColumn(name = "user_id", nullable = false)
	    private User user;
	  
	  @Enumerated(EnumType.STRING)
	    private InstallerSpecialty installerSpecialty;
	
	  public VerificationToken(String token, User user, InstallerSpecialty specialty) {
		    this(token, user); // Réutilisation du constructeur principal
		    this.installerSpecialty = specialty;
		}
	  
	public VerificationToken(String token, User user) {
		super();
		this.token = token;
		this.user = user;
		this.expirationTime = this.getTokenExpirationTime();
	}
	public VerificationToken(String token) {
		super();
		this.token = token;
		this.expirationTime = this.getTokenExpirationTime();
	}
	public Date getTokenExpirationTime() {
		Calendar calendar = Calendar.getInstance();
		calendar.setTimeInMillis(new Date().getTime());
		calendar.add(Calendar.MINUTE, EXPIRATION_TIME);
		return new Date(calendar.getTime().getTime());
	}
	
	public boolean isExpired() {
	    return expirationTime.before(new Date());
	}

}