package com.medicareai.serviceimpl;

import com.medicareai.dto.DoctorResponse;
import com.medicareai.dto.DoctorUpdateRequest;
import com.medicareai.entity.Doctor;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.DoctorRepository;
import com.medicareai.service.DoctorService;
import com.medicareai.util.EntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorServiceImpl implements DoctorService {

    private final DoctorRepository doctorRepository;

    @Override
    public List<DoctorResponse> getAll() {
        return doctorRepository.findAll().stream()
                .map(EntityMapper::toDoctorResponse)
                .toList();
    }

    @Override
    public List<DoctorResponse> getBySpecialization(String specialization) {
        return doctorRepository.findBySpecializationIgnoreCase(specialization).stream()
                .map(EntityMapper::toDoctorResponse)
                .toList();
    }

    @Override
    public DoctorResponse getById(Long id) {
        return EntityMapper.toDoctorResponse(findOrThrow(id));
    }

    @Override
    public DoctorResponse getByUserId(Long userId) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No doctor profile for this account"));
        return EntityMapper.toDoctorResponse(doctor);
    }

    @Override
    @Transactional
    public DoctorResponse update(Long id, DoctorUpdateRequest request) {
        Doctor doctor = findOrThrow(id);

        doctor.setSpecialization(request.getSpecialization());
        if (request.getQualification() != null) doctor.setQualification(request.getQualification());
        if (request.getExperienceYears() != null) doctor.setExperienceYears(request.getExperienceYears());
        if (request.getConsultationFee() != null) doctor.setConsultationFee(request.getConsultationFee());
        if (request.getAvailableFrom() != null) doctor.setAvailableFrom(request.getAvailableFrom());
        if (request.getAvailableTo() != null) doctor.setAvailableTo(request.getAvailableTo());
        if (request.getAvailableDays() != null) doctor.setAvailableDays(request.getAvailableDays());
        if (request.getBio() != null) doctor.setBio(request.getBio());
        if (request.getProfileImageUrl() != null) doctor.setProfileImageUrl(request.getProfileImageUrl());

        return EntityMapper.toDoctorResponse(doctorRepository.save(doctor));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        doctorRepository.delete(findOrThrow(id));
    }

    private Doctor findOrThrow(Long id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + id));
    }
}
