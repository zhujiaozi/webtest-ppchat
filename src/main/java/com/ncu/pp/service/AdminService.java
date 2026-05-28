package com.ncu.pp.service;

import com.ncu.pp.entity.Admin;
import com.ncu.pp.repository.AdminRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminService implements CommandLineRunner {
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(AdminRepository adminRepository, PasswordEncoder passwordEncoder) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Admin login(String username, String password) {
        Admin admin = adminRepository.findByUsername(username);
        if (admin == null || !passwordEncoder.matches(password, admin.getPassword())) {
            return null;
        }
        return admin;
    }

    public Admin getById(Long id) {
        return adminRepository.findById(id).orElse(null);
    }

    public void ensureDefaultAdmin() {
        if (adminRepository.count() == 0) {
            Admin admin = new Admin();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setNickname("系统管理员");
            adminRepository.save(admin);
        }
    }

    @Override
    public void run(String... args) {
        ensureDefaultAdmin();
    }
}
