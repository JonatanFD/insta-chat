package com.instachatapi.routers;

import com.instachatapi.handlers.ParticipantHandler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import org.springdoc.core.annotations.RouterOperation;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RequestMethod;
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
    @RouterOperation(
            path = "/api/chats/{chatName}/participants",
            method = RequestMethod.GET,
            beanClass = ParticipantHandler.class,
            beanMethod = "fetchAllParticipants",
            operation = @Operation(
                    operationId = "fetchAllParticipants",
                    summary = "Get participants",
                    tags = { "Participants" },
                    parameters = { @Parameter(in = ParameterIn.PATH, name = "chatName", required = true) }
            )
    )
    public RouterFunction<ServerResponse> participantRoutes() {
        return RouterFunctions.route()
                .GET(
                        "/api/chats/{chatName}/participants",
                        participantHandler::fetchAllParticipants
                )
                .build();
    }
}