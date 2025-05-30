package com.example.gestionbassins.security;

import java.io.*;
import java.util.*;
import java.util.Collections;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled= true)
public class SecurityConfig {
    
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }
    
    @Bean
    public JWTAuthorizationFilter jwtAuthorizationFilter() {
        return new JWTAuthorizationFilter();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
           //enlève à cause d'api gateway
            //.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .addFilterBefore(jwtAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
	            // Gestion des bassins
	            .requestMatchers("/api/addbassin").hasAuthority("ADMIN")
	            .requestMatchers("/api/addBassinWithImages/**").hasAuthority("ADMIN")
	            .requestMatchers("/api/all").permitAll()
	            .requestMatchers("/api/getbyid/**").permitAll()
	            .requestMatchers("/api/imagesBassin/**").permitAll()
	            .requestMatchers("/api/updateBassinWithImg/**").hasAuthority("ADMIN")
	            .requestMatchers("/api/updatebassin/**").hasAuthority("ADMIN")
	            .requestMatchers("/api/deletebassin/**").hasAuthority("ADMIN")
	            .requestMatchers("/api/image/**").permitAll()
	            .requestMatchers("/api/categories/**").permitAll()
//bassins personnaliser 
 		
	            .requestMatchers("/api/bassinpersonnalise/ajouterBassinPersonnalise/**").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/getAllBassinPersonnalise").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/detailBassinPersonnalise/**").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/supprimerBassinPersonnalise/**").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/mettreAJourBassinPersonnalise/**").permitAll()
	            .requestMatchers("/api/imagespersonnalise/**").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/options/**").permitAll()
	            	            

	            // Gestion des avis
	            .requestMatchers("/api/avis/all").permitAll() // Tout le monde peut voir les avis
	            .requestMatchers("/api/avis/bassin/**").permitAll() // Avis par bassin accessible à tous
	            .requestMatchers("/api/avis/add/**").authenticated() // Seuls les utilisateurs authentifiés peuvent ajouter des avis
	            .requestMatchers(HttpMethod.PUT, "/api/avis/update/**").authenticated() // Authentification requise pour modifier
	            .requestMatchers(HttpMethod.DELETE, "/api/avis/delete/**").authenticated()
	            .requestMatchers("/api/avis/user/**").authenticated() // Seuls les utilisateurs authentifiés peuvent voir leurs avis
	            
	            // Gestion des promotions
	            .requestMatchers("/api/promotions/add").hasAuthority("ADMIN")
	            .requestMatchers("/api/promotions/bassins").permitAll()
		           
	            .requestMatchers("/api/promotions/update/**").hasAuthority("ADMIN")
	            .requestMatchers("/api/promotions/applyToBassins/**").hasAuthority("ADMIN")
	            .requestMatchers("/api/promotions/applyToCategorie/**").hasAuthority("ADMIN")
	            .requestMatchers("/api/promotions/all").permitAll()
	            .requestMatchers("/api/promotions/**").permitAll()
	            .requestMatchers("/api/promotions/delete/**").hasAuthority("ADMIN")
	            
	            
	            // Gestion des stocks
	            .requestMatchers("/api/{id}/archiver").permitAll()
	            .requestMatchers("/api/{id}/desarchiver").permitAll()
	            .requestMatchers("/api/{id}/mettre-a-jour-quantite").permitAll()
	            .requestMatchers("/api/non-archives").permitAll()
	            .requestMatchers("/api/archives").permitAll()
	            .requestMatchers("/api/transactions").permitAll()
	            .requestMatchers("/api/notifier-stock-faible").permitAll()
	           
	            .requestMatchers("/api/{id}/mettre-sur-commande").permitAll()
	            .requestMatchers("/api/api/bassins/{id}/stock").permitAll()
		           
	            
	            //Notifications
	            
	            .requestMatchers("/api/notifications","/api/notifications/").hasAuthority("ADMIN")
	            
	            .requestMatchers("/api/notifications/**").hasAuthority("ADMIN")
	            .requestMatchers("/api/notifications/read-all ").hasAuthority("ADMIN")
	            .requestMatchers("/api/notifications/{id}/read").hasAuthority("ADMIN")
	              
	          //bassins personnaliser 
	            .requestMatchers("/api/bassinpersonnalise/ajouterBassinPersonnalise/**").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/getAllBassinPersonnalise").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/detailBassinPersonnalise/**").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/supprimerBassinPersonnalise/**").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/mettreAJourBassinPersonnalise/**").permitAll()
	            .requestMatchers("/api/imagespersonnalise/**").permitAll()
	            .requestMatchers("/api/bassinpersonnalise/options/**").permitAll()
	            	            
	            .requestMatchers("/api/bassinpersonnalise/accessoires/{id}").permitAll()
		           .requestMatchers("/api/bassinpersonnalise/accessoires/by-ids").permitAll()
		           
	            
	            //Panier
	            .requestMatchers("/api/panier/**").permitAll()
	            .requestMatchers("/api/panier/items").permitAll()
	            .requestMatchers("/api/panier/items/{itemId}").permitAll()
	            .requestMatchers("/api/panier/user/{user_id}").permitAll()
	            .requestMatchers("/api/panier/user/{user_id}/add").permitAll()
	            .requestMatchers("/api/panier/migrate").permitAll()
	            .requestMatchers("/api/panier/**").permitAll()
	            .requestMatchers("/api/panier/items/**").permitAll()
	            
	            // Panier - permettre l'accès anonyme
                .requestMatchers(HttpMethod.GET, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/panier/**").permitAll()
                
                
	         // For notifications
	         /*   .requestMatchers("/api/notifications").hasAuthority("ADMIN")
	            .requestMatchers("/api/notifications/**").hasAuthority("ADMIN")*/

	            .requestMatchers("/api/notifications/**").permitAll()  // Allow all notification endpoints
	            .requestMatchers("/notifications/api/notifications/**").permitAll()  // Allow microservice endpoints
	            // For non-archived items
	           // .requestMatchers("/api/non-archives").hasAuthority("ADMIN")
		
	            .anyRequest().permitAll()
	        );

	    // Add JWT filter before UsernamePasswordAuthenticationFilter
        http.addFilterBefore(new JWTAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
	}
	
    //enlève à cause de api gateway
    /*
	 public CorsConfigurationSource corsConfigurationSource() {
	        CorsConfiguration configuration = new CorsConfiguration();
	        configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
	        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
	        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "X-Session-ID"));
	        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Session-ID"));
	        configuration.setAllowCredentials(true);
	        configuration.setMaxAge(3600L);

	        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
	        source.registerCorsConfiguration("/**", configuration);
	        return source;
	    }
	 */
}