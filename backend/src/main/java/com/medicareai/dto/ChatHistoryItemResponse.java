package com.medicareai.dto;

import com.medicareai.entity.enums.ChatSender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatHistoryItemResponse {
    private ChatSender sender;
    private String message;
    private boolean emergency;
    private LocalDateTime createdAt;
}
