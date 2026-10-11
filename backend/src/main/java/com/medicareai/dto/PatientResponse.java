package com.medicareai.dto;

import com.medicareai.entity.enums.GenderType;
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
public class PatientResponse {
    private Long id;
    private Long userId;
    private String fullName;
    private String email;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private Integer age;
    private GenderType gender;
    private String bloodGroup;
    private String address;
    private String emergencyContact;
    private String currentDisease;
    private String status;
}
