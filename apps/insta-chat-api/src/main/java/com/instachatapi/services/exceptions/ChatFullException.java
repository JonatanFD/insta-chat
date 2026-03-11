package com.instachatapi.services.exceptions;

public class ChatFullException extends RuntimeException {
    public ChatFullException(String message) {
        super(message);
    }
}
