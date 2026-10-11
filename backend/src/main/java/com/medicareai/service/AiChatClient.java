package com.medicareai.service;

import java.util.List;
import java.util.Map;

public interface AiChatClient {

    /**
     * @param messages ordered chat turns as {"role": "system|user|assistant", "content": "..."}
     * @return the assistant's reply text
     */
    String getCompletion(List<Map<String, String>> messages);
}
