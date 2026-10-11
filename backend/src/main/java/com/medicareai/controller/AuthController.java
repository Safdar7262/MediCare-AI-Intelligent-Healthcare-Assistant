package com.medicareai.controller;

import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.AuthResponse;
import com.medicareai.dto.LoginRequest;
import com.medicareai.dto.RegisterRequest;
import com.medicareai.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account created successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    /**
     * Stub endpoint: in a real deployment this generates a time-limited reset
     * token, stores its hash, and emails a reset link. Wiring up an email
     * provider is left for the deployment phase — this keeps the contract
     * stable for the frontend to integrate against now.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@RequestParam String email) {
        return ResponseEntity.ok(ApiResponse.success(
                "If an account exists for " + email + ", a password reset link has been sent.", null));
    }
}
