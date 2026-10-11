package com.medicareai.controller;

import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.MedicalRecordRequest;
import com.medicareai.dto.MedicalRecordResponse;
import com.medicareai.security.UserPrincipal;
import com.medicareai.service.MedicalRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical-records")
@RequiredArgsConstructor
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @PostMapping
    public ApiResponse<MedicalRecordResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                                       @Valid @RequestBody MedicalRecordRequest request) {
        return ApiResponse.success("Medical record added",
                medicalRecordService.create(principal.getId(), request));
    }

    @GetMapping("/patient/{patientId}")
    public ApiResponse<List<MedicalRecordResponse>> getForPatient(@PathVariable Long patientId) {
        return ApiResponse.success("Medical history fetched", medicalRecordService.getForPatient(patientId));
    }
}
