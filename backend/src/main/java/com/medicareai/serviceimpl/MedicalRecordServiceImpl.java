package com.medicareai.serviceimpl;

import com.medicareai.dto.MedicalRecordRequest;
import com.medicareai.dto.MedicalRecordResponse;
import com.medicareai.entity.Doctor;
import com.medicareai.entity.MedicalRecord;
import com.medicareai.entity.Patient;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.DoctorRepository;
import com.medicareai.repository.MedicalRecordRepository;
import com.medicareai.repository.PatientRepository;
import com.medicareai.service.MedicalRecordService;
import com.medicareai.util.EntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicalRecordServiceImpl implements MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    @Override
    @Transactional
    public MedicalRecordResponse create(Long doctorUserId, MedicalRecordRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + request.getPatientId()));

        // doctorUserId is optional context (admin can also file a record without
        // an attending doctor on it); only attach a doctor when we can resolve one.
        Doctor doctor = doctorUserId != null ? doctorRepository.findByUserId(doctorUserId).orElse(null) : null;

        MedicalRecord record = MedicalRecord.builder()
                .patient(patient)
                .doctor(doctor)
                .diagnosis(request.getDiagnosis())
                .prescription(request.getPrescription())
                .notes(request.getNotes())
                .build();

        return EntityMapper.toMedicalRecordResponse(medicalRecordRepository.save(record));
    }

    @Override
    public List<MedicalRecordResponse> getForPatient(Long patientId) {
        return medicalRecordRepository.findByPatientId(patientId).stream()
                .map(EntityMapper::toMedicalRecordResponse)
                .toList();
    }
}
