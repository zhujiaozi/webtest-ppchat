package com.ncu.pp.controller.page;

import com.ncu.pp.entity.User;
import com.ncu.pp.service.LoginAttemptService;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class PageController {

    private final UserService userService;
    private final LoginAttemptService loginAttemptService;

    public PageController(UserService userService, LoginAttemptService loginAttemptService) {
        this.userService = userService;
        this.loginAttemptService = loginAttemptService;
    }

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @PostMapping("/login")
    public String doLogin(@RequestParam String username, @RequestParam String password,
                          HttpSession session, Model model) {
        var lockMessage = loginAttemptService.getLockMessage("user", username);
        if (lockMessage.isPresent()) {
            model.addAttribute("error", lockMessage.get());
            return "login";
        }

        User user = userService.login(username, password);
        if (user == null) {
            model.addAttribute("error", loginAttemptService.recordFailure("user", username)
                    .orElse("用户名或密码错误"));
            return "login";
        }
        loginAttemptService.recordSuccess("user", username);
        session.setAttribute("currentUser", user);
        return "redirect:/chat";
    }

    @GetMapping("/register")
    public String registerPage() {
        return "register";
    }

    @PostMapping("/register")
    public String doRegister(@RequestParam String username, @RequestParam String password,
                             @RequestParam(required = false) String nickname, Model model) {
        String error = userService.register(username, password, nickname);
        if (error != null) {
            model.addAttribute("error", error);
            return "register";
        }
        return "redirect:/login";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        if (user != null) {
            user.setStatus(0);
            userService.updateProfile(user);
        }
        session.invalidate();
        return "redirect:/login";
    }

    @GetMapping("/")
    public String index(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        if (user != null) {
            return "redirect:/chat";
        }
        return "landing";
    }

    @GetMapping("/forgot-password")
    public String forgotPasswordPage() {
        return "forgot-password";
    }

    @PostMapping("/forgot-password")
    public String doForgotPassword(@RequestParam String username,
                                   @RequestParam String newPassword,
                                   Model model) {
        String error = userService.resetPassword(username, newPassword);
        if (error != null) {
            model.addAttribute("error", error);
            model.addAttribute("username", username);
            return "forgot-password";
        }
        model.addAttribute("success", "密码已重置，请使用新密码登录");
        return "forgot-password";
    }
}
