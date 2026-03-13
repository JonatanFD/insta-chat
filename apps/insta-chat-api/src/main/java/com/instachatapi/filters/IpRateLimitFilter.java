package com.instachatapi.filters;

import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.HandlerFilterFunction;
import org.springframework.web.reactive.function.server.HandlerFunction;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

@Component
public class IpRateLimitFilter implements HandlerFilterFunction<ServerResponse, ServerResponse> {

    private final ReactiveRedisTemplate<String, String> redisTemplate;
    private static final int MAX_REQUESTS = 5;
    private static final Duration TTL = Duration.ofHours(24);

    public IpRateLimitFilter(ReactiveRedisTemplate<String, String> reactiveStringRedisTemplate) {
        this.redisTemplate = reactiveStringRedisTemplate;
    }

    @Override
    public Mono<ServerResponse> filter(ServerRequest request, HandlerFunction<ServerResponse> next) {
        String ip = getClientIp(request);
        String key = "rate_limit:chats:create:" + ip;

        return redisTemplate.opsForValue().increment(key)
                .flatMap(count -> {
                    if (count == 1) {
                        return redisTemplate.expire(key, TTL).thenReturn(count);
                    }
                    return Mono.just(count);
                })
                .flatMap(count -> {
                    if (count > MAX_REQUESTS) {
                        return redisTemplate.getExpire(key)
                                .flatMap(duration -> ServerResponse.status(HttpStatus.TOO_MANY_REQUESTS)
                                        .header("X-RateLimit-Reset", String.valueOf(duration.getSeconds()))
                                        .build())
                                .switchIfEmpty(ServerResponse.status(HttpStatus.TOO_MANY_REQUESTS).build());
                    }
                    return next.handle(request);
                });
    }

    private String getClientIp(ServerRequest request) {
        List<String> xForwardedFor = request.headers().header("X-Forwarded-For");
        if (!xForwardedFor.isEmpty()) {
            return xForwardedFor.get(0).split(",")[0].trim();
        }
        return request.remoteAddress()
                .map(addr -> addr.getAddress().getHostAddress())
                .orElse("unknown");
    }
}
