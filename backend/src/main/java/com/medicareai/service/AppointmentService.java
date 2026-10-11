package com.medicareai.service;

import com.medicareai.dto.AppointmentBookingRequest;
import com.medicareai.dto.AppointmentRescheduleRequest;
import com.medicareai.dto.AppointmentResponse;
import com.medicareai.dto.AppointmentStatusUpdateRequest;

import java.util.List;

public interface AppointmentService {
    AppointmentResponse book(Long patientUserId, AppointmentBookingRequest request);
    AppointmentResponse reschedule(Long appointmentId, AppointmentRescheduleRequest request);
    AppointmentResponse updateStatus(Long appointmentId, AppointmentStatusUpdateRequest request);
    AppointmentResponse cancel(Long appointmentId);
    AppointmentResponse getById(Long appointmentId);
    List<AppointmentResponse> getForPatientUser(Long patientUserId);
    List<AppointmentResponse> getForDoctorUser(Long doctorUserId);
}
