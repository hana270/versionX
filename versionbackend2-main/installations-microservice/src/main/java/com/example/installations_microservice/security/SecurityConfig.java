package com.example.installations_microservice.security;

import java.util.Arrays;

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
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Bean
    public JWTAuthorizationFilter jwtAuthorizationFilter() {
        return new JWTAuthorizationFilter();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
       //    .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .addFilterBefore(jwtAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                // Endpoints pour les installateurs
                .requestMatchers(HttpMethod.GET, "/api/installations/installateurs").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/installateurs/by-user/{userId}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/installateurs/by-installateur-id/{id}/userId").permitAll()

                
                .requestMatchers(HttpMethod.GET, "/installations/installateurs/disponibles").permitAll()
                .requestMatchers(HttpMethod.POST, "/installateurs").hasAnyAuthority("ADMIN", "INSTALLATEUR")
                .requestMatchers(HttpMethod.PUT, "/installateurs/**").hasAnyAuthority("ADMIN", "INSTALLATEUR")
                .requestMatchers(HttpMethod.GET, "/installations/installateurs/check-availability").permitAll()

                
                // Endpoints pour les affectations
                //.requestMatchers(HttpMethod.POST, "/affectations/affecterinstallation").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/installations/affectations/affecterinstallation/**").permitAll()                
                .requestMatchers(HttpMethod.GET, "/affectations").permitAll()
                .requestMatchers(HttpMethod.PUT, "/affectations/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/affectations/sync-commande/**").permitAll()                
                //.requestMatchers(HttpMethod.GET, "/affectations").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/affectations/installateur/{installateurId}/**").permitAll()                
                .requestMatchers(HttpMethod.GET, "/api/installations/affectations/installateur/{installateurId}/commandes").permitAll()                
                .requestMatchers(HttpMethod.GET, "/api/installations/affectations/affecter/**").permitAll()                
                .requestMatchers(HttpMethod.PUT, "/api/installations/affectations/{id}/terminer-installation").permitAll()                
                .requestMatchers(HttpMethod.GET, "/api/installations/affectations/commande/{commandeId}/affectation-id").permitAll()                
                .requestMatchers(HttpMethod.GET, "/api/installations/affectations/{affectationId}/installation-status/{installateurId}").permitAll()                

  
                // Endpoints pour la gestion des disponibilités
                .requestMatchers("/api/disponibilites/**").hasAnyAuthority("ADMIN", "INSTALLATEUR")
                
                // Endpoints pour les rapports d'installation
                .requestMatchers("/api/rapports").hasAnyAuthority("ADMIN", "INSTALLATEUR")
                .requestMatchers("/api/rapports/**").hasAnyAuthority("ADMIN", "INSTALLATEUR")
                
                //commandes
                .requestMatchers(HttpMethod.GET, "/api/installations/commandes/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/test/commande/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/test/force-sync-commande/**").permitAll()
                
                //specialité
                .requestMatchers(HttpMethod.GET, "/api/installations/installateurs/force-sync/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/installateurs/by-specialite/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/installateurs/by-specialite/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/installateurs/cleanup/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/installations/installateurs/migrate/**").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/installations/installateurs/{userId}/specialty/**").permitAll()
                
                
                
                // Endpoints Actuator (pour la supervision)
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/management/**").permitAll()
                
                .anyRequest().authenticated()
            );

        return http.build();
    }
    
   /* @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }*/
}