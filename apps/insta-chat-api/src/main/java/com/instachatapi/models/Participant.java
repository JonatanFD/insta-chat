package com.instachatapi.models;

public record Participant(
    String participantId,
    String username,
    String chatName,
    String publicKey
) {}
