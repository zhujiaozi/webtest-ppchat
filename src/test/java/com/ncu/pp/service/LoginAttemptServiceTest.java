package com.ncu.pp.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

class LoginAttemptServiceTest {

    @Test
    void locksAccountAfterFiveFailures() {
        LoginAttemptService service = new LoginAttemptService(
                Clock.fixed(Instant.parse("2026-05-30T10:00:00Z"), ZoneId.of("UTC"))
        );

        for (int i = 0; i < 4; i++) {
            assertTrue(service.recordFailure("user", "alice").isEmpty());
        }

        var lockMessage = service.recordFailure("user", "alice");

        assertTrue(lockMessage.isPresent());
        assertEquals("密码错误次数过多，请 3 分钟后再试", lockMessage.get());
        assertTrue(service.getLockMessage("user", "alice").isPresent());
    }

    @Test
    void successfulLoginClearsFailureCount() {
        LoginAttemptService service = new LoginAttemptService(
                Clock.fixed(Instant.parse("2026-05-30T10:00:00Z"), ZoneId.of("UTC"))
        );

        service.recordFailure("admin", "root");
        service.recordFailure("admin", "root");
        service.recordSuccess("admin", "root");

        assertTrue(service.getLockMessage("admin", "root").isEmpty());
        assertTrue(service.recordFailure("admin", "root").isEmpty());
    }

    @Test
    void scopesAreTrackedSeparately() {
        LoginAttemptService service = new LoginAttemptService(
                Clock.fixed(Instant.parse("2026-05-30T10:00:00Z"), ZoneId.of("UTC"))
        );

        for (int i = 0; i < 5; i++) {
            service.recordFailure("user", "same-name");
        }

        assertTrue(service.getLockMessage("user", "same-name").isPresent());
        assertTrue(service.getLockMessage("admin", "same-name").isEmpty());
    }
}
