package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

class ApiExceptionHandlerTest {
    @Test
    void handleBadRequestUsesHttp400AndEnvelope() {
        ApiExceptionHandler handler = new ApiExceptionHandler();

        ResponseEntity<ApiResponse<Void>> response = handler.handleBadRequest(
                new IllegalArgumentException("参数错误")
        );

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().code());
        assertEquals("参数错误", response.getBody().message());
    }
}
