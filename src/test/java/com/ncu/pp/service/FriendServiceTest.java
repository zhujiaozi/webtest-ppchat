package com.ncu.pp.service;

import com.ncu.pp.entity.Friend;
import com.ncu.pp.entity.FriendGroup;
import com.ncu.pp.entity.FriendRequest;
import com.ncu.pp.entity.User;
import com.ncu.pp.repository.FriendGroupRepository;
import com.ncu.pp.repository.FriendRepository;
import com.ncu.pp.repository.FriendRequestRepository;
import com.ncu.pp.repository.UserRepository;
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
class FriendServiceTest {

    @Mock
    private FriendRepository friendRepository;

    @Mock
    private FriendGroupRepository friendGroupRepository;

    @Mock
    private FriendRequestRepository friendRequestRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FriendService friendService;

    private Friend testFriend;
    private FriendGroup testGroup;
    private FriendRequest testRequest;

    @BeforeEach
    void setUp() {
        testFriend = new Friend();
        testFriend.setId(1L);
        testFriend.setUserId(1L);
        testFriend.setFriendId(2L);
        testFriend.setGroupId(1L);
        testFriend.setRemark("Test Friend");

        testGroup = new FriendGroup();
        testGroup.setId(1L);
        testGroup.setUserId(1L);
        testGroup.setName("Default Group");

        testRequest = new FriendRequest();
        testRequest.setId(1L);
        testRequest.setFromUserId(2L);
        testRequest.setToUserId(1L);
        testRequest.setStatus(0);
        testRequest.setMessage("Hello");
    }

    @Test
    void getFriends_ReturnsFriendList() {
        List<Friend> friends = Arrays.asList(testFriend);
        when(friendRepository.findByUserId(1L)).thenReturn(friends);

        User friendUser = new User();
        friendUser.setId(2L);
        friendUser.setUsername("friend1");
        friendUser.setNickname("Friend One");
        when(userRepository.findAllById(List.of(2L))).thenReturn(Arrays.asList(friendUser));

        List<Friend> result = friendService.getFriends(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getFriendId());
        assertEquals("Friend One", result.get(0).getFriendName());
        verify(friendRepository).findByUserId(1L);
    }

    @Test
    void getGroups_ReturnsGroupList() {
        List<FriendGroup> groups = Arrays.asList(testGroup);
        when(friendGroupRepository.findByUserIdOrderBySortOrder(1L)).thenReturn(groups);

        List<FriendGroup> result = friendService.getGroups(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Default Group", result.get(0).getName());
        verify(friendGroupRepository).findByUserIdOrderBySortOrder(1L);
    }

    @Test
    void addFriend_CreatesFriendship() {
        when(friendRepository.save(any(Friend.class))).thenAnswer(invocation -> invocation.getArgument(0));

        friendService.addFriend(1L, 2L, 1L);

        verify(friendRepository).save(any(Friend.class));
    }

    @Test
    void deleteFriend_RemovesBidirectionalFriendship() {
        friendService.deleteFriend(1L, 2L);

        verify(friendRepository).deleteByUserIdAndFriendId(1L, 2L);
        verify(friendRepository).deleteByUserIdAndFriendId(2L, 1L);
    }

    @Test
    void setRemark_UpdatesFriendRemark() {
        when(friendRepository.findByUserIdAndFriendId(1L, 2L)).thenReturn(Optional.of(testFriend));
        when(friendRepository.save(any(Friend.class))).thenAnswer(invocation -> invocation.getArgument(0));

        friendService.setRemark(1L, 2L, "New Remark");

        assertEquals("New Remark", testFriend.getRemark());
        verify(friendRepository).save(testFriend);
    }

    @Test
    void moveFriend_MovesToNewGroup() {
        FriendGroup targetGroup = new FriendGroup();
        targetGroup.setId(3L);
        targetGroup.setUserId(1L);
        targetGroup.setName("Target Group");
        when(friendRepository.findByUserIdAndFriendId(1L, 2L)).thenReturn(Optional.of(testFriend));
        when(friendGroupRepository.findById(3L)).thenReturn(Optional.of(targetGroup));
        when(friendRepository.save(any(Friend.class))).thenAnswer(invocation -> invocation.getArgument(0));

        friendService.moveFriend(1L, 2L, 3L);

        assertEquals(3L, testFriend.getGroupId());
        verify(friendRepository).save(testFriend);
    }

    @Test
    void sendRequest_CreatesFriendRequest() {
        when(friendRepository.findByUserIdAndFriendId(1L, 2L)).thenReturn(Optional.empty());
        when(friendRequestRepository.existsByFromUserIdAndToUserIdAndStatus(1L, 2L, 0)).thenReturn(false);
        when(friendRequestRepository.save(any(FriendRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String result = friendService.sendRequest(1L, 2L, "Hello");

        assertNull(result);
        verify(friendRequestRepository).save(any(FriendRequest.class));
    }

    @Test
    void sendRequest_AlreadyFriend() {
        when(friendRepository.findByUserIdAndFriendId(1L, 2L)).thenReturn(Optional.of(testFriend));

        String result = friendService.sendRequest(1L, 2L, "Hello");

        assertEquals("已经是好友了", result);
        verify(friendRequestRepository, never()).save(any(FriendRequest.class));
    }

    @Test
    void getPendingRequests_ReturnsPendingRequests() {
        List<FriendRequest> requests = Arrays.asList(testRequest);
        when(friendRequestRepository.findByToUserIdAndStatus(1L, 0)).thenReturn(requests);

        List<FriendRequest> result = friendService.getPendingRequests(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(friendRequestRepository).findByToUserIdAndStatus(1L, 0);
    }

    @Test
    void acceptRequest_AcceptsAndCreatesFriendship() {
        when(friendRequestRepository.findById(1L)).thenReturn(Optional.of(testRequest));
        when(friendGroupRepository.findByUserIdOrderBySortOrder(anyLong())).thenReturn(Arrays.asList(testGroup));
        when(friendRepository.save(any(Friend.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(friendRequestRepository.save(any(FriendRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        friendService.acceptRequest(1L);

        assertEquals(1, testRequest.getStatus());
        verify(friendRequestRepository).save(testRequest);
        verify(friendRepository, times(2)).save(any(Friend.class));
    }

    @Test
    void rejectRequest_RejectsRequest() {
        when(friendRequestRepository.findById(1L)).thenReturn(Optional.of(testRequest));
        when(friendRequestRepository.save(any(FriendRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        friendService.rejectRequest(1L);

        assertEquals(2, testRequest.getStatus());
        verify(friendRequestRepository).save(testRequest);
        verify(friendRepository, never()).save(any(Friend.class));
    }

    @Test
    void createGroup_CreatesNewGroup() {
        when(friendGroupRepository.save(any(FriendGroup.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FriendGroup result = friendService.createGroup(1L, "New Group");

        assertNotNull(result);
        assertEquals("New Group", result.getName());
        assertEquals(1L, result.getUserId());
        verify(friendGroupRepository).save(any(FriendGroup.class));
    }

    @Test
    void deleteGroup_DeletesGroup() {
        friendService.deleteGroup(1L);

        verify(friendGroupRepository).deleteById(1L);
    }
}
