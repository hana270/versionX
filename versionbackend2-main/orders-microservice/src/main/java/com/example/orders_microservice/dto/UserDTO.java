package com.example.orders_microservice.dto;
import lombok.*;
@Data
public class UserDTO {
    private Long userId;
    private String nom;
    private String prenom;
    private String email;
}