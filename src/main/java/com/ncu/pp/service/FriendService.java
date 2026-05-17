package com.ncu.pp.service;

import com.ncu.pp.entity.*;
import com.ncu.pp.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FriendService {

    private final FriendRepository friendRepository;
    private final FriendGroupRepository friendGroupRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;

    public FriendService(FriendRepository friendRepository,
                         FriendGroupRepository friendGroupRepository,
                         FriendRequestRepository friendRequestRepository,
                         UserRepository userRepository) {
        this.friendRepository = friendRepository;
        this.friendGroupRepository = friendGroupRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.userRepository = userRepository;
    }

    public List<FriendGroup> getGroups(Long userId) {
        return friendGroupRepository.findByUserIdOrderBySortOrder(userId);
    }

    public FriendGroup createGroup(Long userId, String name) {
        FriendGroup group = new FriendGroup();
        group.setUserId(userId);
        group.setName(name);
        return friendGroupRepository.save(group);
    }

    public void renameGroup(Long groupId, String newName) {
        FriendGroup group = friendGroupRepository.findById(groupId).orElseThrow();
        group.setName(newName);
        friendGroupRepository.save(group);
    }

    public void deleteGroup(Long groupId) {
        friendGroupRepository.deleteById(groupId);
    }

    public String sendRequest(Long fromUserId, Long toUserId, String message) {
        if (fromUserId.equals(toUserId)) return "不能添加自己为好友";
        if (friendRepository.findByUserIdAndFriendId(fromUserId, toUserId).isPresent())
            return "已经是好友了";
        if (friendRequestRepository.existsByFromUserIdAndToUserIdAndStatus(fromUserId, toUserId, 0))
            return "已发送过申请";
        FriendRequest request = new FriendRequest();
        request.setFromUserId(fromUserId);
        request.setToUserId(toUserId);
        request.setMessage(message);
        friendRequestRepository.save(request);
        return null;
    }

    public List<FriendRequest> getPendingRequests(Long userId) {
        return friendRequestRepository.findByToUserIdAndStatus(userId, 0);
    }

    @Transactional
    public void acceptRequest(Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId).orElseThrow();
        request.setStatus(1);
        friendRequestRepository.save(request);
        Long fromId = request.getFromUserId();
        Long toId = request.getToUserId();
        FriendGroup fromGroup = getDefaultGroup(fromId);
        FriendGroup toGroup = getDefaultGroup(toId);
        addFriend(fromId, toId, fromGroup.getId());
        addFriend(toId, fromId, toGroup.getId());
    }

    public void rejectRequest(Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId).orElseThrow();
        request.setStatus(2);
        friendRequestRepository.save(request);
    }

    public List<Friend> getFriends(Long userId) {
        List<Friend> friends = friendRepository.findByUserId(userId);
        if (!friends.isEmpty()) {
            List<Long> friendIds = friends.stream().map(Friend::getFriendId).toList();
            Map<Long, String> nameMap = userRepository.findAllById(friendIds).stream()
                    .collect(Collectors.toMap(
                            User::getId,
                            u -> u.getNickname() != null ? u.getNickname() : u.getUsername()));
            friends.forEach(f -> f.setFriendName(nameMap.get(f.getFriendId())));
        }
        return friends;
    }

    public List<Friend> getFriendsByGroup(Long userId, Long groupId) {
        return friendRepository.findByUserIdAndGroupId(userId, groupId);
    }

    public void addFriend(Long userId, Long friendId, Long groupId) {
        Friend friend = new Friend();
        friend.setUserId(userId);
        friend.setFriendId(friendId);
        friend.setGroupId(groupId);
        friendRepository.save(friend);
    }

    @Transactional
    public void deleteFriend(Long userId, Long friendId) {
        friendRepository.deleteByUserIdAndFriendId(userId, friendId);
        friendRepository.deleteByUserIdAndFriendId(friendId, userId);
    }

    public void moveFriend(Long userId, Long friendId, Long newGroupId) {
        Friend friend = friendRepository.findByUserIdAndFriendId(userId, friendId).orElseThrow();
        friend.setGroupId(newGroupId);
        friendRepository.save(friend);
    }

    public void setRemark(Long userId, Long friendId, String remark) {
        Friend friend = friendRepository.findByUserIdAndFriendId(userId, friendId).orElseThrow();
        friend.setRemark(remark);
        friendRepository.save(friend);
    }

    /**
     * 使用数据库查询替代全表扫描，避免内存过滤
     */
    public List<User> searchUsers(String keyword, Long excludeUserId) {
        return userRepository.searchByKeyword(keyword, excludeUserId);
    }

    private FriendGroup getDefaultGroup(Long userId) {
        List<FriendGroup> groups = friendGroupRepository.findByUserIdOrderBySortOrder(userId);
        if (groups.isEmpty()) {
            return createGroup(userId, "我的好友");
        }
        return groups.get(0);
    }
}
