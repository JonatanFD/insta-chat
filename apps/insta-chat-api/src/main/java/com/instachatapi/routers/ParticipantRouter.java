package com.instachatapi.routers;

import com.instachatapi.handlers.ParticipantHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerResponse;

@Configuration
public class ParticipantRouter {

    private final ParticipantHandler participantHandler;

    public ParticipantRouter(ParticipantHandler participantHandler) {
        this.participantHandler = participantHandler;
    }

    @Bean
    public RouterFunction<ServerResponse> participantRoutes() {
        return RouterFunctions.route()
            .GET(
                "/api/chats/{chatName}/participants",
                participantHandler::fetchAllParticipants
            )
            .build();
    }
}
