package com.medicareai.service;

import com.medicareai.dto.MedicalRecordRequest;
import com.medicareai.dto.MedicalRecordResponse;

import java.util.List;

public interface MedicalRecordService {
    MedicalRecordResponse create(Long doctorUserId, MedicalRecordRequest request);
    List<MedicalRecordResponse> getForPatient(Long patientId);
}
