package com.ncu.pp.repository;

import com.ncu.pp.entity.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {
    List<GroupMessage> findByGroupIdOrderByCreatedAtAsc(Long groupId);
    List<GroupMessage> findByGroupIdAndContentContainingOrderByCreatedAtAsc(Long groupId, String keyword);

    @Modifying @Transactional
    @Query("DELETE FROM GroupMessage gm WHERE gm.groupId = ?1")
    void deleteAllByGroupId(Long groupId);

    @Modifying @Transactional
    @Query("DELETE FROM GroupMessage gm WHERE gm.senderId = ?1")
    void deleteAllBySenderId(Long senderId);
}
