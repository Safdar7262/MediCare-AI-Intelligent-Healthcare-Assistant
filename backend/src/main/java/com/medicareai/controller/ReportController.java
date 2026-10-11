package com.medicareai.controller;

import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.ReportResponse;
import com.medicareai.security.UserPrincipal;
import com.medicareai.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ReportResponse> upload(@AuthenticationPrincipal UserPrincipal principal,
                                               @RequestParam Long patientId,
                                               @RequestParam("file") MultipartFile file) {
        ReportResponse response = reportService.upload(patientId, principal.getId(), file);
        return ApiResponse.success("Report uploaded", response);
    }

    @GetMapping("/patient/{patientId}")
    public ApiResponse<List<ReportResponse>> getForPatient(@PathVariable Long patientId) {
        return ApiResponse.success("Reports fetched", reportService.getForPatient(patientId));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        Resource resource = reportService.download(id);
        String fileName = reportService.getFileNameForDownload(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
