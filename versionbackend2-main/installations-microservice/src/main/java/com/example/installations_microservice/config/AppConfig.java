package com.example.installations_microservice.config;

import org.modelmapper.ModelMapper;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {
    
	// In AppConfig:
	@Bean("defaultRestTemplate")  // <-- Unique name
	@Primary
	public RestTemplate restTemplate() {
	    return new RestTemplate();
	}

	@Bean("loadBalancedRestTemplate")
	@LoadBalanced
	public RestTemplate loadBalancedRestTemplate() {
	    return new RestTemplate();
	}
	
	@Bean
    public ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        // Configuration supplémentaire si nécessaire
        return modelMapper;
    }
}