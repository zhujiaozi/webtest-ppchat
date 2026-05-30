package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.AdminPageResponse;
import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.*;
import com.ncu.pp.repository.*;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
    private final AdminOperationLogRepository operationLogRepository;
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
                               AdminOperationLogRepository operationLogRepository,
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
        this.operationLogRepository = operationLogRepository;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

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
        counts.put("operationLogs", operationLogRepository.count());
        return ApiResponse.ok(counts);
    }

    @GetMapping("/users")
    public ApiResponse<AdminPageResponse<User>> listUsers(@RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(userRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ApiResponse<Void> deleteUser(@PathVariable Long id, HttpSession session) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ApiResponse.fail(404, "用户不存在");
        }
        userService.deleteUserAndData(id);
        log(session, "DELETE", "USER", id, user.getUsername());
        return ApiResponse.ok();
    }

    @PostMapping("/users/{id}/reset-password")
    @Transactional
    public ApiResponse<Void> resetPassword(@PathVariable Long id,
                                           @RequestBody Map<String, String> body,
                                           HttpSession session) {
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
        log(session, "RESET_PASSWORD", "USER", id, user.getUsername());
        return ApiResponse.ok();
    }

    @GetMapping("/friends")
    public ApiResponse<AdminPageResponse<Friend>> listFriends(@RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(friendRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/friends/{id}")
    @Transactional
    public ApiResponse<Void> deleteFriend(@PathVariable Long id, HttpSession session) {
        Friend friend = friendRepository.findById(id).orElse(null);
        if (friend == null) {
            return ApiResponse.fail(404, "好友关系不存在");
        }
        friendRepository.deleteById(id);
        friendRepository.deleteByUserIdAndFriendId(friend.getFriendId(), friend.getUserId());
        log(session, "DELETE", "FRIEND", id, friend.getUserId() + " -> " + friend.getFriendId());
        return ApiResponse.ok();
    }

    @GetMapping("/friend-groups")
    public ApiResponse<AdminPageResponse<FriendGroup>> listFriendGroups(@RequestParam(defaultValue = "0") int page,
                                                                        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(friendGroupRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/friend-groups/{id}")
    @Transactional
    public ApiResponse<Void> deleteFriendGroup(@PathVariable Long id, HttpSession session) {
        FriendGroup group = friendGroupRepository.findById(id).orElse(null);
        if (group == null) {
            return ApiResponse.fail(404, "好友分组不存在");
        }
        friendRepository.clearGroupId(id);
        friendGroupRepository.deleteById(id);
        log(session, "DELETE", "FRIEND_GROUP", id, group.getName());
        return ApiResponse.ok();
    }

    @GetMapping("/friend-requests")
    public ApiResponse<AdminPageResponse<FriendRequest>> listFriendRequests(@RequestParam(defaultValue = "0") int page,
                                                                            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(friendRequestRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/friend-requests/{id}")
    @Transactional
    public ApiResponse<Void> deleteFriendRequest(@PathVariable Long id, HttpSession session) {
        friendRequestRepository.deleteById(id);
        log(session, "DELETE", "FRIEND_REQUEST", id, null);
        return ApiResponse.ok();
    }

    @GetMapping("/private-messages")
    public ApiResponse<AdminPageResponse<PrivateMessage>> listPrivateMessages(@RequestParam(defaultValue = "0") int page,
                                                                              @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(privateMessageRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/private-messages/{id}")
    @Transactional
    public ApiResponse<Void> deletePrivateMessage(@PathVariable Long id, HttpSession session) {
        privateMessageRepository.deleteById(id);
        log(session, "DELETE", "PRIVATE_MESSAGE", id, null);
        return ApiResponse.ok();
    }

    @GetMapping("/group-chats")
    public ApiResponse<AdminPageResponse<GroupChat>> listGroupChats(@RequestParam(defaultValue = "0") int page,
                                                                    @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(groupChatRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/group-chats/{id}")
    @Transactional
    public ApiResponse<Void> deleteGroupChat(@PathVariable Long id, HttpSession session) {
        GroupChat group = groupChatRepository.findById(id).orElse(null);
        if (group == null) {
            return ApiResponse.fail(404, "群聊不存在");
        }
        groupMessageRepository.deleteAllByGroupId(id);
        groupMemberRepository.deleteAllByGroupId(id);
        groupInvitationRepository.deleteAllByGroupId(id);
        groupChatRepository.deleteById(id);
        log(session, "DELETE", "GROUP_CHAT", id, group.getName());
        return ApiResponse.ok();
    }

    @GetMapping("/group-members")
    public ApiResponse<AdminPageResponse<GroupMember>> listGroupMembers(@RequestParam(defaultValue = "0") int page,
                                                                        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(groupMemberRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/group-members/{id}")
    @Transactional
    public ApiResponse<Void> deleteGroupMember(@PathVariable Long id, HttpSession session) {
        groupMemberRepository.deleteById(id);
        log(session, "DELETE", "GROUP_MEMBER", id, null);
        return ApiResponse.ok();
    }

    @GetMapping("/group-messages")
    public ApiResponse<AdminPageResponse<GroupMessage>> listGroupMessages(@RequestParam(defaultValue = "0") int page,
                                                                          @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(groupMessageRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/group-messages/{id}")
    @Transactional
    public ApiResponse<Void> deleteGroupMessage(@PathVariable Long id, HttpSession session) {
        groupMessageRepository.deleteById(id);
        log(session, "DELETE", "GROUP_MESSAGE", id, null);
        return ApiResponse.ok();
    }

    @GetMapping("/group-invitations")
    public ApiResponse<AdminPageResponse<GroupInvitation>> listGroupInvitations(@RequestParam(defaultValue = "0") int page,
                                                                                @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(groupInvitationRepository.findAll(pageable(page, size))));
    }

    @DeleteMapping("/group-invitations/{id}")
    @Transactional
    public ApiResponse<Void> deleteGroupInvitation(@PathVariable Long id, HttpSession session) {
        groupInvitationRepository.deleteById(id);
        log(session, "DELETE", "GROUP_INVITATION", id, null);
        return ApiResponse.ok();
    }

    @GetMapping("/operation-logs")
    public ApiResponse<AdminPageResponse<AdminOperationLog>> listOperationLogs(@RequestParam(defaultValue = "0") int page,
                                                                               @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(AdminPageResponse.from(operationLogRepository.findAll(pageable(page, size))));
    }

    private Pageable pageable(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        return PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id"));
    }

    private void log(HttpSession session, String action, String targetType, Long targetId, String detail) {
        Admin admin = (Admin) session.getAttribute("currentAdmin");
        AdminOperationLog log = new AdminOperationLog();
        if (admin != null) {
            log.setAdminId(admin.getId());
            log.setAdminUsername(admin.getUsername());
        }
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDetail(detail);
        operationLogRepository.save(log);
    }
}
