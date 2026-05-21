package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.*;
import com.ncu.pp.service.GroupService;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

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
            item.put("nickname", u != null ? u.getDisplayName() : "用户" + m.getUserId());
            members.add(item);
        }
        result.put("members", members);
        result.put("isOwner", group != null && group.getOwnerId().equals(user.getId()));
        return ApiResponse.ok(result);
    }

    @PutMapping("/{id}/notice")
    public ApiResponse<Void> updateNotice(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        GroupChat group = groupService.getGroup(id);
        if (group == null || !group.getOwnerId().equals(user.getId())) {
            throw new IllegalArgumentException("只有群主可以修改群公告");
        }
        groupService.updateNotice(id, body.get("notice"));
        return ApiResponse.ok();
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ApiResponse<Void> kickMember(@PathVariable Long id, @PathVariable Long userId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        GroupChat group = groupService.getGroup(id);
        if (group == null || !group.getOwnerId().equals(user.getId())) {
            throw new IllegalArgumentException("只有群主可以踢出成员");
        }
        groupService.removeMember(id, userId);
        return ApiResponse.ok();
    }

    @PostMapping("/{id}/leave")
    public ApiResponse<Void> leaveGroup(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.leaveGroup(id, user.getId());
        return ApiResponse.ok();
    }

    @PostMapping("/{id}/invite")
    public ApiResponse<Void> inviteMember(@PathVariable Long id, @RequestBody Map<String, Long> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        Long toUserId = body.get("userId");
        GroupChat group = groupService.getGroup(id);
        if (group == null || !group.getOwnerId().equals(user.getId())) {
            throw new IllegalArgumentException("只有群主可以邀请成员");
        }
        groupService.sendInvitation(id, user.getId(), toUserId);
        return ApiResponse.ok();
    }

    @GetMapping("/invitations")
    public ApiResponse<List<Map<String, Object>>> getInvitations(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        List<GroupInvitation> invitations = groupService.getPendingInvitations(user.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (GroupInvitation inv : invitations) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", inv.getId());
            item.put("groupId", inv.getGroupId());
            item.put("fromUserId", inv.getFromUserId());
            item.put("toUserId", inv.getToUserId());
            item.put("status", inv.getStatus());
            item.put("createdAt", inv.getCreatedAt());
            User sender = userService.getById(inv.getFromUserId());
            item.put("fromUserName", sender != null ? sender.getDisplayName() : "用户");
            GroupChat group = groupService.getGroup(inv.getGroupId());
            item.put("groupName", group != null ? group.getName() : "群聊");
            result.add(item);
        }
        return ApiResponse.ok(result);
    }

    @PostMapping("/invitations/{id}/accept")
    public ApiResponse<Void> acceptInvitation(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.acceptInvitation(id, user.getId());
        return ApiResponse.ok();
    }

    @PostMapping("/invitations/{id}/reject")
    public ApiResponse<Void> rejectInvitation(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.rejectInvitation(id, user.getId());
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

    @GetMapping("/{id}/export")
    public org.springframework.http.ResponseEntity<byte[]> exportGroupChat(@PathVariable Long id) {
        List<GroupMessage> messages = groupService.getGroupMessages(id);
        List<Long> senderIds = messages.stream().map(GroupMessage::getSenderId).distinct().toList();
        Map<Long, String> senderNameMap = senderIds.isEmpty() ? Map.of() :
                userService.getByIds(senderIds).stream()
                        .collect(Collectors.toMap(User::getId, User::getDisplayName));
        StringBuilder sb = new StringBuilder();
        for (GroupMessage m : messages) {
            String name = senderNameMap.getOrDefault(m.getSenderId(), "用户");
            sb.append(String.format("[%s] %s: %s\n", m.getCreatedAt(), name,
                    m.getMsgType() == 1 ? "[语音消息]" : m.getContent()));
        }
        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=group-chat.txt")
                .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                .body(bytes);
    }

    private List<Map<String, Object>> enrichMessages(List<GroupMessage> messages) {
        // 批量加载发送者信息，避免 N+1
        List<Long> senderIds = messages.stream().map(GroupMessage::getSenderId).distinct().toList();
        Map<Long, String> senderNameMap = senderIds.isEmpty() ? Map.of() :
                userService.getByIds(senderIds).stream()
                        .collect(Collectors.toMap(User::getId, User::getDisplayName));

        List<Map<String, Object>> result = new ArrayList<>();
        for (GroupMessage m : messages) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", m.getId());
            item.put("senderId", m.getSenderId());
            item.put("content", m.getContent());
            item.put("msgType", m.getMsgType());
            item.put("audioData", m.getAudioData());
            item.put("createdAt", m.getCreatedAt());
            item.put("sender", senderNameMap.getOrDefault(m.getSenderId(), "用户"));
            result.add(item);
        }
        return result;
    }
}
