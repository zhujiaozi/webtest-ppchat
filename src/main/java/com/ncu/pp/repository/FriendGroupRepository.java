package com.ncu.pp.repository;

import com.ncu.pp.entity.FriendGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FriendGroupRepository extends JpaRepository<FriendGroup, Long> {
    List<FriendGroup> findByUserIdOrderBySortOrder(Long userId);
}
