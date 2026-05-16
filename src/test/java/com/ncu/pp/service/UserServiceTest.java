package com.ncu.pp.service;

import com.ncu.pp.entity.User;
import com.ncu.pp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setPassword("$2a$10$encodedpassword");
        testUser.setNickname("Test User");
        testUser.setStatus(0);
        testUser.setLoginCount(0);
    }

    @Test
    void register_Success() {
        // Arrange
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("$2a$10$encoded");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        String result = userService.register("newuser", "password123", "New User");

        // Assert
        assertNull(result);
        verify(userRepository).existsByUsername("newuser");
        verify(passwordEncoder).encode("password123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_UsernameExists() {
        // Arrange
        when(userRepository.existsByUsername("existinguser")).thenReturn(true);

        // Act
        String result = userService.register("existinguser", "password123", "Existing User");

        // Assert
        assertEquals("用户名已存在", result);
        verify(userRepository).existsByUsername("existinguser");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_WithoutNickname() {
        // Arrange
        when(userRepository.existsByUsername("nonickuser")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("$2a$10$encoded");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            assertEquals("nonickuser", saved.getNickname());
            return saved;
        });

        // Act
        String result = userService.register("nonickuser", "password123", null);

        // Assert
        assertNull(result);
    }

    @Test
    void login_Success() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(testUser);
        when(passwordEncoder.matches("correctpassword", testUser.getPassword())).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        User result = userService.login("testuser", "correctpassword");

        // Assert
        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        assertEquals(1, result.getStatus());
        assertEquals(1, result.getLoginCount());
        assertNotNull(result.getLastLogin());
        verify(userRepository).findByUsername("testuser");
        verify(passwordEncoder).matches("correctpassword", testUser.getPassword());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void login_UserNotFound() {
        // Arrange
        when(userRepository.findByUsername("nonexistent")).thenReturn(null);

        // Act
        User result = userService.login("nonexistent", "password");

        // Assert
        assertNull(result);
        verify(userRepository).findByUsername("nonexistent");
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void login_WrongPassword() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(testUser);
        when(passwordEncoder.matches("wrongpassword", testUser.getPassword())).thenReturn(false);

        // Act
        User result = userService.login("testuser", "wrongpassword");

        // Assert
        assertNull(result);
        verify(userRepository).findByUsername("testuser");
        verify(passwordEncoder).matches("wrongpassword", testUser.getPassword());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void getById_ExistingUser() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // Act
        User result = userService.getById(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("testuser", result.getUsername());
    }

    @Test
    void getById_NonExistingUser() {
        // Arrange
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // Act
        User result = userService.getById(999L);

        // Assert
        assertNull(result);
    }

    @Test
    void getByUsername_ExistingUser() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(testUser);

        // Act
        User result = userService.getByUsername("testuser");

        // Assert
        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
    }

    @Test
    void updateProfile() {
        // Arrange
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        userService.updateProfile(testUser);

        // Assert
        assertNotNull(testUser.getUpdatedAt());
        verify(userRepository).save(testUser);
    }

    @Test
    void updatePassword() {
        // Arrange
        when(passwordEncoder.encode("newpassword")).thenReturn("$2a$10$newencoded");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        userService.updatePassword(testUser, "newpassword");

        // Assert
        assertEquals("$2a$10$newencoded", testUser.getPassword());
        assertNotNull(testUser.getUpdatedAt());
        verify(passwordEncoder).encode("newpassword");
        verify(userRepository).save(testUser);
    }
}
