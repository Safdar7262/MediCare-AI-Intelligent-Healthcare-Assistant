package com.medicareai.service;

import com.medicareai.dto.NotificationResponse;

import java.util.List;

public interface NotificationService {
    List<NotificationResponse> getAllForUser(Long userId);
    List<NotificationResponse> getUnreadForUser(Long userId);
    NotificationResponse markAsRead(Long notificationId);
}
