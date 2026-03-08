package com.instachatapi.registries;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Sinks;

@Component
public class ChatRoomRegistry {

    private final ReactiveRedisTemplate<String, String> redisTemplate;
    private final Map<String, Sinks.Many<String>> localSinks =
        new ConcurrentHashMap<>();

    public ChatRoomRegistry(
        ReactiveRedisTemplate<String, String> redisTemplate
    ) {
        this.redisTemplate = redisTemplate;
    }

    public Sinks.Many<String> getOrCreateRoom(String chatName) {
        return localSinks.computeIfAbsent(chatName, k -> {
            Sinks.Many<String> sink = Sinks.many()
                .multicast()
                .onBackpressureBuffer();

            redisTemplate
                .listenToChannel("chat:" + chatName)
                .map(msg -> msg.getMessage())
                .doOnNext(sink::tryEmitNext)
                .subscribe();

            return sink;
        });
    }

    public void publish(String chatName, String message) {
        redisTemplate.convertAndSend("chat:" + chatName, message).subscribe();
    }

    public void removeRoom(String chatName) {
        localSinks.remove(chatName);
    }
}
