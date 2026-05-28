package com.ncu.pp.repository;

import com.ncu.pp.entity.GroupInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, Long> {
    List<GroupInvitation> findByToUserIdAndStatus(Long toUserId, Integer status);
    List<GroupInvitation> findByToUserIdAndStatusAndType(Long toUserId, Integer status, Integer type);
    boolean existsByGroupIdAndToUserIdAndStatus(Long groupId, Long toUserId, Integer status);
    boolean existsByGroupIdAndFromUserIdAndStatus(Long groupId, Long fromUserId, Integer status);

    @Modifying @Transactional
    @Query("DELETE FROM GroupInvitation gi WHERE gi.fromUserId = ?1 OR gi.toUserId = ?1")
    void deleteAllByUserId(Long userId);

    @Modifying @Transactional
    @Query("DELETE FROM GroupInvitation gi WHERE gi.groupId = ?1")
    void deleteAllByGroupId(Long groupId);
}
