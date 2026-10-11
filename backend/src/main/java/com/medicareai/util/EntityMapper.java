package com.medicareai.util;

import com.medicareai.dto.*;
import com.medicareai.entity.*;

/**
 * Centralizes entity -> response DTO mapping so each service impl doesn't
 * repeat the same field-by-field copying.
 */
public final class EntityMapper {

    private EntityMapper() {
    }

    public static PatientResponse toPatientResponse(Patient p) {
        User u = p.getUser();
        return PatientResponse.builder()
                .id(p.getId())
                .userId(u.getId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .phoneNumber(u.getPhoneNumber())
                .dateOfBirth(p.getDateOfBirth())
                .age(p.getAge())
                .gender(p.getGender())
                .bloodGroup(p.getBloodGroup())
                .address(p.getAddress())
                .emergencyContact(p.getEmergencyContact())
                .currentDisease(p.getCurrentDisease())
                .status(p.getStatus())
                .build();
    }

    public static DoctorResponse toDoctorResponse(Doctor d) {
        User u = d.getUser();
        return DoctorResponse.builder()
                .id(d.getId())
                .userId(u.getId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .phoneNumber(u.getPhoneNumber())
                .specialization(d.getSpecialization())
                .qualification(d.getQualification())
                .experienceYears(d.getExperienceYears())
                .consultationFee(d.getConsultationFee())
                .availableFrom(d.getAvailableFrom())
                .availableTo(d.getAvailableTo())
                .availableDays(d.getAvailableDays())
                .rating(d.getRating())
                .bio(d.getBio())
                .profileImageUrl(d.getProfileImageUrl())
                .build();
    }

    public static AppointmentResponse toAppointmentResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatient().getId())
                .patientName(a.getPatient().getUser().getFullName())
                .doctorId(a.getDoctor().getId())
                .doctorName(a.getDoctor().getUser().getFullName())
                .specialization(a.getDoctor().getSpecialization())
                .appointmentDate(a.getAppointmentDate())
                .appointmentTime(a.getAppointmentTime())
                .status(a.getStatus())
                .symptoms(a.getSymptoms())
                .notes(a.getNotes())
                .createdAt(a.getCreatedAt())
                .build();
    }

    public static NotificationResponse toNotificationResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }

    public static ReportResponse toReportResponse(Report r) {
        return ReportResponse.builder()
                .id(r.getId())
                .patientId(r.getPatient().getId())
                .patientName(r.getPatient().getUser().getFullName())
                .uploadedByName(r.getUploadedBy() != null ? r.getUploadedBy().getFullName() : null)
                .reportName(r.getReportName())
                .fileType(r.getFileType())
                .reportDate(r.getReportDate())
                .build();
    }

    public static MedicalRecordResponse toMedicalRecordResponse(MedicalRecord m) {
        return MedicalRecordResponse.builder()
                .id(m.getId())
                .patientId(m.getPatient().getId())
                .patientName(m.getPatient().getUser().getFullName())
                .doctorId(m.getDoctor() != null ? m.getDoctor().getId() : null)
                .doctorName(m.getDoctor() != null ? m.getDoctor().getUser().getFullName() : null)
                .diagnosis(m.getDiagnosis())
                .prescription(m.getPrescription())
                .notes(m.getNotes())
                .recordDate(m.getRecordDate())
                .build();
    }
}
