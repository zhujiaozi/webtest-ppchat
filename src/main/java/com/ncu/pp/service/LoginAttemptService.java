package com.ncu.pp.service;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class LoginAttemptService {

    static final int MAX_FAILED_ATTEMPTS = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(3);

    private final ConcurrentMap<String, LoginAttempt> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptService() {
        this(Clock.systemDefaultZone());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    public Optional<String> getLockMessage(String scope, String username) {
        String key = buildKey(scope, username);
        LoginAttempt attempt = attempts.get(key);
        if (attempt == null || attempt.lockedUntil == null) {
            return Optional.empty();
        }

        Instant now = Instant.now(clock);
        if (now.isBefore(attempt.lockedUntil)) {
            return Optional.of(buildLockMessage(attempt.lockedUntil, now));
        }

        attempts.remove(key, attempt);
        return Optional.empty();
    }

    public Optional<String> recordFailure(String scope, String username) {
        String key = buildKey(scope, username);
        Instant now = Instant.now(clock);
        LoginAttempt attempt = attempts.compute(key, (ignored, current) -> {
            if (current == null || current.lockedUntil != null && !now.isBefore(current.lockedUntil)) {
                current = new LoginAttempt(0, null);
            }

            int failedCount = current.failedCount + 1;
            Instant lockedUntil = failedCount >= MAX_FAILED_ATTEMPTS ? now.plus(LOCK_DURATION) : null;
            return new LoginAttempt(failedCount, lockedUntil);
        });

        if (attempt.lockedUntil != null && now.isBefore(attempt.lockedUntil)) {
            return Optional.of(buildLockMessage(attempt.lockedUntil, now));
        }
        return Optional.empty();
    }

    public void recordSuccess(String scope, String username) {
        attempts.remove(buildKey(scope, username));
    }

    private String buildKey(String scope, String username) {
        String safeScope = scope == null ? "" : scope.trim().toLowerCase(Locale.ROOT);
        String safeUsername = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        return safeScope + ":" + safeUsername;
    }

    private String buildLockMessage(Instant lockedUntil, Instant now) {
        long remainingSeconds = Math.max(1, Duration.between(now, lockedUntil).toSeconds());
        long remainingMinutes = (long) Math.ceil(remainingSeconds / 60.0);
        return "密码错误次数过多，请 " + remainingMinutes + " 分钟后再试";
    }

    private record LoginAttempt(int failedCount, Instant lockedUntil) {
    }
}
