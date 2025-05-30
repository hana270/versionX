package com.example.orders_microservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class JWTAuthorizationFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(JWTAuthorizationFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            String jwt = request.getHeader("Authorization");
            logger.debug("Authorization header: {}", jwt);

            // Skip JWT validation for public endpoints or missing token
            if (jwt == null || jwt.isEmpty()) {
                logger.debug("No JWT token provided, proceeding without authentication");
                chain.doFilter(request, response);
                return;
            }

            // Validate Bearer token format
            if (!jwt.startsWith(SecParams.PREFIX)) {
                logger.warn("Invalid Authorization header format: {}", jwt);
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Authorization header format");
                return;
            }

            jwt = jwt.substring(SecParams.PREFIX.length()).trim();
            logger.debug("Extracted JWT token: {}", jwt);

            try {
                DecodedJWT decodedJWT = JWT.require(Algorithm.HMAC256(SecParams.SECRET)).build().verify(jwt);
                logger.debug("JWT token verified successfully");

                String username = decodedJWT.getSubject();
                if (username == null || username.isEmpty()) {
                    logger.warn("JWT token missing subject claim");
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token: missing subject");
                    return;
                }

                // Extract claims with null checks
                Long userId = decodedJWT.getClaim("userId").asLong();
                String email = decodedJWT.getClaim("email").asString();
                List<String> roles = decodedJWT.getClaim("roles").asList(String.class);

                if (userId == null) {
                    logger.warn("JWT token missing userId claim");
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token: missing userId");
                    return;
                }

                if (email == null) {
                    logger.warn("JWT token missing email claim, proceeding with default");
                    email = "";
                }

                Collection<GrantedAuthority> authorities = new ArrayList<>();
                if (roles != null) {
                    for (String role : roles) {
                        authorities.add(new SimpleGrantedAuthority(role));
                    }
                } else {
                    logger.warn("No roles found in JWT token, assigning default empty authorities");
                }

                CustomUserDetails userDetails = new CustomUserDetails(userId, username, email, authorities);
                logger.debug("Created CustomUserDetails: userId={}, username={}, email={}", userId, username, email);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
                
                // Store the userId in the authentication details to make it easier to access
                authentication.setDetails(userId);
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
                logger.debug("Authentication set in SecurityContext with userId in details: {}", userId);
            } catch (JWTVerificationException e) {
                logger.error("JWT verification failed: {}", e.getMessage());
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
                return;
            }
        } catch (Exception e) {
            logger.error("Authentication error: {}", e.getMessage(), e);
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Authentication error");
            return;
        }

        chain.doFilter(request, response);
    }
}