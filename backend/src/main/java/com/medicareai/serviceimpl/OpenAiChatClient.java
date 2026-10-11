package com.medicareai.serviceimpl;

import com.medicareai.service.AiChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "gemini", matchIfMissing = true)
public class OpenAiChatClient implements AiChatClient {

    private static final String ENDPOINT = "https://api.gemini.com/v1/chat/completions";

    private final RestTemplate restTemplate;

    @Value("${app.ai.openai.api-key}")
    private String apiKey;

    @Value("${app.ai.gemini.model}")
    private String model;

    public OpenAiChatClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    @SuppressWarnings("unchecked")
    public String getCompletion(List<Map<String, String>> messages) {
        if (apiKey == null || apiKey.isBlank()) {
            return "The AI assistant isn't configured yet — set OPENAI_API_KEY on the server to enable live responses.";
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", messages,
                "temperature", 0.4,
                "max_tokens", 400
        );

        try {
            Map<String, Object> response = restTemplate.postForObject(
                    ENDPOINT, new HttpEntity<>(body, headers), Map.class);

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> firstChoice = choices.get(0);
            Map<String, String> messageObj = (Map<String, String>) firstChoice.get("message");
            return messageObj.get("content").trim();
        } catch (Exception ex) {
            return "I'm having trouble reaching the AI service right now. Please try again in a moment, "
                    + "and contact a doctor directly if your symptoms feel urgent.";
        }
    }
}
