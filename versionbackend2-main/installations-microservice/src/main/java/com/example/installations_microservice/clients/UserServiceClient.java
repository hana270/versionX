package com.example.installations_microservice.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.installations_microservice.clients.dtos.UserDto;
import java.util.List;

@FeignClient(name = "USERS-MICROSERVICE"/*, url = "http://localhost:8087"*/)
public interface UserServiceClient {
    //    @GetMapping("/api/users/installateursCommmande")

    @GetMapping("/api/users/installateursCommmande")
    List<UserDto> getInstallateursCommmande();
    
    @GetMapping("/api/users/installateurs/filter")
    List<UserDto> getInstallateursBySpecialty(@RequestParam("specialty") String specialty);
    
    @PutMapping("/api/users/installateurs/{userId}/specialty")
    ResponseEntity<UserDto> updateUserSpecialty(
            @PathVariable Long userId, 
            @RequestParam String specialty);
}