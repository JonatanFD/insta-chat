package com.instachatapi.config;

import com.instachatapi.handlers.ChatWebSocketHandler;
import java.util.HashMap;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy;

@Configuration
public class WebSocketConfig {

    @Bean
    public HandlerMapping webSocketHandlerMapping(
        ChatWebSocketHandler handler
    ) {
        Map<String, WebSocketHandler> map = new HashMap<>();
        map.put("/ws/chats/{chatName}", handler);

        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(map);
        mapping.setOrder(-1); // determine the order relative to other handler mappings
        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter(
                new org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService(
                        new ReactorNettyRequestUpgradeStrategy(
                                reactor.netty.http.server.WebsocketServerSpec.builder()
                                        .maxFramePayloadLength(2 * 1024 * 1024) // 2MB
                        )
                )
        );
    }
}
