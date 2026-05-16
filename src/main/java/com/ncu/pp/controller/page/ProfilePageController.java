package com.ncu.pp.controller.page;

import com.ncu.pp.entity.User;
import com.ncu.pp.service.FileService;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import java.io.IOException;

@Controller
@RequestMapping("/profile")
public class ProfilePageController {

    private final UserService userService;
    private final FileService fileService;

    public ProfilePageController(UserService userService, FileService fileService) {
        this.userService = userService;
        this.fileService = fileService;
    }

    @GetMapping
    public String profile(HttpSession session, Model model) {
        User user = (User) session.getAttribute("currentUser");
        model.addAttribute("user", user);
        return "profile";
    }

    @PostMapping("/update")
    public String update(@RequestParam String nickname,
                         @RequestParam(required = false) MultipartFile avatarFile,
                         HttpSession session, RedirectAttributes ra) throws IOException {
        User user = (User) session.getAttribute("currentUser");
        user.setNickname(nickname);
        if (avatarFile != null && !avatarFile.isEmpty()) {
            user.setAvatar(fileService.upload(avatarFile));
        }
        userService.updateProfile(user);
        session.setAttribute("currentUser", user);
        ra.addFlashAttribute("msg", "更新成功");
        return "redirect:/profile";
    }

    @PostMapping("/password")
    public String changePassword(@RequestParam String oldPassword,
                                  @RequestParam String newPassword,
                                  HttpSession session, RedirectAttributes ra) {
        User user = (User) session.getAttribute("currentUser");
        User checked = userService.login(user.getUsername(), oldPassword);
        if (checked == null) {
            ra.addFlashAttribute("error", "原密码错误");
            return "redirect:/profile";
        }
        userService.updatePassword(user, newPassword);
        ra.addFlashAttribute("msg", "密码修改成功");
        return "redirect:/profile";
    }
}
