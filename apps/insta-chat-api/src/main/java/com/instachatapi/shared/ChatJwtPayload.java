package com.instachatapi.shared;

public record ChatJwtPayload(
    String chatName,
    String participantId,
    String participantName
) {
    @Override
    public final String toString() {
        return String.format(
            "JWT Payload has chatName=%s and participantId=%s",
            chatName,
            participantId
        );
    }
}
