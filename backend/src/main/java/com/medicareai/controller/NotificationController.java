package com.medicareai.controller;

import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.NotificationResponse;
import com.medicareai.security.UserPrincipal;
import com.medicareai.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/me")
    public ApiResponse<List<NotificationResponse>> getAllForMe(@AuthenticationPrincipal UserPrincipal principal,
                                                                 @RequestParam(defaultValue = "false") boolean unreadOnly) {
        List<NotificationResponse> notifications = unreadOnly
                ? notificationService.getUnreadForUser(principal.getId())
                : notificationService.getAllForUser(principal.getId());
        return ApiResponse.success("Notifications fetched", notifications);
    }

    @PutMapping("/{id}/read")
    public ApiResponse<NotificationResponse> markAsRead(@PathVariable Long id) {
        return ApiResponse.success("Notification marked as read", notificationService.markAsRead(id));
    }
}
