package com.instachatapi.repositories;

import com.instachatapi.models.Participant;
import java.time.Instant;
import java.util.Map;
import org.springframework.data.redis.core.ReactiveHashOperations;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.core.ReactiveSetOperations;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public class ParticipantRepository {

    private final ReactiveRedisTemplate<String, Object> redisTemplate; // used for setting expiration on both participant hashes and chat participant sets
    private final ReactiveHashOperations<String, String, Object> hashOps; // stores participant details
    private final ReactiveSetOperations<String, String> setOps; // stores only participant IDs for each chat

    private static final String PARTICIPANT_KEY_PREFIX = "participant:";
    private static final String CHAT_PARTICIPANTS_PREFIX =
        "chats:%s:participants";

    public ParticipantRepository(
        ReactiveRedisTemplate<String, Object> redisTemplate,
        ReactiveRedisTemplate<String, String> stringRedisTemplate
    ) {
        this.redisTemplate = redisTemplate;
        this.hashOps = redisTemplate.opsForHash();
        this.setOps = stringRedisTemplate.opsForSet();
    }

    private String buildParticipantKey(String participantId) {
        return PARTICIPANT_KEY_PREFIX + participantId;
    }

    private String buildChatParticipantsKey(String chatName) {
        return String.format(CHAT_PARTICIPANTS_PREFIX, chatName);
    }

    public Mono<Participant> addParticipant(
        Participant participant,
        Instant expirationTime
    ) {
        String participantKey = buildParticipantKey(
            participant.participantId()
        );
        String chatKey = buildChatParticipantsKey(participant.chatName());

        Mono<Boolean> saveHash = hashOps
            .putAll(
                participantKey,
                Map.of(
                    "participantId",
                    participant.participantId(),
                    "username",
                    participant.username(),
                    "chatName",
                    participant.chatName(),
                    "publicKey",
                    participant.publicKey()
                )
            )
            .then(redisTemplate.expireAt(participantKey, expirationTime));

        Mono<Long> addToSet = setOps
            .add(chatKey, participant.participantId())
            .flatMap(added -> {
                if (added > 0) {
                    return redisTemplate
                        .expireAt(chatKey, expirationTime)
                        .thenReturn(added);
                }
                return Mono.just(added);
            });

        return saveHash.then(addToSet).thenReturn(participant);
    }

    public Flux<Participant> getParticipantsByChatName(String chatName) {
        String chatKey = buildChatParticipantsKey(chatName);

        return setOps.members(chatKey).flatMap(this::getParticipant);
    }

    public Mono<Long> getParticipantCountByChatName(String chatName) {
        String chatKey = buildChatParticipantsKey(chatName);
        return setOps.size(chatKey);
    }

    public Mono<Participant> getParticipant(String participantId) {
        String key = buildParticipantKey(participantId);

        return hashOps
            .entries(key)
            .collectMap(Map.Entry::getKey, Map.Entry::getValue)
            .filter(map -> !map.isEmpty())
            .map(map ->
                new Participant(
                    (String) map.get("participantId"),
                    (String) map.get("username"),
                    (String) map.get("chatName"),
                    (String) map.get("publicKey")
                )
            );
    }
}
