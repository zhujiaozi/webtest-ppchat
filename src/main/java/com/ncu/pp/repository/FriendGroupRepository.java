package com.ncu.pp.repository;

import com.ncu.pp.entity.FriendGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface FriendGroupRepository extends JpaRepository<FriendGroup, Long> {
    List<FriendGroup> findByUserIdOrderBySortOrder(Long userId);

    @Modifying @Transactional
    @Query("DELETE FROM FriendGroup fg WHERE fg.userId = ?1")
    void deleteAllByUserId(Long userId);
}
