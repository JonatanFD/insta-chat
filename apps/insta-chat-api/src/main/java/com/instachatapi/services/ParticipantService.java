package com.instachatapi.services;

import com.instachatapi.models.Participant;
import com.instachatapi.repositories.ParticipantRepository;
import com.instachatapi.shared.UserNameFactory;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class ParticipantService {

    private final ParticipantRepository participantRepository;

    public ParticipantService(ParticipantRepository participantRepository) {
        this.participantRepository = participantRepository;
    }

    public Mono<Participant> addParticipant(
        String chatName,
        Instant expireAt,
        String publicKey
    ) {
        return participantRepository
            .getParticipantCountByChatName(chatName)
            .flatMap(count -> {
                if (count >= 2) {
                    return Mono.error(
                        new IllegalStateException("Chat is full")
                    );
                }

                var participant = new Participant(
                    UUID.randomUUID().toString(),
                    UserNameFactory.generate(),
                    chatName,
                    publicKey
                );

                return participantRepository.addParticipant(
                    participant,
                    expireAt
                );
            });
    }

    public Mono<Participant> getParticipant(String participantId) {
        return participantRepository.getParticipant(participantId);
    }

    public Flux<Participant> fetchAllParticipants(String chatName) {
        return participantRepository.getParticipantsByChatName(chatName);
    }
}
