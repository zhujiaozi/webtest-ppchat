package com.ncu.pp.repository;

import com.ncu.pp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    User findByUsername(String username);

    boolean existsByUsername(String username);

    /**
     * 按关键词搜索用户名或昵称，排除指定用户，由数据库完成过滤避免全表扫描
     */
    @Query("SELECT u FROM User u WHERE u.id <> :excludeId AND " +
           "(u.username LIKE %:keyword% OR u.nickname LIKE %:keyword%)")
    List<User> searchByKeyword(@Param("keyword") String keyword, @Param("excludeId") Long excludeId);

    @Query("SELECT u FROM User u WHERE u.id <> :excludeId AND " +
           "(u.username LIKE %:keyword% OR u.nickname LIKE %:keyword%) AND " +
           "u.id IN (SELECT f.friendId FROM Friend f WHERE f.userId = :excludeId)")
    List<User> searchFriendsByKeyword(@Param("keyword") String keyword, @Param("excludeId") Long excludeId);
}
