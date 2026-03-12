package com.instachatapi.handlers;

import com.instachatapi.handlers.requests.CreateChatRequest;
import com.instachatapi.handlers.requests.JoinToChatRequest;
import com.instachatapi.handlers.requests.LeaveChaRequest;
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
            .flatMap(req -> {
                if (req.termsAccepted() == null || !req.termsAccepted()) {
                    return ServerResponse.badRequest().bodyValue("You must accept the terms and conditions to create a chat.");
                }
                return chatService.createChat(
                    req.chatName(),
                    req.password(),
                    Instant.now().plusSeconds(2 * 60 * 60) // 2 hours
                ).flatMap(response -> ServerResponse.status(201).bodyValue(response));
            })
            .onErrorResume(GlobalErrorHandler::handleError);
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
            )
            .onErrorResume(GlobalErrorHandler::handleError);
    }

    public Mono<ServerResponse> leaveChat(ServerRequest request) {
        return request
            .bodyToMono(LeaveChaRequest.class)
            .flatMap(req ->
                chatService.leaveChat(
                    request.pathVariable("chatName"),
                    req.participantId()
                )
            )
            .then(ServerResponse.ok().bodyValue("Left the chat successfully"))
            .onErrorResume(GlobalErrorHandler::handleError);
    }
}
