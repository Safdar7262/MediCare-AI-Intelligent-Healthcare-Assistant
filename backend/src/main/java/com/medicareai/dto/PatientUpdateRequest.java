package com.medicareai.dto;

import com.medicareai.entity.enums.GenderType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PatientUpdateRequest {
    private LocalDate dateOfBirth;
    private Integer age;
    private GenderType gender;
    private String bloodGroup;
    private String address;
    private String emergencyContact;
    private String currentDisease;
    private String status;
}
