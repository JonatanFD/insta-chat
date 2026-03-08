package com.instachatapi.handlers;

import com.instachatapi.handlers.requests.CreateChatRequest;
import com.instachatapi.handlers.requests.JoinToChatRequest;
import com.instachatapi.services.ChatService;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

@Component
public class ChatHandler {

    private final ChatService chatService;

    public ChatHandler(ChatService chatService) {
        this.chatService = chatService;
    }

    public Mono<ServerResponse> createChat(ServerRequest request) {
        return request
            .bodyToMono(CreateChatRequest.class)
            .flatMap(req ->
                chatService.createChat(
                    req.chatName(),
                    req.password(),
                    Instant.now().plusSeconds(2 * 60 * 60) // 2 hours
                )
            )
            .flatMap(response ->
                ServerResponse.status(201).bodyValue(response)
            );
    }

    public Mono<ServerResponse> joinToChat(ServerRequest request) {
        return request
            .bodyToMono(JoinToChatRequest.class)
            .flatMap(req ->
                chatService.joinToChat(
                    request.pathVariable("chatName"),
                    req.password(),
                    req.publicKey()
                )
            )
            .flatMap(response ->
                ServerResponse.status(200).bodyValue(response)
            );
    }
}
