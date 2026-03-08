package com.instachatapi.handlers.requests;

public record CreateChatRequest(
    String chatName,
    String password
) {}
