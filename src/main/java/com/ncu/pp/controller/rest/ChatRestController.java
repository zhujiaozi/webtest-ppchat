package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.PrivateMessage;
import com.ncu.pp.entity.User;
import com.ncu.pp.service.ChatService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatRestController {
    private final ChatService chatService;

    public ChatRestController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/private/{friendId}")
    public ApiResponse<List<PrivateMessage>> getConversation(@PathVariable Long friendId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return ApiResponse.ok(chatService.getConversation(user.getId(), friendId));
    }

    @GetMapping("/private/{friendId}/search")
    public ApiResponse<List<PrivateMessage>> search(@PathVariable Long friendId,
                                                    @RequestParam String keyword,
                                                    HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return ApiResponse.ok(chatService.searchConversation(user.getId(), friendId, keyword));
    }

    @PostMapping("/private/{friendId}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long friendId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        chatService.markAsRead(friendId, user.getId());
        return ApiResponse.ok();
    }

    @GetMapping("/private/{friendId}/unread")
    public ApiResponse<Long> getUnreadCount(@PathVariable Long friendId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return ApiResponse.ok(chatService.getUnreadCount(friendId, user.getId()));
    }

    @GetMapping("/private/{friendId}/export")
    public ResponseEntity<byte[]> export(@PathVariable Long friendId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        String content = chatService.exportConversation(user.getId(), friendId);
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=chat.txt")
                .contentType(MediaType.TEXT_PLAIN)
                .body(bytes);
    }
}
