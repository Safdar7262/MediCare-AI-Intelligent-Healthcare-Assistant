package com.medicareai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStatsResponse {
    private long totalUsers;
    private long activePatients;
    private long activeDoctors;
    private long totalAppointments;
    private long reportsUploaded;
    private long chatbotMessagesExchanged;
}
