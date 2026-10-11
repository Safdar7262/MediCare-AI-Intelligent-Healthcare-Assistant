package com.medicareai.serviceimpl;

import com.medicareai.dto.AdminStatsResponse;
import com.medicareai.dto.AppointmentResponse;
import com.medicareai.entity.Role;
import com.medicareai.repository.AppointmentRepository;
import com.medicareai.repository.ChatHistoryRepository;
import com.medicareai.repository.ReportRepository;
import com.medicareai.repository.UserRepository;
import com.medicareai.service.AdminService;
import com.medicareai.util.EntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final ReportRepository reportRepository;
    private final ChatHistoryRepository chatHistoryRepository;

    @Override
    public AdminStatsResponse getStats() {
        return AdminStatsResponse.builder()
                .totalUsers(userRepository.count())
                .activePatients(userRepository.countByRole_Name(Role.PATIENT))
                .activeDoctors(userRepository.countByRole_Name(Role.DOCTOR))
                .totalAppointments(appointmentRepository.count())
                .reportsUploaded(reportRepository.count())
                .chatbotMessagesExchanged(chatHistoryRepository.count())
                .build();
    }

    @Override
    public List<AppointmentResponse> getRecentAppointments(int limit) {
        return appointmentRepository
                .findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(EntityMapper::toAppointmentResponse)
                .toList();
    }
}
