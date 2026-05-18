package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.User;
import com.ncu.pp.service.FileService;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileRestController {
    private final UserService userService;
    private final FileService fileService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public ProfileRestController(UserService userService, FileService fileService) {
        this.userService = userService;
        this.fileService = fileService;
    }

    @GetMapping
    public ApiResponse<User> getProfile(HttpSession session) {
        return ApiResponse.ok((User) session.getAttribute("currentUser"));
    }

    @GetMapping("/{userId}")
    public ApiResponse<User> getUserById(@PathVariable Long userId) {
        return ApiResponse.ok(userService.getById(userId));
    }

    @PutMapping("/nickname")
    public ApiResponse<User> updateNickname(@RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        user.setNickname(body.get("nickname"));
        userService.updateProfile(user);
        session.setAttribute("currentUser", user);
        return ApiResponse.ok(user);
    }

    @PostMapping("/avatar")
    public ApiResponse<String> updateAvatar(@RequestParam MultipartFile file, HttpSession session) throws IOException {
        User user = (User) session.getAttribute("currentUser");
        String avatarUrl = fileService.upload(file);
        user.setAvatar(avatarUrl);
        userService.updateProfile(user);
        session.setAttribute("currentUser", user);
        return ApiResponse.ok(avatarUrl);
    }

    @PutMapping("/password")
    public ApiResponse<Void> updatePassword(@RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        if (!passwordEncoder.matches(body.get("oldPassword"), user.getPassword())) {
            throw new IllegalArgumentException("原密码错误");
        }
        userService.updatePassword(user, body.get("newPassword"));
        return ApiResponse.ok();
    }
}
