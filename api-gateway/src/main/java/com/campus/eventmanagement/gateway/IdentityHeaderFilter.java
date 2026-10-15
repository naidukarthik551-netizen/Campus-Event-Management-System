package com.campus.eventmanagement.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class IdentityHeaderFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest sanitizedRequest = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove("X-User-Id");
                    headers.remove("X-User-Role");
                })
                .build();
        ServerWebExchange sanitizedExchange = exchange.mutate().request(sanitizedRequest).build();

        return sanitizedExchange.getPrincipal()
                .map(principal -> {
                    if (principal instanceof JwtAuthenticationToken authentication) {
                        ServerHttpRequest authenticatedRequest = sanitizedExchange.getRequest().mutate()
                                .headers(headers -> {
                                    headers.set("X-User-Id", String.valueOf(authentication.getToken().getClaims().get("userId")));
                                    headers.set("X-User-Role", String.valueOf(authentication.getToken().getClaims().get("role")));
                                })
                                .build();
                        return sanitizedExchange.mutate().request(authenticatedRequest).build();
                    }
                    return sanitizedExchange;
                })
                .defaultIfEmpty(sanitizedExchange)
                .flatMap(chain::filter);
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
