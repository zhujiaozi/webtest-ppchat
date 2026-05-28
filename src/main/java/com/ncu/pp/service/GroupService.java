package com.ncu.pp.service;

import com.ncu.pp.entity.*;
import com.ncu.pp.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class GroupService {

    private final GroupChatRepository groupChatRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final GroupInvitationRepository groupInvitationRepository;

    public GroupService(GroupChatRepository groupChatRepository,
                        GroupMemberRepository groupMemberRepository,
                        GroupMessageRepository groupMessageRepository,
                        GroupInvitationRepository groupInvitationRepository) {
        this.groupChatRepository = groupChatRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupMessageRepository = groupMessageRepository;
        this.groupInvitationRepository = groupInvitationRepository;
    }

    @Transactional
    public GroupChat createGroup(String name, Long ownerId, List<Long> memberIds) {
        GroupChat group = new GroupChat();
        group.setName(name);
        group.setOwnerId(ownerId);
        group = groupChatRepository.save(group);
        addMember(group.getId(), ownerId, 2);
        for (Long memberId : memberIds) {
            if (!memberId.equals(ownerId)) addMember(group.getId(), memberId, 0);
        }
        return group;
    }

    @Transactional
    public void addMember(Long groupId, Long userId, Integer role) {
        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) return;
        GroupMember member = new GroupMember();
        member.setGroupId(groupId);
        member.setUserId(userId);
        member.setRole(role);
        groupMemberRepository.save(member);
    }

    public void removeMember(Long groupId, Long userId) {
        groupMemberRepository.deleteByGroupIdAndUserId(groupId, userId);
    }

    public void leaveGroup(Long groupId, Long userId) { removeMember(groupId, userId); }

    @Transactional
    public void dissolveGroup(Long groupId, Long userId) {
        GroupChat group = groupChatRepository.findById(groupId).orElseThrow();
        if (!group.getOwnerId().equals(userId)) throw new RuntimeException("只有群主可以解散群");
        groupMessageRepository.deleteAllByGroupId(groupId);
        groupMemberRepository.deleteAllByGroupId(groupId);
        groupInvitationRepository.deleteAllByGroupId(groupId);
        groupChatRepository.deleteById(groupId);
    }

    public List<GroupChat> getUserGroups(Long userId) {
        List<Long> groupIds = groupMemberRepository.findByUserId(userId).stream()
                .map(GroupMember::getGroupId).distinct().toList();
        if (groupIds.isEmpty()) return List.of();
        return groupChatRepository.findAllById(groupIds);
    }

    public GroupChat getGroup(Long groupId) { return groupChatRepository.findById(groupId).orElse(null); }
    public List<GroupMember> getMembers(Long groupId) { return groupMemberRepository.findByGroupId(groupId); }
    public boolean isMember(Long groupId, Long userId) { return groupMemberRepository.existsByGroupIdAndUserId(groupId, userId); }

    @Transactional
    public void updateNotice(Long groupId, String notice) {
        GroupChat group = groupChatRepository.findById(groupId).orElseThrow();
        group.setNotice(notice);
        groupChatRepository.save(group);
    }

    @Transactional
    public GroupMessage saveGroupMessage(Long groupId, Long senderId, String content, Integer msgType, String audioData) {
        GroupMessage msg = new GroupMessage();
        msg.setGroupId(groupId);
        msg.setSenderId(senderId);
        msg.setContent(content);
        msg.setMsgType(msgType);
        msg.setAudioData(audioData);
        return groupMessageRepository.save(msg);
    }

    public List<GroupMessage> getGroupMessages(Long groupId) { return groupMessageRepository.findByGroupIdOrderByCreatedAtAsc(groupId); }
    public List<GroupMessage> searchGroupMessages(Long groupId, String keyword) { return groupMessageRepository.findByGroupIdAndContentContainingOrderByCreatedAtAsc(groupId, keyword); }

    @Transactional
    public GroupInvitation sendInvitation(Long groupId, Long fromUserId, Long toUserId) {
        if (isMember(groupId, toUserId)) return null;
        if (groupInvitationRepository.existsByGroupIdAndToUserIdAndStatus(groupId, toUserId, 0)) return null;
        GroupInvitation inv = new GroupInvitation();
        inv.setGroupId(groupId);
        inv.setFromUserId(fromUserId);
        inv.setToUserId(toUserId);
        inv.setType(0); // 邀请
        return groupInvitationRepository.save(inv);
    }

    @Transactional
    public void acceptInvitation(Long invitationId, Long userId) {
        GroupInvitation inv = groupInvitationRepository.findById(invitationId).orElseThrow();
        if (!inv.getToUserId().equals(userId)) throw new IllegalArgumentException("无权操作");
        inv.setStatus(1);
        groupInvitationRepository.save(inv);
        addMember(inv.getGroupId(), userId, 0);
    }

    @Transactional
    public void rejectInvitation(Long invitationId, Long userId) {
        GroupInvitation inv = groupInvitationRepository.findById(invitationId).orElseThrow();
        if (!inv.getToUserId().equals(userId)) throw new IllegalArgumentException("无权操作");
        inv.setStatus(2);
        groupInvitationRepository.save(inv);
    }

    public List<GroupInvitation> getPendingInvitations(Long userId) {
        return groupInvitationRepository.findByToUserIdAndStatusAndType(userId, 0, 0);
    }

    @Transactional
    public GroupInvitation requestJoinGroup(Long groupId, Long userId) {
        if (isMember(groupId, userId)) return null;
        GroupChat group = groupChatRepository.findById(groupId).orElse(null);
        if (group == null) return null;
        if (group.getOwnerId().equals(userId)) return null;
        if (groupInvitationRepository.existsByGroupIdAndFromUserIdAndStatus(groupId, userId, 0)) return null;
        GroupInvitation inv = new GroupInvitation();
        inv.setGroupId(groupId);
        inv.setFromUserId(userId);
        inv.setToUserId(group.getOwnerId());
        inv.setType(1); // 申请
        return groupInvitationRepository.save(inv);
    }

    @Transactional
    public void acceptJoinRequest(Long invitationId, Long ownerId) {
        GroupInvitation inv = groupInvitationRepository.findById(invitationId).orElseThrow();
        if (!inv.getToUserId().equals(ownerId)) throw new IllegalArgumentException("无权操作");
        inv.setStatus(1);
        groupInvitationRepository.save(inv);
        addMember(inv.getGroupId(), inv.getFromUserId(), 0);
    }

    @Transactional
    public void rejectJoinRequest(Long invitationId, Long ownerId) {
        GroupInvitation inv = groupInvitationRepository.findById(invitationId).orElseThrow();
        if (!inv.getToUserId().equals(ownerId)) throw new IllegalArgumentException("无权操作");
        inv.setStatus(2);
        groupInvitationRepository.save(inv);
    }

    public List<GroupInvitation> getPendingJoinRequests(Long ownerId) {
        return groupInvitationRepository.findByToUserIdAndStatusAndType(ownerId, 0, 1);
    }
}
