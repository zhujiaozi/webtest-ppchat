package com.ncu.pp.controller.websocket;

import com.ncu.pp.dto.ChatMessage;
import com.ncu.pp.entity.PrivateMessage;
import com.ncu.pp.entity.User;
import com.ncu.pp.service.ChatService;
import com.ncu.pp.service.GroupService;
import com.ncu.pp.repository.UserRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.time.LocalDateTime;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final GroupService groupService;
    private final UserRepository userRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          ChatService chatService,
                          GroupService groupService,
                          UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
        this.groupService = groupService;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat/private")
    public void sendPrivateMessage(@Payload ChatMessage message) {
        message.setTime(LocalDateTime.now());
        message.setStatus(0);
        PrivateMessage saved = chatService.savePrivateMessage(
                message.getSenderId(), message.getReceiverId(),
                message.getContent(), message.getMsgType(), message.getAudioData());
        message.setId(saved.getId());
        User sender = userRepository.findById(message.getSenderId()).orElse(null);
        if (sender != null) {
            message.setSender(sender.getNickname() != null ? sender.getNickname() : sender.getUsername());
        }
        messagingTemplate.convertAndSendToUser(
                message.getReceiverId().toString(), "/queue/private", message);
        messagingTemplate.convertAndSendToUser(
                message.getSenderId().toString(), "/queue/private", message);
    }

    @MessageMapping("/chat/group")
    public void sendGroupMessage(@Payload ChatMessage message) {
        message.setTime(LocalDateTime.now());
        groupService.saveGroupMessage(
                Long.parseLong(message.getReceiver()),
                message.getSenderId(),
                message.getContent(), message.getMsgType(), message.getAudioData());
        User sender = userRepository.findById(message.getSenderId()).orElse(null);
        if (sender != null) {
            message.setSender(sender.getNickname() != null ? sender.getNickname() : sender.getUsername());
        }
        messagingTemplate.convertAndSend(
                "/topic/group/" + message.getReceiver(), message);
    }
}
