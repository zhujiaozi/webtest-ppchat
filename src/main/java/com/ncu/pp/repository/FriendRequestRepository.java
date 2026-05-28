package com.ncu.pp.repository;

import com.ncu.pp.entity.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findByToUserIdAndStatus(Long toUserId, Integer status);
    boolean existsByFromUserIdAndToUserIdAndStatus(Long fromUserId, Long toUserId, Integer status);

    @Modifying @Transactional
    @Query("DELETE FROM FriendRequest fr WHERE fr.fromUserId = ?1 OR fr.toUserId = ?1")
    void deleteAllByUserId(Long userId);
}
