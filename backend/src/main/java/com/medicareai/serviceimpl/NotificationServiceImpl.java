package com.medicareai.serviceimpl;

import com.medicareai.dto.NotificationResponse;
import com.medicareai.entity.Notification;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.NotificationRepository;
import com.medicareai.service.NotificationService;
import com.medicareai.util.EntityMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    public List<NotificationResponse> getAllForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(EntityMapper::toNotificationResponse)
                .toList();
    }

    @Override
    public List<NotificationResponse> getUnreadForUser(Long userId) {
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId).stream()
                .map(EntityMapper::toNotificationResponse)
                .toList();
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));
        notification.setRead(true);
        return EntityMapper.toNotificationResponse(notificationRepository.save(notification));
    }
}
