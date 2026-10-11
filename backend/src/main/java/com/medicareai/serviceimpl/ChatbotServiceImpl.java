package com.medicareai.serviceimpl;

import com.medicareai.dto.ChatHistoryItemResponse;
import com.medicareai.dto.ChatMessageRequest;
import com.medicareai.dto.ChatMessageResponse;
import com.medicareai.dto.ChatSessionSummary;
import com.medicareai.entity.ChatHistory;
import com.medicareai.entity.Notification;
import com.medicareai.entity.User;
import com.medicareai.entity.enums.ChatSender;
import com.medicareai.entity.enums.NotificationType;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.ChatHistoryRepository;
import com.medicareai.repository.NotificationRepository;
import com.medicareai.repository.UserRepository;
import com.medicareai.service.AiChatClient;
import com.medicareai.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatbotServiceImpl implements ChatbotService {

    private static final List<String> EMERGENCY_KEYWORDS = List.of(
            "chest pain", "can't breathe", "cannot breathe", "difficulty breathing",
            "severe bleeding", "heart attack", "stroke", "unconscious", "unresponsive",
            "suicidal", "want to die", "kill myself", "overdose", "seizure", "anaphylaxis"
    );

    private static final String SYSTEM_PROMPT = """
            You are MediCare AI, a healthcare triage assistant. You are not a doctor and you
            do not diagnose. For the symptoms described:
            1. Ask at most one clarifying follow-up question if key details (duration, severity,
               other symptoms) are missing.
            2. Once enough detail is given, list 2-3 possible, non-alarming explanations in
               plain language, recommend which doctor specialization to see, and give 2-3
               practical precautions.
            3. Always include a brief reminder that this is not a substitute for professional
               medical advice.
            4. If anything in the conversation sounds like a medical emergency, your first
               sentence must tell the person to call emergency services or go to the nearest
               ER immediately, before anything else.
            Keep responses concise — five sentences or fewer unless listing precautions.
            """;

    private final ChatHistoryRepository chatHistoryRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AiChatClient aiChatClient;

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Long userId, ChatMessageRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String sessionId = (request.getSessionId() == null || request.getSessionId().isBlank())
                ? UUID.randomUUID().toString()
                : request.getSessionId();

        boolean emergency = containsEmergencyKeyword(request.getMessage());

        // Build the prompt from prior turns BEFORE persisting the new message,
        // since buildPrompt appends it itself — avoids double-counting it.
        List<Map<String, String>> prompt = buildPrompt(sessionId, request.getMessage());

        chatHistoryRepository.save(ChatHistory.builder()
                .user(user)
                .sessionId(sessionId)
                .sender(ChatSender.USER)
                .message(request.getMessage())
                .emergency(emergency)
                .build());

        String reply = aiChatClient.getCompletion(prompt);

        chatHistoryRepository.save(ChatHistory.builder()
                .user(user)
                .sessionId(sessionId)
                .sender(ChatSender.AI)
                .message(reply)
                .emergency(emergency)
                .build());

        if (emergency) {
            notificationRepository.save(Notification.builder()
                    .user(user)
                    .title("Possible medical emergency detected")
                    .message("Our AI assistant flagged your last chat message as a possible emergency. "
                            + "If you're in danger, please call your local emergency number now.")
                    .type(NotificationType.HEALTH_ALERT)
                    .build());
        }

        return ChatMessageResponse.builder()
                .sessionId(sessionId)
                .reply(reply)
                .emergency(emergency)
                .timestamp(LocalDateTime.now())
                .build();
    }

    @Override
    public List<ChatHistoryItemResponse> getHistory(String sessionId) {
        return chatHistoryRepository.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(h -> ChatHistoryItemResponse.builder()
                        .sender(h.getSender())
                        .message(h.getMessage())
                        .emergency(h.isEmergency())
                        .createdAt(h.getCreatedAt())
                        .build())
                .toList();
    }

    @Override
    public List<ChatSessionSummary> getSessions(Long userId) {
        List<ChatHistory> all = chatHistoryRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<String, ChatHistory> latestPerSession = new java.util.LinkedHashMap<>();
        for (ChatHistory entry : all) {
            latestPerSession.putIfAbsent(entry.getSessionId(), entry);
        }
        return latestPerSession.values().stream()
                .map(h -> ChatSessionSummary.builder()
                        .sessionId(h.getSessionId())
                        .lastMessage(h.getMessage())
                        .lastMessageAt(h.getCreatedAt())
                        .build())
                .toList();
    }

    private boolean containsEmergencyKeyword(String message) {
        String lower = message.toLowerCase(Locale.ROOT);
        return EMERGENCY_KEYWORDS.stream().anyMatch(lower::contains);
    }

    /**
     * Builds the message list sent to the AI provider: the system prompt plus
     * up to the last 10 turns of this session for context, plus the new message.
     */
    private List<Map<String, String>> buildPrompt(String sessionId, String newMessage) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));

        List<ChatHistory> history = chatHistoryRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        int start = Math.max(0, history.size() - 10);
        for (ChatHistory turn : history.subList(start, history.size())) {
            String role = turn.getSender() == ChatSender.USER ? "user" : "assistant";
            messages.add(Map.of("role", role, "content", turn.getMessage()));
        }

        messages.add(Map.of("role", "user", "content", newMessage));
        return messages;
    }
}
