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
    String participantId = payload.participantId();

    log.info("[{}] Participant '{}' ({}) connected", chatName, participantName, participantId);

    // Per-session sink: receives messages forwarded from the shared room channel.
    // Using tryEmitNext with FAIL_FAST so a slow consumer never blocks others.
    Sinks.Many<String> sessionSink = Sinks.many()
      .unicast()
      .onBackpressureBuffer();

    // Register this session's sink into the room so the registry can fan-out
    // incoming Redis Pub/Sub messages to every connected session individually.
    registry.registerSession(chatName, participantId, sessionSink);

    // Announce arrival AFTER the session sink is registered so the "Has joined"
    // message is guaranteed to reach all already-connected peers.
    registry.publish(chatName, participantName + " Has joined");

    // Inbound: forward every received frame to the shared Redis channel.
    Mono<Void> receive = session
      .receive()
      .map(msg -> msg.getPayloadAsText())
      .doOnNext(msg -> registry.publish(chatName, msg))
      .doOnError(err -> log.warn("[{}] Receive error for '{}': {}", chatName, participantName, err.getMessage()))
      .then();

    // Outbound: drain this session's own sink — completely isolated from every
    // other session's sink, so completing or cancelling here affects nobody else.
    Mono<Void> send = session.send(
      sessionSink
        .asFlux()
        .filter(msg -> {
          // Don't echo the participant's own join/leave system messages back to them.
          if (msg.equals(participantName + " Has joined")) return false;
          if (msg.equals(participantName + " Has left"))  return false;
          // Don't echo the participant's own typing events back to them.
          if (msg.contains("\"type\":\"typing\"") && msg.contains("\"senderId\":\"" + participantId + "\"")) return false;
          return true;
        })
        .map(session::textMessage)
        .doOnError(err -> log.warn("[{}] Send error for '{}': {}", chatName, participantName, err.getMessage()))
    );

    return Mono.zip(receive, send)
      .then()
      .doFinally(signal -> {
        log.info("[{}] Participant '{}' ({}) disconnected — signal: {}", chatName, participantName, participantId, signal);

        // Unregister the per-session sink BEFORE publishing "Has left" so the
        // departing participant does not receive their own leave message.
        registry.unregisterSession(chatName, participantId);

        // Complete the session sink so its flux terminates cleanly.
        sessionSink.tryEmitComplete();

        registry.publish(chatName, participantName + " Has left");

        // Best-effort server-side participant cleanup.
        chatService
          .leaveChat(chatName, participantId)
          .onErrorResume(err -> {
            log.error("[{}] leaveChat error for '{}': {}", chatName, participantName, err.getMessage());
            return Mono.empty();
          })
          .subscribe();
      });
  }
}
