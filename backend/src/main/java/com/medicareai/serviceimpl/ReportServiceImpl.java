package com.medicareai.serviceimpl;

import com.medicareai.dto.ReportResponse;
import com.medicareai.entity.Patient;
import com.medicareai.entity.Report;
import com.medicareai.entity.User;
import com.medicareai.entity.enums.ReportFileType;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.PatientRepository;
import com.medicareai.repository.ReportRepository;
import com.medicareai.repository.UserRepository;
import com.medicareai.service.ReportService;
import com.medicareai.util.EntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @Override
    @Transactional
    public ReportResponse upload(Long patientId, Long uploadedByUserId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file was provided");
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        User uploadedBy = userRepository.findById(uploadedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Uploading user not found"));

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "report";
        ReportFileType fileType = resolveFileType(originalName);

        try {
            Path patientDir = Paths.get(uploadDir, String.valueOf(patientId));
            Files.createDirectories(patientDir);

            String storedName = UUID.randomUUID() + "_" + originalName.replaceAll("\\s+", "_");
            Path destination = patientDir.resolve(storedName);
            file.transferTo(destination);

            Report report = Report.builder()
                    .patient(patient)
                    .uploadedBy(uploadedBy)
                    .reportName(originalName)
                    .filePath(destination.toString())
                    .fileType(fileType)
                    .build();

            return EntityMapper.toReportResponse(reportRepository.save(report));
        } catch (IOException ex) {
            throw new RuntimeException("Failed to store the uploaded file: " + ex.getMessage(), ex);
        }
    }

    @Override
    public List<ReportResponse> getForPatient(Long patientId) {
        return reportRepository.findByPatientIdOrderByReportDateDesc(patientId).stream()
                .map(EntityMapper::toReportResponse)
                .toList();
    }

    @Override
    public Resource download(Long reportId) {
        Report report = findOrThrow(reportId);
        try {
            Path path = Paths.get(report.getFilePath());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("Stored file is missing or unreadable");
            }
            return resource;
        } catch (MalformedURLException ex) {
            throw new ResourceNotFoundException("Invalid file path for report id: " + reportId);
        }
    }

    @Override
    public String getFileNameForDownload(Long reportId) {
        return findOrThrow(reportId).getReportName();
    }

    private Report findOrThrow(Long id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));
    }

    private ReportFileType resolveFileType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) return ReportFileType.PDF;
        if (lower.endsWith(".png")) return ReportFileType.PNG;
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return ReportFileType.JPG;
        throw new IllegalArgumentException("Unsupported file type. Only PDF, JPG, and PNG are allowed.");
    }
}
