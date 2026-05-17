-- 修复 Bug#1 造成的旧数据：好友 group_id 指向了对方的分组
-- 执行前建议先备份 pp_friend 表
--
-- 逻辑：把每个好友记录的 group_id 改为该用户自己的默认分组（sort_order 最小的分组）
-- 仅修复 group_id 不属于该用户的分组（即错误数据），已手动纠正的记录不受影响

UPDATE pp_friend f
SET f.group_id = (
    SELECT g.id
    FROM pp_friend_group g
    WHERE g.user_id = f.user_id
    ORDER BY g.sort_order
    LIMIT 1
)
WHERE f.group_id NOT IN (
    SELECT g2.id
    FROM pp_friend_group g2
    WHERE g2.user_id = f.user_id
);
