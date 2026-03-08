package com.instachatapi.handlers;

import com.instachatapi.models.Participant;
import com.instachatapi.security.JwtService;
import com.instachatapi.security.PasswordService;
import com.instachatapi.services.ParticipantService;
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
        var token = request.headers().firstHeader("Authorization");
        log.info("Authorization token: {}", token);
        var jwt = token.substring(7);
        var jwtPayload = jwtService.decode(jwt);
        var chatName = request.pathVariable("chatName");

        if (!jwtPayload.chatName().equals(chatName)) {
            return Mono.error(
                new IllegalArgumentException("Chat name mismatch")
            );
        }

        return ServerResponse.ok().body(
            participantService.fetchAllParticipants(chatName),
            Participant.class
        );
    }
}
