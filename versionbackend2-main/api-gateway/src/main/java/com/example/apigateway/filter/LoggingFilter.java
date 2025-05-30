package com.example.apigateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class LoggingFilter implements GlobalFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(LoggingFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        logger.info("Request path: {}", exchange.getRequest().getPath());
        logger.info("Request method: {}", exchange.getRequest().getMethod());
        logger.info("Request headers: {}", exchange.getRequest().getHeaders());
        
        return chain.filter(exchange)
            .then(Mono.fromRunnable(() -> {
                logger.info("Response status: {}", exchange.getResponse().getStatusCode());
                logger.info("Response headers: {}", exchange.getResponse().getHeaders());
            }));
    }
}