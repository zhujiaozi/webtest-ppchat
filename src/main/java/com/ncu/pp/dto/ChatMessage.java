package com.ncu.pp.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatMessage {
    private Long id;
    private String sender;
    private Long senderId;
    private String receiver;
    private Long receiverId;
    private String content;
    private Integer msgType = 0;
    private String audioData;
    private boolean isGroup;
    private Integer status = 0;
    private LocalDateTime time;
}
