package projet.spring.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import projet.spring.service.UserService;

import java.util.Arrays;
import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final UserService userService;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;

    public SecurityConfig(UserService userService, BCryptPasswordEncoder bCryptPasswordEncoder) {
        this.userService = userService;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, AuthenticationManager authManager) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.disable())
            //enlève à cause de api gateway
           // .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    "/api/users/login", 
                    "/api/users/register", 
                  //  "/api/users/verifyEmail/**", 
                    "/api/users/verify-email/**", 
                    "/error",
                    "/api/users/send-installer-invitation", 
                    "/api/users/registerinstaller",
                    "/api/users/resend-verification",
                    "/api/users/request-reset-password", 
                    "/api/users/reset-password", 
                    "/api/users/validate-code",
                    "/api/users/all",
                    
                    /**** INSTALLATEUR *****/
                    "/api/users/installateursCommmande",      
                    "/api/users/installateurs/filter/**",
                    "/api/users/installateurs/{userId}/specialty/**",
                    
                    
                    "/uploads/**",

     "/photos_profile/**", 
                    "/api/users/photos_profile/**", 
                    "/webjars/**"
                ).permitAll()
                .requestMatchers("/users/userProfile", "/uploadProfileImage", "/api/users/username/**").authenticated()
                .anyRequest().authenticated())
            .addFilter(new JWTAuthenticationFilter(authManager, userService))
            .addFilterBefore(new JWTAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class);
        	
        return http.build();
    }
  
}