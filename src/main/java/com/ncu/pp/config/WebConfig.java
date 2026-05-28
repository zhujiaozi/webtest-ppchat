package com.ncu.pp.config;

import com.ncu.pp.interceptor.AdminInterceptor;
import com.ncu.pp.interceptor.LoginInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final LoginInterceptor loginInterceptor;
    private final AdminInterceptor adminInterceptor;

    @Value("${app.upload-dir}")
    private String uploadDir;

    public WebConfig(LoginInterceptor loginInterceptor, AdminInterceptor adminInterceptor) {
        this.loginInterceptor = loginInterceptor;
        this.adminInterceptor = adminInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminInterceptor)
                .addPathPatterns("/admin/**", "/api/admin/**")
                .excludePathPatterns("/admin/login", "/admin/css/**", "/admin/js/**");

        registry.addInterceptor(loginInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/", "/login", "/register", "/forgot-password",
                        "/css/**", "/js/**", "/images/**", "/uploads/**", "/favicon.ico",
                        "/admin/**", "/api/admin/**"
                );
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 使用配置的 upload-dir，支持绝对路径和相对路径
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
        String uploadUri = uploadPath.toUri().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadUri);
    }
}
