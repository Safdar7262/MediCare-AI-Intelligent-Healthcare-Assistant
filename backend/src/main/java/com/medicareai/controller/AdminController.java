package com.medicareai.controller;

import com.medicareai.dto.AdminStatsResponse;
import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.AppointmentResponse;
import com.medicareai.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ApiResponse<AdminStatsResponse> getStats() {
        return ApiResponse.success("Stats fetched", adminService.getStats());
    }

    @GetMapping("/appointments/recent")
    public ApiResponse<List<AppointmentResponse>> getRecentAppointments(@RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.success("Recent appointments fetched", adminService.getRecentAppointments(limit));
    }
}
