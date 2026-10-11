package com.medicareai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DoctorUpdateRequest {
    @NotBlank(message = "Specialization is required")
    private String specialization;
    private String qualification;
    private Integer experienceYears;
    private BigDecimal consultationFee;
    private LocalTime availableFrom;
    private LocalTime availableTo;
    private String availableDays;
    private String bio;
    private String profileImageUrl;
}
