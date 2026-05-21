package com.ncu.pp.repository;

import com.ncu.pp.entity.GroupInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, Long> {
    List<GroupInvitation> findByToUserIdAndStatus(Long toUserId, Integer status);
    boolean existsByGroupIdAndToUserIdAndStatus(Long groupId, Long toUserId, Integer status);
}
