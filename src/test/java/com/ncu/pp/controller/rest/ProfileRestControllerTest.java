package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.User;
import com.ncu.pp.service.FileService;
import com.ncu.pp.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileRestControllerTest {
    @Mock
    private UserService userService;
    @Mock
    private FileService fileService;

    private ProfileRestController controller;
    private MockHttpSession session;
    private User user;

    @BeforeEach
    void setUp() {
        controller = new ProfileRestController(userService, fileService);
        session = new MockHttpSession();
        user = new User();
        user.setId(1L);
        user.setPassword(new BCryptPasswordEncoder().encode("old"));
        session.setAttribute("currentUser", user);
    }

    @Test
    void updateNicknameReturnsUpdatedUser() {
        ApiResponse<User> response = controller.updateNickname(Map.of("nickname", "Dex"), session);

        assertEquals("Dex", response.data().getNickname());
        verify(userService).updateProfile(user);
    }

    @Test
    void updatePasswordReturnsSuccessForValidOldPassword() {
        ApiResponse<Void> response = controller.updatePassword(
                Map.of("oldPassword", "old", "newPassword", "new"),
                session
        );

        assertEquals(200, response.code());
        verify(userService).updatePassword(user, "new");
    }

    @Test
    void updatePasswordRejectsWrongOldPassword() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> controller.updatePassword(Map.of("oldPassword", "bad", "newPassword", "new"), session)
        );

        assertEquals("原密码错误", ex.getMessage());
        verify(userService, never()).updatePassword(any(), anyString());
    }
}
