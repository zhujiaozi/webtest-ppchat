package com.ncu.pp.repository;

import com.ncu.pp.entity.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findByToUserIdAndStatus(Long toUserId, Integer status);
    boolean existsByFromUserIdAndToUserIdAndStatus(Long fromUserId, Long toUserId, Integer status);
}
