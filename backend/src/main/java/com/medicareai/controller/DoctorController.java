package com.medicareai.controller;

import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.AuthResponse;
import com.medicareai.dto.DoctorResponse;
import com.medicareai.dto.DoctorUpdateRequest;
import com.medicareai.dto.RegisterRequest;
import com.medicareai.security.UserPrincipal;
import com.medicareai.service.AuthService;
import com.medicareai.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;
    private final AuthService authService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<DoctorResponse>> create(@Valid @RequestBody RegisterRequest request) {
        request.setRole("DOCTOR");
        AuthResponse created = authService.register(request);
        DoctorResponse response = doctorService.getByUserId(created.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Doctor created", response));
    }

    // Open to any authenticated user — patients need this list to book appointments.
    @GetMapping
    public ApiResponse<List<DoctorResponse>> getAll(@RequestParam(required = false) String specialization) {
        List<DoctorResponse> doctors = (specialization == null || specialization.isBlank())
                ? doctorService.getAll()
                : doctorService.getBySpecialization(specialization);
        return ApiResponse.success("Doctors fetched", doctors);
    }

    @GetMapping("/{id}")
    public ApiResponse<DoctorResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Doctor fetched", doctorService.getById(id));
    }

    @PreAuthorize("hasRole('DOCTOR')")
    @GetMapping("/me")
    public ApiResponse<DoctorResponse> getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success("Profile fetched", doctorService.getByUserId(principal.getId()));
    }

    @PreAuthorize("hasRole('DOCTOR')")
    @PutMapping("/me")
    public ApiResponse<DoctorResponse> updateMyProfile(@AuthenticationPrincipal UserPrincipal principal,
                                                         @Valid @RequestBody DoctorUpdateRequest request) {
        DoctorResponse current = doctorService.getByUserId(principal.getId());
        return ApiResponse.success("Profile updated", doctorService.update(current.getId(), request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ApiResponse<DoctorResponse> update(@PathVariable Long id, @Valid @RequestBody DoctorUpdateRequest request) {
        return ApiResponse.success("Doctor updated", doctorService.update(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        doctorService.delete(id);
        return ApiResponse.success("Doctor deleted", null);
    }
}
