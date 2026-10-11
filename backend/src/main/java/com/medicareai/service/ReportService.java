package com.medicareai.service;

import com.medicareai.dto.ReportResponse;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ReportService {
    ReportResponse upload(Long patientId, Long uploadedByUserId, MultipartFile file);
    List<ReportResponse> getForPatient(Long patientId);
    Resource download(Long reportId);
    String getFileNameForDownload(Long reportId);
}
