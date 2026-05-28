package com.ncu.pp.service;

import com.ncu.pp.entity.*;
import com.ncu.pp.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FriendRepository friendRepository;
    private final FriendGroupRepository friendGroupRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final PrivateMessageRepository privateMessageRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final GroupInvitationRepository groupInvitationRepository;
    private final GroupChatRepository groupChatRepository;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       FriendRepository friendRepository,
                       FriendGroupRepository friendGroupRepository,
                       FriendRequestRepository friendRequestRepository,
                       PrivateMessageRepository privateMessageRepository,
                       GroupMemberRepository groupMemberRepository,
                       GroupMessageRepository groupMessageRepository,
                       GroupInvitationRepository groupInvitationRepository,
                       GroupChatRepository groupChatRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.friendRepository = friendRepository;
        this.friendGroupRepository = friendGroupRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.privateMessageRepository = privateMessageRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupMessageRepository = groupMessageRepository;
        this.groupInvitationRepository = groupInvitationRepository;
        this.groupChatRepository = groupChatRepository;
    }

    @Transactional
    public String register(String username, String password, String nickname) {
        if (userRepository.existsByUsername(username)) {
            return "用户名已存在";
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname != null && !nickname.isEmpty() ? nickname : username);
        userRepository.save(user);
        return null;
    }

    @Transactional
    public User login(String username, String password) {
        User user = userRepository.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return null;
        }
        user.setLastLogin(LocalDateTime.now());
        user.setLoginCount(user.getLoginCount() + 1);
        user.setStatus(1);
        userRepository.save(user);
        return user;
    }

    public User getById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public List<User> getByIds(List<Long> ids) {
        return userRepository.findAllById(ids);
    }

    public User getByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional
    public void updateProfile(User user) {
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public void updatePassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public String resetPassword(String username, String newPassword) {
        User user = userRepository.findByUsername(username);
        if (user == null) return "用户不存在";
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return null;
    }

    @Transactional
    public void deleteUserAndData(Long userId) {
        // 1. 删除用户创建的群聊及其成员、消息、邀请
        List<GroupChat> ownedGroups = groupChatRepository.findByOwnerId(userId);
        for (GroupChat g : ownedGroups) {
            groupMessageRepository.deleteAllByGroupId(g.getId());
            groupMemberRepository.deleteAllByGroupId(g.getId());
            groupInvitationRepository.deleteAllByGroupId(g.getId());
            groupChatRepository.delete(g);
        }
        // 2. 删除用户在其他群中的成员记录
        groupMemberRepository.deleteAllByUserId(userId);
        // 3. 删除用户发送的群消息
        groupMessageRepository.deleteAllBySenderId(userId);
        // 4. 删除群聊邀请（发送的和收到的）
        groupInvitationRepository.deleteAllByUserId(userId);
        // 5. 删除私聊消息
        privateMessageRepository.deleteAllByUserId(userId);
        // 6. 删除好友关系（双向）
        friendRepository.deleteAllByUserId(userId);
        // 7. 删除好友分组
        friendGroupRepository.deleteAllByUserId(userId);
        // 8. 删除好友请求
        friendRequestRepository.deleteAllByUserId(userId);
        // 9. 删除用户
        userRepository.deleteById(userId);
    }
}
