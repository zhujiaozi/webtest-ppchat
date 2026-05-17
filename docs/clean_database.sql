-- PP Chat 数据库清理脚本
-- 用途：清空所有业务数据，保留表结构
-- 执行方式：在 MySQL 客户端中执行此脚本

USE gove_sqlpub;

-- 禁用外键检查
SET FOREIGN_KEY_CHECKS = 0;

-- 清空消息表
TRUNCATE TABLE pp_private_message;
TRUNCATE TABLE pp_group_message;

-- 清空群聊相关表
TRUNCATE TABLE group_member;
TRUNCATE TABLE group_chat;

-- 清空好友相关表
TRUNCATE TABLE friend_request;
TRUNCATE TABLE friend;
TRUNCATE TABLE friend_group;

-- 清空用户表（可选，如果想保留测试账号则注释掉）
-- TRUNCATE TABLE pp_user;

-- 启用外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 验证清理结果
SELECT 'pp_private_message' AS table_name, COUNT(*) AS count FROM pp_private_message
UNION ALL
SELECT 'pp_group_message', COUNT(*) FROM pp_group_message
UNION ALL
SELECT 'group_member', COUNT(*) FROM group_member
UNION ALL
SELECT 'group_chat', COUNT(*) FROM group_chat
UNION ALL
SELECT 'friend_request', COUNT(*) FROM friend_request
UNION ALL
SELECT 'friend', COUNT(*) FROM friend
UNION ALL
SELECT 'friend_group', COUNT(*) FROM friend_group;
