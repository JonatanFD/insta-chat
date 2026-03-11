package com.instachatapi.registries;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Sinks;

/**
 * Manages the fan-out of Redis Pub/Sub messages to every active WebSocket
 * session in a room.
 *
 * Each WebSocket session owns a private Sinks.Many<String> (unicast).
 * When a message arrives on the Redis channel "chat:<chatName>", the registry
 * forwards it to EVERY registered session sink for that room individually.
 * This means the lifecycle of one session (connect / disconnect) is completely
 * isolated from every other session — completing or cancelling one sink never
 * affects another.
 *
 * Structure in memory:
 *   roomSessions : chatName  → { participantId → Sinks.Many<String> }
 *   redisListeners: chatName → whether we already subscribed to the channel
 */
@Component
@Slf4j
public class ChatRoomRegistry {

    private final ReactiveRedisTemplate<String, String> redisTemplate;

    // chatName → ( participantId → per-session sink )
    private final Map<String, Map<String, Sinks.Many<String>>> roomSessions =
            new ConcurrentHashMap<>();

    // tracks which Redis channels we are already subscribed to
    private final Map<String, Boolean> redisListeners = new ConcurrentHashMap<>();

    public ChatRoomRegistry(ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // ── Session registration ──────────────────────────────────────────────────

    /**
     * Register a per-session sink for a participant.
     * Also ensures exactly one Redis Pub/Sub listener exists for the room.
     */
    public void registerSession(String chatName, String participantId, Sinks.Many<String> sink) {
        roomSessions
                .computeIfAbsent(chatName, k -> new ConcurrentHashMap<>())
                .put(participantId, sink);

        log.debug("[{}] Session registered for participant '{}'", chatName, participantId);

        ensureRedisListener(chatName);
    }

    /**
     * Remove a participant's sink from the room.
     * The room entry itself is left in place; it will become empty naturally
     * as all participants leave (Redis TTL handles the actual data cleanup).
     */
    public void unregisterSession(String chatName, String participantId) {
        Map<String, Sinks.Many<String>> sessions = roomSessions.get(chatName);
        if (sessions != null) {
            sessions.remove(participantId);
            log.debug("[{}] Session unregistered for participant '{}'. Remaining sessions: {}",
                    chatName, participantId, sessions.size());
        }
    }

    // ── Publishing ────────────────────────────────────────────────────────────

    /**
     * Publish a message to the Redis channel for this room.
     * The Redis listener will then forward it to every registered session sink.
     */
    public void publish(String chatName, String message) {
        redisTemplate.convertAndSend("chat:" + chatName, message)
                .doOnError(err -> log.error("[{}] Failed to publish message: {}", chatName, err.getMessage()))
                .subscribe();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /**
     * Subscribe to the Redis Pub/Sub channel for a room exactly once.
     * Every incoming message is forwarded to all currently registered session
     * sinks for that room.
     */
    private void ensureRedisListener(String chatName) {
        if (redisListeners.putIfAbsent(chatName, Boolean.TRUE) != null) {
            // Already subscribed for this room
            return;
        }

        log.info("[{}] Subscribing to Redis channel 'chat:{}'", chatName, chatName);

        redisTemplate
                .listenToChannel("chat:" + chatName)
                .map(msg -> msg.getMessage())
                .doOnNext(message -> fanOut(chatName, message))
                .doOnError(err -> {
                    log.error("[{}] Redis listener error: {}", chatName, err.getMessage());
                    // Allow a new listener to be created if the connection drops
                    redisListeners.remove(chatName);
                })
                .doOnComplete(() -> {
                    log.info("[{}] Redis listener completed, removing entry", chatName);
                    redisListeners.remove(chatName);
                })
                .subscribe();
    }

    /**
     * Forward a message to every active session sink in the room.
     * Uses tryEmitNext so a back-pressured or cancelled sink is silently skipped.
     */
    private void fanOut(String chatName, String message) {
        Map<String, Sinks.Many<String>> sessions = roomSessions.get(chatName);
        if (sessions == null || sessions.isEmpty()) {
            log.debug("[{}] fanOut: no active sessions, message dropped", chatName);
            return;
        }

        log.debug("[{}] fanOut to {} session(s): {}", chatName, sessions.size(), message);

        sessions.forEach((participantId, sink) -> {
            Sinks.EmitResult result = sink.tryEmitNext(message);
            if (result.isFailure()) {
                log.warn("[{}] Failed to emit to participant '{}': {}", chatName, participantId, result);
            }
        });
    }
}
