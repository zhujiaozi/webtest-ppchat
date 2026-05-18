package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.PrivateMessage;
import com.ncu.pp.entity.User;
import com.ncu.pp.service.ChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatRestControllerTest {
    @Mock
    private ChatService chatService;

    private ChatRestController controller;
    private MockHttpSession session;

    @BeforeEach
    void setUp() {
        controller = new ChatRestController(chatService);
        session = new MockHttpSession();
        User user = new User();
        user.setId(1L);
        session.setAttribute("currentUser", user);
    }

    @Test
    void getConversationWrapsMessages() {
        PrivateMessage message = new PrivateMessage();
        when(chatService.getConversation(1L, 2L)).thenReturn(List.of(message));

        ApiResponse<List<PrivateMessage>> response = controller.getConversation(2L, session);

        assertEquals(200, response.code());
        assertEquals(1, response.data().size());
        verify(chatService).getConversation(1L, 2L);
    }

    @Test
    void markAsReadReturnsSuccessEnvelope() {
        ApiResponse<Void> response = controller.markAsRead(2L, session);

        assertEquals(200, response.code());
        assertNull(response.data());
        verify(chatService).markAsRead(2L, 1L);
    }

    @Test
    void unreadCountReturnsWrappedValue() {
        when(chatService.getUnreadCount(2L, 1L)).thenReturn(3L);

        ApiResponse<Long> response = controller.getUnreadCount(2L, session);

        assertEquals(3L, response.data());
    }
}
