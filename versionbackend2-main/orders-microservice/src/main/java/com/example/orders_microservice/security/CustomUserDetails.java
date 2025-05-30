package com.example.orders_microservice.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;

public class CustomUserDetails implements UserDetails {
    private final Long userId;
    private final String username;
    private final String email;
    private final String profileImage;
    private final Collection<? extends GrantedAuthority> authorities;
    private final String password;
    private final boolean enabled;

    public CustomUserDetails(Long userId, String username, String email, 
                            Collection<? extends GrantedAuthority> authorities) {
        this.userId = userId;
        this.username = username;
        this.email = email != null ? email : "";
        this.profileImage = null;
        this.authorities = authorities != null ? authorities : new ArrayList<>();
        this.password = null; // JWT-based auth doesn't use password
        this.enabled = true;
    }

    public CustomUserDetails(Long userId, String username, String email) {
        this(userId, username, email, new ArrayList<>());
    }

    public Long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getProfileImage() {
        return profileImage;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}