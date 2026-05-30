package com.ncu.pp.interceptor;

import com.ncu.pp.entity.User;
import com.ncu.pp.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class LoginInterceptor implements HandlerInterceptor {

    private final UserRepository userRepository;

    public LoginInterceptor(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HttpSession session = request.getSession(false);
        if (session != null) {
            Object currentUser = session.getAttribute("currentUser");
            if (currentUser instanceof User user && user.getId() != null && userRepository.existsById(user.getId())) {
                return true;
            }
            if (currentUser != null) {
                session.invalidate();
            }
        }

        String uri = request.getRequestURI();
        if (uri.startsWith("/api/")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"未登录或账号已失效\",\"code\":401}");
            return false;
        }

        response.sendRedirect("/login");
        return false;
    }
}
