package com.medicareai.service;

import com.medicareai.dto.ChatHistoryItemResponse;
import com.medicareai.dto.ChatMessageRequest;
import com.medicareai.dto.ChatMessageResponse;
import com.medicareai.dto.ChatSessionSummary;

import java.util.List;

public interface ChatbotService {
    ChatMessageResponse sendMessage(Long userId, ChatMessageRequest request);
    List<ChatHistoryItemResponse> getHistory(String sessionId);
    List<ChatSessionSummary> getSessions(Long userId);
}
