package com.ncu.pp.repository;

import com.ncu.pp.entity.Friend;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface FriendRepository extends JpaRepository<Friend, Long> {
    List<Friend> findByUserId(Long userId);
    List<Friend> findByUserIdAndGroupId(Long userId, Long groupId);
    List<Friend> findByGroupId(Long groupId);
    Optional<Friend> findByUserIdAndFriendId(Long userId, Long friendId);
    void deleteByUserIdAndFriendId(Long userId, Long friendId);

    @Modifying @Transactional
    @Query("DELETE FROM Friend f WHERE f.userId = ?1 OR f.friendId = ?1")
    void deleteAllByUserId(Long userId);

    @Modifying @Transactional
    @Query("UPDATE Friend f SET f.groupId = NULL WHERE f.groupId = ?1")
    void clearGroupId(Long groupId);
}
