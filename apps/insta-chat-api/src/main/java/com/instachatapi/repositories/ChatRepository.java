package com.instachatapi.repositories;

import com.instachatapi.models.Chat;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
@Slf4j
public class ChatRepository {

    private final ReactiveRedisTemplate<String, Object> chatTemplate;
    private static final String CHAT_KEY_PREFIX = "chat:";

    public ChatRepository(ReactiveRedisTemplate<String, Object> chatTemplate) {
        this.chatTemplate = chatTemplate;
    }

    public Mono<Chat> createChat(Chat chat) {
        var chatKey = CHAT_KEY_PREFIX + chat.chatName();
        return chatTemplate
                .opsForValue()
                .set(chatKey, chat)
                .then(chatTemplate.expireAt(chatKey, chat.expireAt()))
                .thenReturn(chat)
                .doOnSuccess(c -> log.info("Chat created: {}", c.chatName()));
    }

    public Mono<Chat> getChat(String chatName) {
        var chatKey = CHAT_KEY_PREFIX + chatName;
        return chatTemplate
                .opsForValue()
                .get(chatKey)
                .map(obj -> (Chat) obj);
    }
}
