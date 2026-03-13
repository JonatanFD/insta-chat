package com.instachatapi.handlers;

import com.instachatapi.handlers.requests.CreateChatRequest;
import com.instachatapi.handlers.requests.JoinToChatRequest;
import com.instachatapi.handlers.requests.LeaveChaRequest;
import com.instachatapi.services.ChatService;
import com.instachatapi.security.JwtService;
import com.instachatapi.services.exceptions.UnauthorizedException;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

@Component
public class ChatHandler {

    private final ChatService chatService;
    private final JwtService jwtService;

    public ChatHandler(ChatService chatService, JwtService jwtService) {
        this.chatService = chatService;
        this.jwtService = jwtService;
    }

    public Mono<ServerResponse> createChat(ServerRequest request) {
        return request
            .bodyToMono(CreateChatRequest.class)
            .flatMap(req -> {
                if (req.termsAccepted() == null || !req.termsAccepted()) {
                    return ServerResponse.badRequest().bodyValue("You must accept the terms and conditions to create a chat.");
                }
                String sanitizedChatName = req.chatName() != null ? req.chatName().trim().replaceAll("\\s+", "_") : "";
                return chatService.createChat(
                    sanitizedChatName,
                    req.password(),
                    Instant.now().plusSeconds(2 * 60 * 60) // 2 hours
                ).flatMap(response -> ServerResponse.status(201).bodyValue(response));
            })
            .onErrorResume(GlobalErrorHandler::handleError);
    }

    public Mono<ServerResponse> joinToChat(ServerRequest request) {
        return request
            .bodyToMono(JoinToChatRequest.class)
            .flatMap(req -> {
                String sanitizedChatName = request.pathVariable("chatName").trim().replaceAll("\\s+", "_");
                return chatService.joinToChat(
                    sanitizedChatName,
                    req.password(),
                    req.publicKey()
                );
            })
            .flatMap(response ->
                ServerResponse.status(200).bodyValue(response)
            )
            .onErrorResume(GlobalErrorHandler::handleError);
    }

    public Mono<ServerResponse> leaveChat(ServerRequest request) {
        return Mono.fromCallable(() -> {
                var token = request.headers().firstHeader("Authorization");
                if (token == null || !token.startsWith("Bearer ")) {
                    throw new UnauthorizedException("Missing or invalid Authorization header");
                }
                var jwt = token.substring(7);
                return jwtService.decode(jwt);
            })
            .flatMap(jwtPayload -> {
                String sanitizedChatName = request.pathVariable("chatName").trim().replaceAll("\\s+", "_");
                if (!jwtPayload.chatName().equals(sanitizedChatName)) {
                    return Mono.error(new UnauthorizedException("Chat name mismatch"));
                }
                return request.bodyToMono(LeaveChaRequest.class)
                    .flatMap(req -> {
                        // Enforce that the participant leaves using their own ID
                        if (!jwtPayload.participantId().equals(req.participantId())) {
                            return Mono.error(new UnauthorizedException("You can only remove your own participant ID"));
                        }
                        return chatService.leaveChat(
                            sanitizedChatName,
                            req.participantId()
                        );
                    });
            })
            .then(ServerResponse.ok().bodyValue("Left the chat successfully"))
            .onErrorResume(GlobalErrorHandler::handleError);
    }
}
