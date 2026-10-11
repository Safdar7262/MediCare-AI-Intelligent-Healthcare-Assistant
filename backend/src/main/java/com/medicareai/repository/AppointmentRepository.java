package com.medicareai.repository;

import com.medicareai.entity.Appointment;
import com.medicareai.entity.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientId(Long patientId);
    List<Appointment> findByDoctorId(Long doctorId);
    List<Appointment> findByDoctorIdAndAppointmentDateGreaterThanEqual(Long doctorId, LocalDate fromDate);
    List<Appointment> findByStatus(AppointmentStatus status);
}
