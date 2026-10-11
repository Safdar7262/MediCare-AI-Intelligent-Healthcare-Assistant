package com.medicareai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {
    // Null/blank on the first message of a conversation — the server creates one.
    private String sessionId;

    @NotBlank(message = "Message cannot be empty")
    private String message;
}
