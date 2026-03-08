package com.instachatapi.handlers;

import com.instachatapi.registries.ChatRoomRegistry;
import com.instachatapi.security.JwtService;
import com.instachatapi.services.ChatService;
import com.instachatapi.shared.ChatJwtPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

@Component
@Slf4j
public class ChatWebSocketHandler implements WebSocketHandler {

  private final ChatRoomRegistry registry;
  private final JwtService jwtService;
  private final ChatService chatService;

  public ChatWebSocketHandler(
    ChatRoomRegistry registry,
    JwtService jwtService,
    ChatService chatService
  ) {
    this.registry = registry;
    this.jwtService = jwtService;
    this.chatService = chatService;
  }

  @Override
  public Mono<Void> handle(WebSocketSession session) {
    ChatJwtPayload payload = jwtService.decode(
      session.getHandshakeInfo().getUri().getQuery().replace("token=", "")
    );
    String chatName = payload.chatName();
    String participantName = payload.participantName();

    Sinks.Many<String> room = registry.getOrCreateRoom(chatName);

    // Publicar ANTES de construir el flux de send,
    // así el nuevo participante no recibe su propio joined
    registry.publish(chatName, participantName + " Has joined");

    Mono<Void> receive = session
      .receive()
      .map(msg -> msg.getPayloadAsText())
      .doOnNext(msg -> registry.publish(chatName, msg))
      .then();

    // Skipear el primer mensaje si es el "joined" propio — alternativa más robusta:
    Mono<Void> send = session.send(
      room
        .asFlux()
        .filter(msg -> {
          // El propio participante no ve su propio sistema joined/left
          if (msg.equals(participantName + " Has joined")) return false;
          if (msg.equals(participantName + " Has left")) return false;
          return true;
        })
        .map(session::textMessage)
    );

    return Mono.zip(receive, send)
      .then()
      .doFinally(signal ->
        registry.publish(chatName, participantName + " Has left")
      )
      .then(
        Mono.defer(() ->
          chatService
            .leaveChat(chatName, payload.participantId())
            .onErrorResume(err -> {
              log.error("Error on leaveChat: {}", err.getMessage());
              return Mono.empty();
            })
        )
      );
  }
}
