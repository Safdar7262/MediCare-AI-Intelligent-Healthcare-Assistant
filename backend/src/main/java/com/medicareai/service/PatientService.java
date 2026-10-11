package com.medicareai.service;

import com.medicareai.dto.PatientResponse;
import com.medicareai.dto.PatientUpdateRequest;

import java.util.List;

public interface PatientService {
    List<PatientResponse> getAll();
    List<PatientResponse> search(String keyword);
    PatientResponse getById(Long id);
    PatientResponse getByUserId(Long userId);
    PatientResponse update(Long id, PatientUpdateRequest request);
    void delete(Long id);
}
