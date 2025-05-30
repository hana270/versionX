package com.example.orders_microservice.security;

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

import java.util.Arrays;

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
            //.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                // Public endpoints (no authentication required)
                .requestMatchers("/api/panier/**").permitAll() // Allow all panier endpoints for both authenticated and non-authenticated users
                //.requestMatchers(HttpMethod.GET, "/api/panier/commandes/{numeroCommande}").permitAll() // Kept for clarity
                .requestMatchers("/api/panier/commandes/**").permitAll()   

                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/register").permitAll()

                // Authenticated endpoints (require JWT)
                .requestMatchers(HttpMethod.POST, "/api/panier/commandes").authenticated() // Order creation
                .requestMatchers("/api/panier/payments/**").authenticated() // Payment endpoints
                .requestMatchers("/api/panier/non-archives").hasAuthority("ADMIN") // Admin-only
                .requestMatchers("/api/panier/commandes/admin/**").hasAuthority("ADMIN") // Admin-only

                // All other requests require authentication
                .anyRequest().authenticated()
            );

        return http.build();
    }

}