package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.*;
import com.ncu.pp.service.GroupService;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/groups")
public class GroupRestController {
    private final GroupService groupService;
    private final UserService userService;

    public GroupRestController(GroupService groupService, UserService userService) {
        this.groupService = groupService;
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<List<GroupChat>> getUserGroups(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return ApiResponse.ok(groupService.getUserGroups(user.getId()));
    }

    @PostMapping
    public ApiResponse<GroupChat> createGroup(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        String name = (String) body.get("name");
        @SuppressWarnings("unchecked")
        List<Long> memberIds = ((List<Number>) body.getOrDefault("memberIds", List.of()))
                .stream().map(Number::longValue).toList();
        return ApiResponse.ok(groupService.createGroup(name, user.getId(), memberIds));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getGroupDetail(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        GroupChat group = groupService.getGroup(id);
        Map<String, Object> result = new HashMap<>();
        result.put("group", group);
        List<Map<String, Object>> members = new ArrayList<>();
        for (GroupMember m : groupService.getMembers(id)) {
            Map<String, Object> item = new HashMap<>();
            item.put("userId", m.getUserId());
            item.put("role", m.getRole());
            item.put("joinedAt", m.getJoinedAt());
            User u = userService.getById(m.getUserId());
            item.put("nickname", u != null ? (u.getNickname() != null ? u.getNickname() : u.getUsername()) : "用户" + m.getUserId());
            members.add(item);
        }
        result.put("members", members);
        result.put("isOwner", group != null && group.getOwnerId().equals(user.getId()));
        return ApiResponse.ok(result);
    }

    @PutMapping("/{id}/notice")
    public ApiResponse<Void> updateNotice(@PathVariable Long id, @RequestBody Map<String, String> body) {
        groupService.updateNotice(id, body.get("notice"));
        return ApiResponse.ok();
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ApiResponse<Void> kickMember(@PathVariable Long id, @PathVariable Long userId) {
        groupService.removeMember(id, userId);
        return ApiResponse.ok();
    }

    @PostMapping("/{id}/leave")
    public ApiResponse<Void> leaveGroup(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.leaveGroup(id, user.getId());
        return ApiResponse.ok();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> dissolveGroup(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.dissolveGroup(id, user.getId());
        return ApiResponse.ok();
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<List<Map<String, Object>>> getMessages(@PathVariable Long id) {
        return ApiResponse.ok(enrichMessages(groupService.getGroupMessages(id)));
    }

    @GetMapping("/{id}/messages/search")
    public ApiResponse<List<Map<String, Object>>> search(@PathVariable Long id, @RequestParam String keyword) {
        return ApiResponse.ok(enrichMessages(groupService.searchGroupMessages(id, keyword)));
    }

    private List<Map<String, Object>> enrichMessages(List<GroupMessage> messages) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (GroupMessage m : messages) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", m.getId());
            item.put("senderId", m.getSenderId());
            item.put("content", m.getContent());
            item.put("msgType", m.getMsgType());
            item.put("audioData", m.getAudioData());
            item.put("createdAt", m.getCreatedAt());
            User u = userService.getById(m.getSenderId());
            item.put("sender", u != null ? (u.getNickname() != null ? u.getNickname() : u.getUsername()) : "用户");
            result.add(item);
        }
        return result;
    }
}
