package com.medicareai.dto;

import com.medicareai.entity.enums.ReportFileType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportResponse {
    private Long id;
    private Long patientId;
    private String patientName;
    private String uploadedByName;
    private String reportName;
    private ReportFileType fileType;
    private LocalDate reportDate;
}
