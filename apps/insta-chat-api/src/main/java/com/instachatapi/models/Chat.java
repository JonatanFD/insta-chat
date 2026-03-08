package com.instachatapi.models;

import java.time.Instant;

public record Chat(
    String chatName,
    String password,
    Instant createdAt,
    Instant expireAt
) {}
