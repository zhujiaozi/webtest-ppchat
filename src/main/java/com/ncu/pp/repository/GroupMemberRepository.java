package com.ncu.pp.repository;

import com.ncu.pp.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    List<GroupMember> findByGroupId(Long groupId);
    List<GroupMember> findByUserId(Long userId);
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
    boolean existsByGroupIdAndUserId(Long groupId, Long userId);
    void deleteByGroupIdAndUserId(Long groupId, Long userId);

    @Modifying @Transactional
    @Query("DELETE FROM GroupMember gm WHERE gm.userId = ?1")
    void deleteAllByUserId(Long userId);

    @Modifying @Transactional
    @Query("DELETE FROM GroupMember gm WHERE gm.groupId = ?1")
    void deleteAllByGroupId(Long groupId);
}
