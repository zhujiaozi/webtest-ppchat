package com.ncu.pp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "pp_group_invitation", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"groupId", "toUserId", "status"})
})
public class GroupInvitation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long groupId;

    @Column(nullable = false)
    private Long fromUserId;

    @Column(nullable = false)
    private Long toUserId;

    @Column(columnDefinition = "INT DEFAULT 0")
    private Integer status = 0; // 0=pending, 1=accepted, 2=rejected

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
