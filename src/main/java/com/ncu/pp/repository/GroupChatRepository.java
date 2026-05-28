package com.ncu.pp.repository;

import com.ncu.pp.entity.GroupChat;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroupChatRepository extends JpaRepository<GroupChat, Long> {
    List<GroupChat> findByOwnerId(Long ownerId);
}
