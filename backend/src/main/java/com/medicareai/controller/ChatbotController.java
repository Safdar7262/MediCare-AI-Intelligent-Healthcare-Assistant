package com.medicareai.controller;

import com.medicareai.dto.ApiResponse;
import com.medicareai.dto.ChatHistoryItemResponse;
import com.medicareai.dto.ChatMessageRequest;
import com.medicareai.dto.ChatMessageResponse;
import com.medicareai.dto.ChatSessionSummary;
import com.medicareai.security.UserPrincipal;
import com.medicareai.service.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/message")
    public ApiResponse<ChatMessageResponse> sendMessage(@AuthenticationPrincipal UserPrincipal principal,
                                                          @Valid @RequestBody ChatMessageRequest request) {
        return ApiResponse.success("Reply generated", chatbotService.sendMessage(principal.getId(), request));
    }

    @GetMapping("/history/{sessionId}")
    public ApiResponse<List<ChatHistoryItemResponse>> getHistory(@PathVariable String sessionId) {
        return ApiResponse.success("History fetched", chatbotService.getHistory(sessionId));
    }

    @GetMapping("/sessions")
    public ApiResponse<List<ChatSessionSummary>> getSessions(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.success("Sessions fetched", chatbotService.getSessions(principal.getId()));
    }
}
