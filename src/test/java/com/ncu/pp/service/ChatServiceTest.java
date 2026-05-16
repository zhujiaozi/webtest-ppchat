package com.ncu.pp.service;

import com.ncu.pp.entity.PrivateMessage;
import com.ncu.pp.entity.User;
import com.ncu.pp.repository.PrivateMessageRepository;
import com.ncu.pp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private PrivateMessageRepository privateMessageRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChatService chatService;

    private User sender;
    private User receiver;
    private PrivateMessage testMessage;

    @BeforeEach
    void setUp() {
        sender = new User();
        sender.setId(1L);
        sender.setUsername("sender");
        sender.setNickname("Sender");

        receiver = new User();
        receiver.setId(2L);
        receiver.setUsername("receiver");
        receiver.setNickname("Receiver");

        testMessage = new PrivateMessage();
        testMessage.setId(1L);
        testMessage.setSenderId(1L);
        testMessage.setReceiverId(2L);
        testMessage.setContent("Hello!");
        testMessage.setMsgType(0);
        testMessage.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void savePrivateMessage_Success() {
        // Arrange
        when(privateMessageRepository.save(any(PrivateMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        PrivateMessage result = chatService.savePrivateMessage(1L, 2L, "Hello!", 0, null);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getSenderId());
        assertEquals(2L, result.getReceiverId());
        assertEquals("Hello!", result.getContent());
        assertEquals(0, result.getMsgType());
        verify(privateMessageRepository).save(any(PrivateMessage.class));
    }

    @Test
    void saveVoiceMessage_Success() {
        // Arrange
        String audioData = "data:audio/webm;base64,test";
        when(privateMessageRepository.save(any(PrivateMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        PrivateMessage result = chatService.savePrivateMessage(1L, 2L, "[语音消息 5s]", 1, audioData);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getMsgType());
        assertEquals(audioData, result.getAudioData());
    }

    @Test
    void getConversation_ReturnsMessages() {
        // Arrange
        List<PrivateMessage> messages = Arrays.asList(testMessage);
        when(privateMessageRepository.findConversation(1L, 2L)).thenReturn(messages);

        // Act
        List<PrivateMessage> result = chatService.getConversation(1L, 2L);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Hello!", result.get(0).getContent());
        verify(privateMessageRepository).findConversation(1L, 2L);
    }

    @Test
    void searchConversation_FindsMatchingMessages() {
        // Arrange
        List<PrivateMessage> messages = Arrays.asList(testMessage);
        when(privateMessageRepository.searchInConversation(1L, 2L, "Hello")).thenReturn(messages);

        // Act
        List<PrivateMessage> result = chatService.searchConversation(1L, 2L, "Hello");

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(privateMessageRepository).searchInConversation(1L, 2L, "Hello");
    }

    @Test
    void markAsRead_CallsRepository() {
        // Act
        chatService.markAsRead(1L, 2L);

        // Assert
        verify(privateMessageRepository).markAsRead(1L, 2L);
    }

    @Test
    void exportConversation_GeneratesText() {
        // Arrange
        List<PrivateMessage> messages = Arrays.asList(testMessage);
        when(privateMessageRepository.findConversation(1L, 2L)).thenReturn(messages);
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));

        // Act
        String result = chatService.exportConversation(1L, 2L);

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("Sender"));
        assertTrue(result.contains("Hello!"));
    }

    @Test
    void exportConversation_UnknownSender() {
        // Arrange
        List<PrivateMessage> messages = Arrays.asList(testMessage);
        when(privateMessageRepository.findConversation(1L, 2L)).thenReturn(messages);
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // Act
        String result = chatService.exportConversation(1L, 2L);

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("未知"));
    }
}
