package com.medicareai.controller;

import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.AuthResponse;
import com.medicareai.dto.PatientResponse;
import com.medicareai.dto.PatientUpdateRequest;
import com.medicareai.dto.RegisterRequest;
import com.medicareai.security.UserPrincipal;
import com.medicareai.service.AuthService;
import com.medicareai.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;
    private final AuthService authService;

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @PostMapping
    public ResponseEntity<ApiResponse<PatientResponse>> create(@Valid @RequestBody RegisterRequest request) {
        request.setRole("PATIENT");
        AuthResponse created = authService.register(request);
        PatientResponse response = patientService.getByUserId(created.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Patient created", response));
    }

    @GetMapping("/me")
    public ApiResponse<PatientResponse> getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success("Profile fetched", patientService.getByUserId(principal.getId()));
    }

    @PutMapping("/me")
    public ApiResponse<PatientResponse> updateMyProfile(@AuthenticationPrincipal UserPrincipal principal,
                                                          @RequestBody PatientUpdateRequest request) {
        PatientResponse current = patientService.getByUserId(principal.getId());
        return ApiResponse.success("Profile updated", patientService.update(current.getId(), request));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @GetMapping
    public ApiResponse<List<PatientResponse>> getAll(@RequestParam(required = false) String search) {
        List<PatientResponse> patients = (search == null || search.isBlank())
                ? patientService.getAll()
                : patientService.search(search);
        return ApiResponse.success("Patients fetched", patients);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @GetMapping("/{id}")
    public ApiResponse<PatientResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Patient fetched", patientService.getById(id));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @PutMapping("/{id}")
    public ApiResponse<PatientResponse> update(@PathVariable Long id, @Valid @RequestBody PatientUpdateRequest request) {
        return ApiResponse.success("Patient updated", patientService.update(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        patientService.delete(id);
        return ApiResponse.success("Patient deleted", null);
    }
}
