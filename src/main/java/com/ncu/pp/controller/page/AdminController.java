package com.ncu.pp.controller.page;

import com.ncu.pp.entity.Admin;
import com.ncu.pp.service.AdminService;
import com.ncu.pp.service.LoginAttemptService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class AdminController {
    private final AdminService adminService;
    private final LoginAttemptService loginAttemptService;

    public AdminController(AdminService adminService, LoginAttemptService loginAttemptService) {
        this.adminService = adminService;
        this.loginAttemptService = loginAttemptService;
    }

    @GetMapping("/admin/login")
    public String loginPage() {
        return "admin-login";
    }

    @PostMapping("/admin/login")
    public String doLogin(@RequestParam String username, @RequestParam String password,
                          HttpSession session, Model model) {
        var lockMessage = loginAttemptService.getLockMessage("admin", username);
        if (lockMessage.isPresent()) {
            model.addAttribute("error", lockMessage.get());
            return "admin-login";
        }

        Admin admin = adminService.login(username, password);
        if (admin == null) {
            model.addAttribute("error", loginAttemptService.recordFailure("admin", username)
                    .orElse("用户名或密码错误"));
            return "admin-login";
        }
        loginAttemptService.recordSuccess("admin", username);
        session.setAttribute("currentAdmin", admin);
        return "redirect:/admin";
    }

    @GetMapping("/admin/logout")
    public String logout(HttpSession session) {
        session.removeAttribute("currentAdmin");
        return "redirect:/admin/login";
    }

    @GetMapping("/admin")
    public String adminPage() {
        return "admin";
    }
}
