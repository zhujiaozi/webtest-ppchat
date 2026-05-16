package com.ncu.pp.controller.rest;

import com.ncu.pp.entity.User;
import com.ncu.pp.service.FileService;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileRestController {

    private final UserService userService;
    private final FileService fileService;

    public ProfileRestController(UserService userService, FileService fileService) {
        this.userService = userService;
        this.fileService = fileService;
    }

    /** 获取当前用户信息 */
    @GetMapping
    public User getProfile(HttpSession session) {
        return (User) session.getAttribute("currentUser");
    }

    /** 更新昵称 */
    @PutMapping("/nickname")
    public Map<String, Object> updateNickname(@RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        user.setNickname(body.get("nickname"));
        userService.updateProfile(user);
        session.setAttribute("currentUser", user);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("user", user);
        return result;
    }

    /** 更新头像 */
    @PostMapping("/avatar")
    public Map<String, Object> updateAvatar(@RequestParam MultipartFile file, HttpSession session) throws IOException {
        User user = (User) session.getAttribute("currentUser");
        String avatarUrl = fileService.upload(file);
        user.setAvatar(avatarUrl);
        userService.updateProfile(user);
        session.setAttribute("currentUser", user);
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("avatar", avatarUrl);
        return result;
    }

    /** 修改密码 */
    @PutMapping("/password")
    public Map<String, Object> updatePassword(@RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        Map<String, Object> result = new HashMap<>();
        if (!new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()
                .matches(body.get("oldPassword"), user.getPassword())) {
            result.put("success", false);
            result.put("error", "原密码错误");
            return result;
        }
        userService.updatePassword(user, body.get("newPassword"));
        result.put("success", true);
        return result;
    }
}
