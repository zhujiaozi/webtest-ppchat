package com.ncu.pp.repository;

import com.ncu.pp.entity.PrivateMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface PrivateMessageRepository extends JpaRepository<PrivateMessage, Long> {

    @Query("SELECT m FROM PrivateMessage m WHERE " +
           "(m.senderId = ?1 AND m.receiverId = ?2) OR " +
           "(m.senderId = ?2 AND m.receiverId = ?1) " +
           "ORDER BY m.createdAt ASC")
    List<PrivateMessage> findConversation(Long userId1, Long userId2);

    @Query("SELECT m FROM PrivateMessage m WHERE " +
           "((m.senderId = ?1 AND m.receiverId = ?2) OR " +
           "(m.senderId = ?2 AND m.receiverId = ?1)) " +
           "AND m.content LIKE CONCAT('%', ?3, '%') ORDER BY m.createdAt ASC")
    List<PrivateMessage> searchInConversation(Long userId1, Long userId2, String keyword);

    long countByReceiverIdAndSenderIdAndStatus(Long receiverId, Long senderId, Integer status);

    @Query("SELECT m.senderId, COUNT(m) FROM PrivateMessage m WHERE m.receiverId = :receiverId AND m.status = 0 GROUP BY m.senderId")
    List<Object[]> countUnreadGroupedBySender(@Param("receiverId") Long receiverId);

    @Modifying
    @Transactional
    @Query("UPDATE PrivateMessage m SET m.status = 2 WHERE m.senderId = ?1 AND m.receiverId = ?2 AND m.status < 2")
    void markAsRead(Long senderId, Long receiverId);

    @Modifying @Transactional
    @Query("DELETE FROM PrivateMessage m WHERE m.senderId = ?1 OR m.receiverId = ?1")
    void deleteAllByUserId(Long userId);
}
