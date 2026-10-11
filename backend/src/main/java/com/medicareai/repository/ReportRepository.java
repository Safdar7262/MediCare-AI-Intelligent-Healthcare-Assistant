package com.medicareai.repository;

import com.medicareai.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByPatientIdOrderByReportDateDesc(Long patientId);
}
