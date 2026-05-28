package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.*;
import com.ncu.pp.repository.*;
import com.ncu.pp.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminRestController {

    private final UserRepository userRepository;
    private final FriendRepository friendRepository;
    private final FriendGroupRepository friendGroupRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final PrivateMessageRepository privateMessageRepository;
    private final GroupChatRepository groupChatRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final GroupInvitationRepository groupInvitationRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    public AdminRestController(UserRepository userRepository,
                               FriendRepository friendRepository,
                               FriendGroupRepository friendGroupRepository,
                               FriendRequestRepository friendRequestRepository,
                               PrivateMessageRepository privateMessageRepository,
                               GroupChatRepository groupChatRepository,
                               GroupMemberRepository groupMemberRepository,
                               GroupMessageRepository groupMessageRepository,
                               GroupInvitationRepository groupInvitationRepository,
                               UserService userService,
                               PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.friendRepository = friendRepository;
        this.friendGroupRepository = friendGroupRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.privateMessageRepository = privateMessageRepository;
        this.groupChatRepository = groupChatRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupMessageRepository = groupMessageRepository;
        this.groupInvitationRepository = groupInvitationRepository;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    // ==================== Dashboard ====================

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Long>> dashboard() {
        Map<String, Long> counts = new HashMap<>();
        counts.put("users", userRepository.count());
        counts.put("friends", friendRepository.count());
        counts.put("friendGroups", friendGroupRepository.count());
        counts.put("friendRequests", friendRequestRepository.count());
        counts.put("privateMessages", privateMessageRepository.count());
        counts.put("groupChats", groupChatRepository.count());
        counts.put("groupMembers", groupMemberRepository.count());
        counts.put("groupMessages", groupMessageRepository.count());
        counts.put("groupInvitations", groupInvitationRepository.count());
        return ApiResponse.ok(counts);
    }

    // ==================== Users ====================

    @GetMapping("/users")
    public ApiResponse<List<User>> listUsers() {
        return ApiResponse.ok(userRepository.findAll());
    }

    @DeleteMapping("/users/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ApiResponse.ok();
    }

    @PostMapping("/users/{id}/ban")
    public ApiResponse<Void> banUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ApiResponse.fail(404, "用户不存在");
        }
        user.setStatus(-1);
        userRepository.save(user);
        return ApiResponse.ok();
    }

    @PostMapping("/users/{id}/unban")
    public ApiResponse<Void> unbanUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ApiResponse.fail(404, "用户不存在");
        }
        user.setStatus(0);
        userRepository.save(user);
        return ApiResponse.ok();
    }

    @PostMapping("/users/{id}/reset-password")
    public ApiResponse<Void> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ApiResponse.fail(404, "用户不存在");
        }
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.isBlank()) {
            return ApiResponse.fail(400, "密码不能为空");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ApiResponse.ok();
    }

    // ==================== Friends ====================

    @GetMapping("/friends")
    public ApiResponse<List<Friend>> listFriends() {
        return ApiResponse.ok(friendRepository.findAll());
    }

    @DeleteMapping("/friends/{id}")
    public ApiResponse<Void> deleteFriend(@PathVariable Long id) {
        friendRepository.deleteById(id);
        return ApiResponse.ok();
    }

    // ==================== Friend Groups ====================

    @GetMapping("/friend-groups")
    public ApiResponse<List<FriendGroup>> listFriendGroups() {
        return ApiResponse.ok(friendGroupRepository.findAll());
    }

    @DeleteMapping("/friend-groups/{id}")
    public ApiResponse<Void> deleteFriendGroup(@PathVariable Long id) {
        friendGroupRepository.deleteById(id);
        return ApiResponse.ok();
    }

    // ==================== Friend Requests ====================

    @GetMapping("/friend-requests")
    public ApiResponse<List<FriendRequest>> listFriendRequests() {
        return ApiResponse.ok(friendRequestRepository.findAll());
    }

    @DeleteMapping("/friend-requests/{id}")
    public ApiResponse<Void> deleteFriendRequest(@PathVariable Long id) {
        friendRequestRepository.deleteById(id);
        return ApiResponse.ok();
    }

    // ==================== Private Messages ====================

    @GetMapping("/private-messages")
    public ApiResponse<List<PrivateMessage>> listPrivateMessages() {
        return ApiResponse.ok(privateMessageRepository.findAll());
    }

    @DeleteMapping("/private-messages/{id}")
    public ApiResponse<Void> deletePrivateMessage(@PathVariable Long id) {
        privateMessageRepository.deleteById(id);
        return ApiResponse.ok();
    }

    // ==================== Group Chats ====================

    @GetMapping("/group-chats")
    public ApiResponse<List<GroupChat>> listGroupChats() {
        return ApiResponse.ok(groupChatRepository.findAll());
    }

    @DeleteMapping("/group-chats/{id}")
    public ApiResponse<Void> deleteGroupChat(@PathVariable Long id) {
        groupChatRepository.deleteById(id);
        return ApiResponse.ok();
    }

    // ==================== Group Members ====================

    @GetMapping("/group-members")
    public ApiResponse<List<GroupMember>> listGroupMembers() {
        return ApiResponse.ok(groupMemberRepository.findAll());
    }

    @DeleteMapping("/group-members/{id}")
    public ApiResponse<Void> deleteGroupMember(@PathVariable Long id) {
        groupMemberRepository.deleteById(id);
        return ApiResponse.ok();
    }

    // ==================== Group Messages ====================

    @GetMapping("/group-messages")
    public ApiResponse<List<GroupMessage>> listGroupMessages() {
        return ApiResponse.ok(groupMessageRepository.findAll());
    }

    @DeleteMapping("/group-messages/{id}")
    public ApiResponse<Void> deleteGroupMessage(@PathVariable Long id) {
        groupMessageRepository.deleteById(id);
        return ApiResponse.ok();
    }

    // ==================== Group Invitations ====================

    @GetMapping("/group-invitations")
    public ApiResponse<List<GroupInvitation>> listGroupInvitations() {
        return ApiResponse.ok(groupInvitationRepository.findAll());
    }

    @DeleteMapping("/group-invitations/{id}")
    public ApiResponse<Void> deleteGroupInvitation(@PathVariable Long id) {
        groupInvitationRepository.deleteById(id);
        return ApiResponse.ok();
    }
}
