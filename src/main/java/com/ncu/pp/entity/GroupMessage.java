package com.ncu.pp.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "pp_group_message")
public class GroupMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long groupId;

    @Column(nullable = false)
    private Long senderId;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "INT DEFAULT 0")
    private Integer msgType = 0;

    /**
     * 语音消息时存储音频文件 URL（如 /uploads/audio/xxx.webm），不再写入 Base64。
     * 数据库列保留 LONGTEXT 以兼容历史 Base64 数据，避免 ddl-auto 尝试缩列导致截断。
     */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String audioData;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
