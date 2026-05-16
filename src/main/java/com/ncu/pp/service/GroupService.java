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

    public GroupService(GroupChatRepository groupChatRepository,
                        GroupMemberRepository groupMemberRepository,
                        GroupMessageRepository groupMessageRepository) {
        this.groupChatRepository = groupChatRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupMessageRepository = groupMessageRepository;
    }

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
        groupMemberRepository.findByGroupId(groupId).forEach(m ->
            groupMemberRepository.deleteByGroupIdAndUserId(groupId, m.getUserId()));
        groupChatRepository.deleteById(groupId);
    }

    public List<GroupChat> getUserGroups(Long userId) {
        return groupMemberRepository.findByUserId(userId).stream()
                .map(m -> groupChatRepository.findById(m.getGroupId()).orElse(null))
                .filter(g -> g != null).toList();
    }

    public GroupChat getGroup(Long groupId) { return groupChatRepository.findById(groupId).orElse(null); }
    public List<GroupMember> getMembers(Long groupId) { return groupMemberRepository.findByGroupId(groupId); }
    public boolean isMember(Long groupId, Long userId) { return groupMemberRepository.existsByGroupIdAndUserId(groupId, userId); }

    public void updateNotice(Long groupId, String notice) {
        GroupChat group = groupChatRepository.findById(groupId).orElseThrow();
        group.setNotice(notice);
        groupChatRepository.save(group);
    }

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
}
