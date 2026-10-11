package com.medicareai.service;

import com.medicareai.dto.AdminStatsResponse;
import com.medicareai.dto.AppointmentResponse;

import java.util.List;

public interface AdminService {
    AdminStatsResponse getStats();
    List<AppointmentResponse> getRecentAppointments(int limit);
}
