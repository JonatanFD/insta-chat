package com.instachatapi.handlers;

import com.instachatapi.models.Participant;
import com.instachatapi.security.JwtService;
import com.instachatapi.services.ParticipantService;
import com.instachatapi.services.exceptions.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

@Component
@Slf4j
public class ParticipantHandler {

    private final ParticipantService participantService;
    private final JwtService jwtService;

    public ParticipantHandler(
        ParticipantService participantService,
        JwtService jwtService
    ) {
        this.participantService = participantService;
        this.jwtService = jwtService;
    }

    public Mono<ServerResponse> fetchAllParticipants(ServerRequest request) {
        return Mono.fromCallable(() -> {
                var token = request.headers().firstHeader("Authorization");
                if (token == null || !token.startsWith("Bearer ")) {
                    throw new UnauthorizedException("Missing or invalid Authorization header");
                }
                var jwt = token.substring(7);
                return jwtService.decode(jwt);
            })
            .flatMap(jwtPayload -> {
                var chatName = request.pathVariable("chatName").trim().replaceAll("\\s+", "_");

                if (!jwtPayload.chatName().equals(chatName)) {
                    return Mono.error(
                        new UnauthorizedException("Chat name mismatch")
                    );
                }

                return ServerResponse.ok().body(
                    participantService.fetchAllParticipants(chatName),
                    Participant.class
                );
            })
            .onErrorResume(GlobalErrorHandler::handleError);
    }
}
