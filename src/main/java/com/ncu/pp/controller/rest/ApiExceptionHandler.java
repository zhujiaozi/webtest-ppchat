package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.IOException;

@RestControllerAdvice(basePackages = "com.ncu.pp.controller.rest")
public class ApiExceptionHandler {
    @ExceptionHandler({IllegalArgumentException.class, IOException.class, RuntimeException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.fail(HttpStatus.BAD_REQUEST.value(), ex.getMessage()));
    }
}
