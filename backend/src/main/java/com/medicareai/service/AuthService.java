package com.medicareai.service;

import com.medicareai.dto.AuthResponse;
import com.medicareai.dto.LoginRequest;
import com.medicareai.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
}
