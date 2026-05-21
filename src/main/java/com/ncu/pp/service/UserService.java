package com.ncu.pp.service;

import com.ncu.pp.entity.User;
import com.ncu.pp.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public String register(String username, String password, String nickname) {
        if (userRepository.existsByUsername(username)) {
            return "用户名已存在";
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname != null && !nickname.isEmpty() ? nickname : username);
        userRepository.save(user);
        return null;
    }

    @Transactional
    public User login(String username, String password) {
        User user = userRepository.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return null;
        }
        user.setLastLogin(LocalDateTime.now());
        user.setLoginCount(user.getLoginCount() + 1);
        user.setStatus(1);
        userRepository.save(user);
        return user;
    }

    public User getById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public List<User> getByIds(List<Long> ids) {
        return userRepository.findAllById(ids);
    }

    public User getByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional
    public void updateProfile(User user) {
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public void updatePassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public String resetPassword(String username, String newPassword) {
        User user = userRepository.findByUsername(username);
        if (user == null) return "用户不存在";
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return null;
    }
}
