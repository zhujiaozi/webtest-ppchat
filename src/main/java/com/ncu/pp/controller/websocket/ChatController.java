package com.ncu.pp.controller.websocket;

import com.ncu.pp.dto.ChatMessage;
import com.ncu.pp.entity.PrivateMessage;
import com.ncu.pp.entity.User;
import com.ncu.pp.repository.UserRepository;
import com.ncu.pp.service.ChatService;
import com.ncu.pp.service.FileService;
import com.ncu.pp.service.GroupService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final GroupService groupService;
    private final FileService fileService;
    private final UserRepository userRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          ChatService chatService,
                          GroupService groupService,
                          FileService fileService,
                          UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
        this.groupService = groupService;
        this.fileService = fileService;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat/private")
    public void sendPrivateMessage(@Payload ChatMessage message, Principal principal) {
        if (!isActiveSender(message.getSenderId(), principal)
                || message.getReceiverId() == null
                || !userRepository.existsById(message.getReceiverId())) {
            return;
        }

        message.setTime(LocalDateTime.now());
        message.setStatus(0);

        String audioUrl = null;
        if (message.getMsgType() != null && message.getMsgType() == 1 && message.getAudioData() != null) {
            try {
                audioUrl = fileService.saveBase64Audio(message.getAudioData());
            } catch (Exception e) {
                audioUrl = null;
            }
            message.setAudioData(audioUrl);
        }

        PrivateMessage saved = chatService.savePrivateMessage(
                message.getSenderId(), message.getReceiverId(),
                message.getContent(), message.getMsgType(), audioUrl);
        message.setId(saved.getId());

        User sender = userRepository.findById(message.getSenderId()).orElse(null);
        if (sender != null) {
            message.setSender(sender.getDisplayName());
        }

        messagingTemplate.convertAndSendToUser(
                message.getReceiverId().toString(), "/queue/private", message);
    }

    @MessageMapping("/chat/group")
    public void sendGroupMessage(@Payload ChatMessage message, Principal principal) {
        Long groupId = parseLong(message.getReceiver());
        if (!isActiveSender(message.getSenderId(), principal)
                || groupId == null
                || !groupService.isMember(groupId, message.getSenderId())) {
            return;
        }

        message.setTime(LocalDateTime.now());

        String audioUrl = null;
        if (message.getMsgType() != null && message.getMsgType() == 1 && message.getAudioData() != null) {
            try {
                audioUrl = fileService.saveBase64Audio(message.getAudioData());
            } catch (Exception e) {
                audioUrl = null;
            }
            message.setAudioData(audioUrl);
        }

        groupService.saveGroupMessage(
                groupId, message.getSenderId(),
                message.getContent(), message.getMsgType(), audioUrl);

        User sender = userRepository.findById(message.getSenderId()).orElse(null);
        if (sender != null) {
            message.setSender(sender.getDisplayName());
        }

        messagingTemplate.convertAndSend(
                "/topic/group/" + message.getReceiver(), message);
    }

    private boolean isActiveSender(Long senderId, Principal principal) {
        if (senderId == null || principal == null) {
            return false;
        }
        return senderId.toString().equals(principal.getName()) && userRepository.existsById(senderId);
    }

    private Long parseLong(String value) {
        try {
            return value == null ? null : Long.parseLong(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
