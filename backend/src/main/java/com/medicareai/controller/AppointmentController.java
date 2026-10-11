package com.medicareai.controller;

import com.medicareai.dto.*;
import com.medicareai.security.UserPrincipal;
import com.medicareai.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PreAuthorize("hasRole('PATIENT')")
    @PostMapping
    public ResponseEntity<ApiResponse<AppointmentResponse>> book(@AuthenticationPrincipal UserPrincipal principal,
                                                                   @Valid @RequestBody AppointmentBookingRequest request) {
        AppointmentResponse response = appointmentService.book(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Appointment booked", response));
    }

    @PreAuthorize("hasRole('PATIENT')")
    @PutMapping("/{id}/reschedule")
    public ApiResponse<AppointmentResponse> reschedule(@PathVariable Long id,
                                                         @Valid @RequestBody AppointmentRescheduleRequest request) {
        return ApiResponse.success("Appointment rescheduled", appointmentService.reschedule(id, request));
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    @PutMapping("/{id}/cancel")
    public ApiResponse<AppointmentResponse> cancel(@PathVariable Long id) {
        return ApiResponse.success("Appointment cancelled", appointmentService.cancel(id));
    }

    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @PutMapping("/{id}/status")
    public ApiResponse<AppointmentResponse> updateStatus(@PathVariable Long id,
                                                           @Valid @RequestBody AppointmentStatusUpdateRequest request) {
        return ApiResponse.success("Appointment status updated", appointmentService.updateStatus(id, request));
    }

    @GetMapping("/{id}")
    public ApiResponse<AppointmentResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Appointment fetched", appointmentService.getById(id));
    }

    @PreAuthorize("hasRole('PATIENT')")
    @GetMapping("/me")
    public ApiResponse<List<AppointmentResponse>> myAppointments(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success("Appointments fetched", appointmentService.getForPatientUser(principal.getId()));
    }

    @PreAuthorize("hasRole('DOCTOR')")
    @GetMapping("/doctor/me")
    public ApiResponse<List<AppointmentResponse>> myPatientAppointments(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success("Appointments fetched", appointmentService.getForDoctorUser(principal.getId()));
    }
}
