package com.instachatapi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public ReactiveRedisTemplate<String, Object> reactiveRedisTemplate(
        ReactiveRedisConnectionFactory factory
    ) {
        GenericJacksonJsonRedisSerializer serializer =
            GenericJacksonJsonRedisSerializer.builder()
                .typePropertyName("_type")
                .enableUnsafeDefaultTyping()
                .build();

        RedisSerializationContext<String, Object> context =
            RedisSerializationContext.<String, Object>newSerializationContext(
                new StringRedisSerializer()
            )
                .value(serializer)
                .hashKey(new StringRedisSerializer())
                .hashValue(serializer)
                .build();

        return new ReactiveRedisTemplate<>(factory, context);
    }

    @Bean
    public ReactiveRedisTemplate<String, String> reactiveStringRedisTemplate(
        ReactiveRedisConnectionFactory factory
    ) {
        RedisSerializationContext<String, String> context =
            RedisSerializationContext.<String, String>newSerializationContext(
                new StringRedisSerializer()
            )
                .value(new StringRedisSerializer())
                .build();

        return new ReactiveRedisTemplate<>(factory, context);
    }
}
