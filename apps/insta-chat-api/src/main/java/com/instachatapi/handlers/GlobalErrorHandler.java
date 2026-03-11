package com.instachatapi.handlers;
import com.instachatapi.services.exceptions.ChatFullException;
import com.instachatapi.services.exceptions.ChatNotFoundException;
import com.instachatapi.services.exceptions.InvalidPasswordException;
import com.instachatapi.services.exceptions.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;
@Slf4j
public class GlobalErrorHandler {
    private GlobalErrorHandler() {}
    public static Mono<ServerResponse> handleError(Throwable error) {
        log.error("Request error: {}", error.getMessage());
        if (error instanceof ChatNotFoundException) {
            return buildErrorResponse(HttpStatus.NOT_FOUND, error.getMessage());
        }
        if (error instanceof InvalidPasswordException) {
            return buildErrorResponse(HttpStatus.UNAUTHORIZED, error.getMessage());
        }
        if (error instanceof UnauthorizedException) {
            return buildErrorResponse(HttpStatus.UNAUTHORIZED, error.getMessage());
        }
        if (error instanceof ChatFullException) {
            return buildErrorResponse(HttpStatus.CONFLICT, error.getMessage());
        }
        if (error instanceof IllegalArgumentException) {
            return buildErrorResponse(HttpStatus.BAD_REQUEST, error.getMessage());
        }
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }
    private static Mono<ServerResponse> buildErrorResponse(HttpStatus status, String message) {
        return ServerResponse.status(status).bodyValue(new ErrorResponse(message));
    }
}
