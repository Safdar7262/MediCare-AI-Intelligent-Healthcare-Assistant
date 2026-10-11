package com.medicareai.serviceimpl;

import com.medicareai.dto.*;
import com.medicareai.entity.Appointment;
import com.medicareai.entity.Doctor;
import com.medicareai.entity.Notification;
import com.medicareai.entity.Patient;
import com.medicareai.entity.User;
import com.medicareai.entity.enums.AppointmentStatus;
import com.medicareai.entity.enums.NotificationType;
import com.medicareai.exception.DuplicateResourceException;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.AppointmentRepository;
import com.medicareai.repository.DoctorRepository;
import com.medicareai.repository.NotificationRepository;
import com.medicareai.repository.PatientRepository;
import com.medicareai.service.AppointmentService;
import com.medicareai.util.EntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final NotificationRepository notificationRepository;

    @Override
    @Transactional
    public AppointmentResponse book(Long patientUserId, AppointmentBookingRequest request) {
        Patient patient = patientRepository.findByUserId(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("No patient profile for this account"));
        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + request.getDoctorId()));

        boolean slotTaken = appointmentRepository.findByDoctorId(doctor.getId()).stream()
                .anyMatch(a -> a.getAppointmentDate().equals(request.getAppointmentDate())
                        && a.getAppointmentTime().equals(request.getAppointmentTime())
                        && a.getStatus() != AppointmentStatus.CANCELLED);
        if (slotTaken) {
            throw new DuplicateResourceException("This doctor already has an appointment at that date and time");
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentDate(request.getAppointmentDate())
                .appointmentTime(request.getAppointmentTime())
                .symptoms(request.getSymptoms())
                .status(AppointmentStatus.PENDING)
                .build();
        appointment = appointmentRepository.save(appointment);

        notify(doctor.getUser().getId(), "New appointment request",
                patient.getUser().getFullName() + " requested an appointment on "
                        + request.getAppointmentDate() + " at " + request.getAppointmentTime(),
                NotificationType.APPOINTMENT);

        return EntityMapper.toAppointmentResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse reschedule(Long appointmentId, AppointmentRescheduleRequest request) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setStatus(AppointmentStatus.RESCHEDULED);
        appointment = appointmentRepository.save(appointment);

        notify(appointment.getDoctor().getUser().getId(), "Appointment rescheduled",
                appointment.getPatient().getUser().getFullName() + " rescheduled to "
                        + request.getAppointmentDate() + " at " + request.getAppointmentTime(),
                NotificationType.APPOINTMENT);

        return EntityMapper.toAppointmentResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse updateStatus(Long appointmentId, AppointmentStatusUpdateRequest request) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(request.getStatus());
        if (request.getNotes() != null) {
            appointment.setNotes(request.getNotes());
        }
        appointment = appointmentRepository.save(appointment);

        notify(appointment.getPatient().getUser().getId(), "Appointment " + request.getStatus().name().toLowerCase(),
                "Your appointment with Dr. " + appointment.getDoctor().getUser().getFullName()
                        + " is now " + request.getStatus().name().toLowerCase() + ".",
                NotificationType.APPOINTMENT);

        return EntityMapper.toAppointmentResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse cancel(Long appointmentId) {
        Appointment appointment = findOrThrow(appointmentId);
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment = appointmentRepository.save(appointment);
        return EntityMapper.toAppointmentResponse(appointment);
    }

    @Override
    public AppointmentResponse getById(Long appointmentId) {
        return EntityMapper.toAppointmentResponse(findOrThrow(appointmentId));
    }

    @Override
    public List<AppointmentResponse> getForPatientUser(Long patientUserId) {
        Patient patient = patientRepository.findByUserId(patientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("No patient profile for this account"));
        return appointmentRepository.findByPatientId(patient.getId()).stream()
                .map(EntityMapper::toAppointmentResponse)
                .toList();
    }

    @Override
    public List<AppointmentResponse> getForDoctorUser(Long doctorUserId) {
        Doctor doctor = doctorRepository.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("No doctor profile for this account"));
        return appointmentRepository.findByDoctorId(doctor.getId()).stream()
                .map(EntityMapper::toAppointmentResponse)
                .toList();
    }

    private Appointment findOrThrow(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));
    }

    private void notify(Long userId, String title, String message, NotificationType type) {
        Notification notification = Notification.builder()
                .user(User.builder().id(userId).build())
                .title(title)
                .message(message)
                .type(type)
                .build();
        notificationRepository.save(notification);
    }
}
