package com.incident.alert_gateway.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertDeduplicationService {

    private final StringRedisTemplate stringRedisTemplate;
    private static final Duration DEDUP_TTL = Duration.ofMinutes(5);
    private static final String DEDUP_PREFIX = "dedup:alert";
    private final RedisTemplate<Object, Object> redisTemplate;

    public boolean isNew(String alertName, String service){

        String key = DEDUP_PREFIX + alertName + ":" + service;
        Boolean wasAbsent = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", DEDUP_TTL);
        boolean isNew = Boolean.TRUE.equals(wasAbsent);
        if(!isNew){
            log.info("Duplicate alert suppressed - key: {}", key);
        }

        return isNew;
    }
}
