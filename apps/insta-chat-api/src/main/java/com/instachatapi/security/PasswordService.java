package com.instachatapi.security;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class PasswordService {

    private final PasswordEncoder encoder;

    public PasswordService(PasswordEncoder encoder) {
        this.encoder = encoder;
    }

    public String hash(String raw) {
        return encoder.encode(raw);
    }

    public boolean verify(String raw, String hashed) {
        return encoder.matches(raw, hashed);
    }
}
