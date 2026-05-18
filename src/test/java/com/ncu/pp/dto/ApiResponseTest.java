package com.ncu.pp.dto;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ApiResponseTest {
    @Test
    void okWithDataBuildsSuccessEnvelope() {
        ApiResponse<String> response = ApiResponse.ok("hello");

        assertEquals(200, response.code());
        assertEquals("success", response.message());
        assertEquals("hello", response.data());
    }

    @Test
    void okWithoutDataBuildsEmptySuccessEnvelope() {
        ApiResponse<Void> response = ApiResponse.ok();

        assertEquals(200, response.code());
        assertEquals("success", response.message());
        assertNull(response.data());
    }

    @Test
    void failBuildsErrorEnvelope() {
        ApiResponse<Void> response = ApiResponse.fail(400, "bad request");

        assertEquals(400, response.code());
        assertEquals("bad request", response.message());
        assertNull(response.data());
    }
}
