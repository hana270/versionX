package com.example.orders_microservice.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class JwtTokenService {
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenService.class);
    private final Algorithm algorithm;

    public JwtTokenService() {
        this.algorithm = Algorithm.HMAC256(SecParams.SECRET);
    }

    public String getUsernameFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            String username = decodedJWT.getSubject();
            if (username == null) {
                logger.warn("No subject claim found in token");
                throw new IllegalArgumentException("Token invalide: missing subject");
            }
            return username;
        } catch (JWTVerificationException e) {
            logger.error("Token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Token invalide", e);
        }
    }

    public List<String> getRolesFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            List<String> roles = decodedJWT.getClaim("roles").asList(String.class);
            return roles != null ? roles : Collections.emptyList();
        } catch (JWTVerificationException e) {
            logger.error("Token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Token invalide", e);
        }
    }

    public String getEmailFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            String email = decodedJWT.getClaim("email").asString();
            return email != null ? email : "";
        } catch (JWTVerificationException e) {
            logger.error("Token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Token invalide", e);
        }
    }

    public Long getUserIdFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            Long userId = decodedJWT.getClaim("userId").asLong();
            if (userId == null) {
                logger.warn("No userId claim found in token");
                throw new IllegalArgumentException("Token invalide: missing userId");
            }
            return userId;
        } catch (JWTVerificationException e) {
            logger.error("Token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Token invalide", e);
        }
    }

    public String getProfileImageFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            return decodedJWT.getClaim("profileImage").asString();
        } catch (JWTVerificationException e) {
            logger.warn("Failed to extract profileImage: {}", e.getMessage());
            return null;
        }
    }
}