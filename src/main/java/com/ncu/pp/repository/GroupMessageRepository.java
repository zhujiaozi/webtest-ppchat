package com.ncu.pp.repository;

import com.ncu.pp.entity.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {
    List<GroupMessage> findByGroupIdOrderByCreatedAtAsc(Long groupId);
    List<GroupMessage> findByGroupIdAndContentContainingOrderByCreatedAtAsc(Long groupId, String keyword);
}
