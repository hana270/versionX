package com.example.apigateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Mono;

@SpringBootApplication
@EnableDiscoveryClient 
public class ApiGatewayApplication {

	public static void main(String[] args) {
		SpringApplication.run(ApiGatewayApplication.class, args);
	}

}

@RestController
class FallbackController {
    
    @RequestMapping("/fallback/users")
    public Mono<String> fallbackUsers() {
        return Mono.just("User service is not available. Please try again later.");
    }
    
    @RequestMapping("/fallback/orders")
    public Mono<String> fallbackOrders() {
        return Mono.just("Order service is not available. Please try again later.");
    }
    
    @RequestMapping("/fallback/aquatresor")
    public Mono<String> fallbackAquatresor() {
        return Mono.just("Aquatresor service is not available. Please try again later.");
    }
}

