package com.medicareai.serviceimpl;

import com.medicareai.service.AiChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "openai")
public class GeminiChatClient implements AiChatClient {

    private final RestTemplate restTemplate;

    @Value("${app.ai.openai.api-key}")
    private String apiKey;

    @Value("${app.ai.openai.model}")
    private String model;

    public GeminiChatClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    @SuppressWarnings("unchecked")
    public String getCompletion(List<Map<String, String>> messages) {
        if (apiKey == null || apiKey.isBlank()) {
            return "The AI assistant isn't configured yet — set openai_API_KEY on the server to enable live responses.";
        }

        // Gemini doesn't have separate "system" turns the way OpenAI does, so we
        // fold every message into a single flattened prompt, prefixed by role.
        String flattenedPrompt = messages.stream()
                .map(m -> m.get("role").toUpperCase() + ": " + m.get("content"))
                .collect(Collectors.joining("\n\n"));

        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + apiKey;

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", flattenedPrompt))
                ))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            Map<String, Object> response = restTemplate.postForObject(
                    endpoint, new HttpEntity<>(body, headers), Map.class);

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, String>> parts = (List<Map<String, String>>) content.get("parts");
            return parts.get(0).get("text").trim();
        } catch (Exception ex) {
            return "I'm having trouble reaching the AI service right now. Please try again in a moment, "
                    + "and contact a doctor directly if your symptoms feel urgent.";
        }
    }
}
