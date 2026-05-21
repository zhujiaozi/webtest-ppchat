package com.ncu.pp.service;

import com.ncu.pp.entity.GroupChat;
import com.ncu.pp.entity.GroupMember;
import com.ncu.pp.entity.GroupMessage;
import com.ncu.pp.repository.GroupChatRepository;
import com.ncu.pp.repository.GroupMemberRepository;
import com.ncu.pp.repository.GroupMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock
    private GroupChatRepository groupChatRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @Mock
    private GroupMessageRepository groupMessageRepository;

    @InjectMocks
    private GroupService groupService;

    private GroupChat testGroup;
    private GroupMember testMember;
    private GroupMessage testMessage;

    @BeforeEach
    void setUp() {
        testGroup = new GroupChat();
        testGroup.setId(1L);
        testGroup.setName("Test Group");
        testGroup.setOwnerId(1L);
        testGroup.setNotice("Welcome!");

        testMember = new GroupMember();
        testMember.setId(1L);
        testMember.setGroupId(1L);
        testMember.setUserId(2L);
        testMember.setRole(0);

        testMessage = new GroupMessage();
        testMessage.setId(1L);
        testMessage.setGroupId(1L);
        testMessage.setSenderId(2L);
        testMessage.setContent("Hello everyone!");
        testMessage.setMsgType(0);
    }

    @Test
    void createGroup_CreatesGroupAndAddsMembers() {
        // Arrange
        when(groupChatRepository.save(any(GroupChat.class))).thenAnswer(invocation -> {
            GroupChat g = invocation.getArgument(0);
            g.setId(1L);
            return g;
        });
        when(groupMemberRepository.existsByGroupIdAndUserId(anyLong(), anyLong())).thenReturn(false);
        when(groupMemberRepository.save(any(GroupMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        GroupChat result = groupService.createGroup("New Group", 1L, Arrays.asList(2L, 3L));

        // Assert
        assertNotNull(result);
        assertEquals("New Group", result.getName());
        assertEquals(1L, result.getOwnerId());
        verify(groupChatRepository).save(any(GroupChat.class));
        verify(groupMemberRepository, times(3)).save(any(GroupMember.class));
    }

    @Test
    void addMember_AddsNewMember() {
        // Arrange
        when(groupMemberRepository.existsByGroupIdAndUserId(1L, 2L)).thenReturn(false);
        when(groupMemberRepository.save(any(GroupMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        groupService.addMember(1L, 2L, 0);

        // Assert
        verify(groupMemberRepository).existsByGroupIdAndUserId(1L, 2L);
        verify(groupMemberRepository).save(any(GroupMember.class));
    }

    @Test
    void addMember_AlreadyExists() {
        // Arrange
        when(groupMemberRepository.existsByGroupIdAndUserId(1L, 2L)).thenReturn(true);

        // Act
        groupService.addMember(1L, 2L, 0);

        // Assert
        verify(groupMemberRepository, never()).save(any(GroupMember.class));
    }

    @Test
    void removeMember_RemovesMember() {
        // Act
        groupService.removeMember(1L, 2L);

        // Assert
        verify(groupMemberRepository).deleteByGroupIdAndUserId(1L, 2L);
    }

    @Test
    void leaveGroup_RemovesMember() {
        // Act
        groupService.leaveGroup(1L, 2L);

        // Assert
        verify(groupMemberRepository).deleteByGroupIdAndUserId(1L, 2L);
    }

    @Test
    void dissolveGroup_DeletesGroupAndMembers() {
        // Arrange
        when(groupChatRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(groupMemberRepository.findByGroupId(1L)).thenReturn(Arrays.asList(testMember));

        // Act
        groupService.dissolveGroup(1L, 1L);

        // Assert
        verify(groupMemberRepository).findByGroupId(1L);
        verify(groupMemberRepository).deleteByGroupIdAndUserId(1L, 2L);
        verify(groupChatRepository).deleteById(1L);
    }

    @Test
    void dissolveGroup_NotOwner_ThrowsException() {
        // Arrange
        when(groupChatRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act & Assert
        assertThrows(RuntimeException.class, () -> groupService.dissolveGroup(1L, 2L));
        verify(groupChatRepository, never()).deleteById(anyLong());
    }

    @Test
    void getUserGroups_ReturnsUserGroups() {
        // Arrange
        List<GroupMember> members = Arrays.asList(testMember);
        when(groupMemberRepository.findByUserId(2L)).thenReturn(members);
        when(groupChatRepository.findAllById(any())).thenReturn(Arrays.asList(testGroup));

        // Act
        List<GroupChat> result = groupService.getUserGroups(2L);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Test Group", result.get(0).getName());
    }

    @Test
    void getGroup_ReturnsGroup() {
        // Arrange
        when(groupChatRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        GroupChat result = groupService.getGroup(1L);

        // Assert
        assertNotNull(result);
        assertEquals("Test Group", result.getName());
    }

    @Test
    void getMembers_ReturnsMembers() {
        // Arrange
        List<GroupMember> members = Arrays.asList(testMember);
        when(groupMemberRepository.findByGroupId(1L)).thenReturn(members);

        // Act
        List<GroupMember> result = groupService.getMembers(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getUserId());
    }

    @Test
    void isMember_ReturnsTrue() {
        // Arrange
        when(groupMemberRepository.existsByGroupIdAndUserId(1L, 2L)).thenReturn(true);

        // Act
        boolean result = groupService.isMember(1L, 2L);

        // Assert
        assertTrue(result);
    }

    @Test
    void updateNotice_UpdatesGroupNotice() {
        // Arrange
        when(groupChatRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(groupChatRepository.save(any(GroupChat.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        groupService.updateNotice(1L, "New Notice");

        // Assert
        assertEquals("New Notice", testGroup.getNotice());
        verify(groupChatRepository).save(testGroup);
    }

    @Test
    void saveGroupMessage_SavesMessage() {
        // Arrange
        when(groupMessageRepository.save(any(GroupMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        GroupMessage result = groupService.saveGroupMessage(1L, 2L, "Hello", 0, null);

        // Assert
        assertNotNull(result);
        assertEquals("Hello", result.getContent());
        verify(groupMessageRepository).save(any(GroupMessage.class));
    }

    @Test
    void getGroupMessages_ReturnsMessages() {
        // Arrange
        List<GroupMessage> messages = Arrays.asList(testMessage);
        when(groupMessageRepository.findByGroupIdOrderByCreatedAtAsc(1L)).thenReturn(messages);

        // Act
        List<GroupMessage> result = groupService.getGroupMessages(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Hello everyone!", result.get(0).getContent());
    }
}
