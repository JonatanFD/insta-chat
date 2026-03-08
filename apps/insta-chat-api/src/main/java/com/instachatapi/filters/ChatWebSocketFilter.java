package com.instachatapi.filters;

import com.instachatapi.security.JwtService;
import com.instachatapi.shared.ChatJwtPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
@Slf4j
public class ChatWebSocketFilter implements WebFilter {

    private final JwtService jwtService;

    public ChatWebSocketFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        if (!path.startsWith("/ws/chats/")) {
            return chain.filter(exchange);
        }

        String token = exchange.getRequest().getQueryParams().getFirst("token");

        if (token == null) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        try {
            ChatJwtPayload payload = jwtService.decode(token);

            String chatNameFromUrl = path
                .substring("/ws/chats/".length())
                .replace("/", "");

            if (!payload.chatName().equals(chatNameFromUrl)) {
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                return exchange.getResponse().setComplete();
            }

            return chain.filter(exchange);
        } catch (Exception e) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }
}
