package com.instachatapi.services;

import com.instachatapi.models.Chat;
import com.instachatapi.repositories.ChatRepository;
import com.instachatapi.security.JwtService;
import com.instachatapi.shared.ChatJwtPayload;

import java.time.Instant;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Slf4j
public class ChatService {

    private final ChatRepository chatRepository;
    private final ParticipantService participantService;
    private final JwtService jwtService;

    private final PasswordEncoder passwordEncoder;

    public ChatService(
            ChatRepository chatRepository,
            ParticipantService participantService,
            JwtService jwtService,
            PasswordEncoder passwordEncoder
    ) {
        this.chatRepository = chatRepository;
        this.participantService = participantService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public Mono<Chat> createChat(
            String chatName,
            String password,
            Instant expireAt
    ) {
        var chat = new Chat(
                chatName,
                passwordEncoder.encode(password),
                Instant.now(),
                expireAt
        );
        return chatRepository.createChat(chat);
    }

    public Mono<Chat> getChat(String chatName) {
        return chatRepository.getChat(chatName);
    }

    // This method adds a participant to a chat and returns a JWT payload containing the chat name and participant ID.
    public Mono<String> joinToChat(
            String chatName,
            String chatPassword,
            String publicKey
    ) {
        log.info(String.format("Looking for: %s", chatName));
        return chatRepository
                .getChat(chatName)
                .switchIfEmpty(
                        Mono.error(new IllegalStateException("Chat not found"))
                )
                .flatMap(chat -> {
                    if (!passwordEncoder.matches(chatPassword, chat.password())) {
                        return Mono.error(
                                new IllegalStateException(
                                        "Incorrect password to the chat"
                                )
                        );
                    }
                    return participantService
                            .addParticipant(chatName, chat.expireAt(), publicKey)
                            .map(participant ->
                                    jwtService.encode(
                                            new ChatJwtPayload(
                                                    chatName,
                                                    participant.participantId(),
                                                    participant.username()
                                            )
                                    )
                            );
                });
    }

    public Mono<Void> leaveChat(
            String chatName,
            String participantId
    ) {
        log.info(String.format("Looking for: %s", chatName));

        return chatRepository
                .getChat(chatName)
                .switchIfEmpty(
                        Mono.error(new IllegalStateException("Chat not found"))
                )
                .flatMap(chat ->
                        participantService
                                .removeParticipant(participantId)
                                .thenReturn("Left the chat successfully")
                ).thenReturn(
                        null
                );
    }
}
