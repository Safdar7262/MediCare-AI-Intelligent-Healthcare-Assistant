package com.medicareai.controller;

import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.ChangePasswordRequest;
import com.medicareai.dto.UserProfileResponse;
import com.medicareai.entity.User;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.UserRepository;
import com.medicareai.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Returns the profile of whoever the JWT in the Authorization header
     * belongs to. Any authenticated PATIENT, DOCTOR, or ADMIN can call this —
     * it's the simplest way to confirm the token round-trip works end to end.
     */
    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        User user = principal.getUser();
        UserProfileResponse response = UserProfileResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole().getName())
                .active(user.isActive())
                .lastLoginAt(user.getLastLoginAt())
                .build();
        return ApiResponse.success("Profile fetched", response);
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                             @Valid @RequestBody ChangePasswordRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        return ApiResponse.success("Password updated successfully", null);
    }
}
