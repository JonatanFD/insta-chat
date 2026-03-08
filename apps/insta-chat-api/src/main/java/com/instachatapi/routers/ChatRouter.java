package com.instachatapi.routers;

import com.instachatapi.handlers.ChatHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerResponse;

@Configuration
public class ChatRouter {

    private final ChatHandler chatHandler;

    public ChatRouter(ChatHandler chatHandler) {
        this.chatHandler = chatHandler;
    }

    @Bean
    public RouterFunction<ServerResponse> chatRoutes() {
        return RouterFunctions.route()
                .POST("/api/chats/{chatName}/join", chatHandler::joinToChat)
                .DELETE("/api/chats/{chatName}/leave", chatHandler::joinToChat)
                .POST("/api/chats", chatHandler::createChat)
                .build();
    }
}
