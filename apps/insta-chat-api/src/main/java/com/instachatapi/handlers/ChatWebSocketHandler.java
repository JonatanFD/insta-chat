package com.instachatapi.handlers;

import com.instachatapi.registries.ChatRoomRegistry;
import com.instachatapi.security.JwtService;
import com.instachatapi.shared.ChatJwtPayload;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

@Component
public class ChatWebSocketHandler implements WebSocketHandler {

    private final ChatRoomRegistry registry;
    private final JwtService jwtService;

    public ChatWebSocketHandler(
        ChatRoomRegistry registry,
        JwtService jwtService
    ) {
        this.registry = registry;
        this.jwtService = jwtService;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String token = session
            .getHandshakeInfo()
            .getUri()
            .getQuery()
            .replace("token=", "");

        ChatJwtPayload payload = jwtService.decode(token);

        String chatName = payload.chatName();
        String participantName = payload.participantName();

        Sinks.Many<String> room = registry.getOrCreateRoom(chatName);

        Mono<Void> receive = session
            .receive()
            .map(msg -> msg.getPayloadAsText())
            .doOnNext(msg -> registry.publish(chatName, msg))
            .doFinally(signal ->
                registry.publish(chatName, participantName + " Has left")
            )
            .then();

        Mono<Void> send = session.send(room.asFlux().map(session::textMessage));

        registry.publish(chatName, participantName + " Has joined");

        return Mono.zip(receive, send).then();
    }
}
