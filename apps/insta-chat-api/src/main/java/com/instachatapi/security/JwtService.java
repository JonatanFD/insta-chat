package com.instachatapi.security;

import com.instachatapi.shared.ChatJwtPayload;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Instant;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secretKey;

    private NimbusJwtEncoder encoder() {
        SecretKeySpec key = new SecretKeySpec(
            secretKey.getBytes(),
            "HmacSHA256"
        );
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    private JwtDecoder decoder() {
        SecretKeySpec key = new SecretKeySpec(
            secretKey.getBytes(),
            "HmacSHA256"
        );
        return NimbusJwtDecoder.withSecretKey(key)
            .macAlgorithm(MacAlgorithm.HS256)
            .build();
    }

    public String encode(ChatJwtPayload payload) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuedAt(Instant.now())
            .claim("chatName", payload.chatName())
            .claim("participantId", payload.participantId())
            .claim("participantName", payload.participantName())
            .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder()
            .encode(JwtEncoderParameters.from(header, claims))
            .getTokenValue();
    }

    public ChatJwtPayload decode(String token) {
        Jwt jwt = decoder().decode(token);
        return new ChatJwtPayload(
            jwt.getClaimAsString("chatName"),
            jwt.getClaimAsString("participantId"),
            jwt.getClaimAsString("participantName")
        );
    }
}
