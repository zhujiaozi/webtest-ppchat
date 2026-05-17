package com.ncu.pp.service;

import com.ncu.pp.entity.PrivateMessage;
import com.ncu.pp.entity.User;
import com.ncu.pp.repository.PrivateMessageRepository;
import com.ncu.pp.repository.UserRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ChatService {

    private final PrivateMessageRepository privateMessageRepository;
    private final UserRepository userRepository;

    public ChatService(PrivateMessageRepository privateMessageRepository,
                       UserRepository userRepository) {
        this.privateMessageRepository = privateMessageRepository;
        this.userRepository = userRepository;
    }

    public PrivateMessage savePrivateMessage(Long senderId, Long receiverId, String content,
                                              Integer msgType, String audioData) {
        PrivateMessage msg = new PrivateMessage();
        msg.setSenderId(senderId);
        msg.setReceiverId(receiverId);
        msg.setContent(content);
        msg.setMsgType(msgType);
        msg.setAudioData(audioData);
        return privateMessageRepository.save(msg);
    }

    public List<PrivateMessage> getConversation(Long userId1, Long userId2) {
        return privateMessageRepository.findConversation(userId1, userId2);
    }

    public List<PrivateMessage> searchConversation(Long userId1, Long userId2, String keyword) {
        return privateMessageRepository.searchInConversation(userId1, userId2, keyword);
    }

    public void markAsRead(Long senderId, Long receiverId) {
        privateMessageRepository.markAsRead(senderId, receiverId);
    }

    public long getUnreadCount(Long senderId, Long receiverId) {
        return privateMessageRepository.countByReceiverIdAndSenderIdAndStatus(receiverId, senderId, 0);
    }

    public String exportConversation(Long userId1, Long userId2) {
        List<PrivateMessage> messages = getConversation(userId1, userId2);
        StringBuilder sb = new StringBuilder();
        for (PrivateMessage m : messages) {
            User sender = userRepository.findById(m.getSenderId()).orElse(null);
            String name = sender != null ? (sender.getNickname() != null ? sender.getNickname() : sender.getUsername()) : "未知";
            sb.append(String.format("[%s] %s: %s\n",
                    m.getCreatedAt(), name,
                    m.getMsgType() == 1 ? "[语音消息]" : m.getContent()));
        }
        return sb.toString();
    }
}
