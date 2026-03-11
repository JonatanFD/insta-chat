package com.instachatapi.routers;

import com.instachatapi.handlers.ChatHandler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import org.springdoc.core.annotations.RouterOperation;
import org.springdoc.core.annotations.RouterOperations;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RequestMethod;
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
    @RouterOperations({
            @RouterOperation(
                    path = "/api/chats/{chatName}/join",
                    method = RequestMethod.POST,
                    beanClass = ChatHandler.class,
                    beanMethod = "joinToChat",
                    operation = @Operation(
                            operationId = "joinToChat",
                            summary = "Join a chat",
                            tags = { "Chats" },
                            parameters = { @Parameter(in = ParameterIn.PATH, name = "chatName", required = true) }
                    )
            ),
            @RouterOperation(
                    path = "/api/chats/{chatName}/leave",
                    method = RequestMethod.DELETE,
                    beanClass = ChatHandler.class,
                    beanMethod = "leaveChat",
                    operation = @Operation(
                            operationId = "leaveChat",
                            summary = "Leave a chat",
                            tags = { "Chats" },
                            parameters = { @Parameter(in = ParameterIn.PATH, name = "chatName", required = true) }
                    )
            ),
            @RouterOperation(
                    path = "/api/chats",
                    method = RequestMethod.POST,
                    beanClass = ChatHandler.class,
                    beanMethod = "createChat",
                    operation = @Operation(
                            operationId = "createChat",
                            summary = "Create a new chat",
                            tags = { "Chats" }
                    )
            )
    })
    public RouterFunction<ServerResponse> chatRoutes() {
        return RouterFunctions.route()
                .POST("/api/chats/{chatName}/join", chatHandler::joinToChat)
                .DELETE("/api/chats/{chatName}/leave", chatHandler::leaveChat)
                .POST("/api/chats", chatHandler::createChat)
                .build();
    }
}