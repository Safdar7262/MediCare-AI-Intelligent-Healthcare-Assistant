package com.medicareai.service;

import com.medicareai.dto.DoctorResponse;
import com.medicareai.dto.DoctorUpdateRequest;

import java.util.List;

public interface DoctorService {
    List<DoctorResponse> getAll();
    List<DoctorResponse> getBySpecialization(String specialization);
    DoctorResponse getById(Long id);
    DoctorResponse getByUserId(Long userId);
    DoctorResponse update(Long id, DoctorUpdateRequest request);
    void delete(Long id);
}
