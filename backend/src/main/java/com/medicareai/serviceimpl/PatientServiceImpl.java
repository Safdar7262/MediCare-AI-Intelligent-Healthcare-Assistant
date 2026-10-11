package com.medicareai.serviceimpl;

import com.medicareai.dto.PatientResponse;
import com.medicareai.dto.PatientUpdateRequest;
import com.medicareai.entity.Patient;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.PatientRepository;
import com.medicareai.service.PatientService;
import com.medicareai.util.EntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;

    @Override
    public List<PatientResponse> getAll() {
        return patientRepository.findAll().stream()
                .map(EntityMapper::toPatientResponse)
                .toList();
    }

    @Override
    public List<PatientResponse> search(String keyword) {
        String lower = keyword == null ? "" : keyword.toLowerCase();
        return patientRepository.findAll().stream()
                .filter(p -> p.getUser().getFullName().toLowerCase().contains(lower)
                        || (p.getCurrentDisease() != null && p.getCurrentDisease().toLowerCase().contains(lower)))
                .map(EntityMapper::toPatientResponse)
                .toList();
    }

    @Override
    public PatientResponse getById(Long id) {
        Patient patient = findOrThrow(id);
        return EntityMapper.toPatientResponse(patient);
    }

    @Override
    public PatientResponse getByUserId(Long userId) {
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No patient profile for this account"));
        return EntityMapper.toPatientResponse(patient);
    }

    @Override
    @Transactional
    public PatientResponse update(Long id, PatientUpdateRequest request) {
        Patient patient = findOrThrow(id);

        if (request.getDateOfBirth() != null) patient.setDateOfBirth(request.getDateOfBirth());
        if (request.getAge() != null) patient.setAge(request.getAge());
        if (request.getGender() != null) patient.setGender(request.getGender());
        if (request.getBloodGroup() != null) patient.setBloodGroup(request.getBloodGroup());
        if (request.getAddress() != null) patient.setAddress(request.getAddress());
        if (request.getEmergencyContact() != null) patient.setEmergencyContact(request.getEmergencyContact());
        if (request.getCurrentDisease() != null) patient.setCurrentDisease(request.getCurrentDisease());
        if (request.getStatus() != null) patient.setStatus(request.getStatus());

        return EntityMapper.toPatientResponse(patientRepository.save(patient));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Patient patient = findOrThrow(id);
        patientRepository.delete(patient);
    }

    private Patient findOrThrow(Long id) {
        return patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));
    }
}
