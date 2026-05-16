package com.ncu.pp.controller.rest;

import com.ncu.pp.entity.*;
import com.ncu.pp.service.GroupService;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/groups")
public class GroupRestController {

    private final GroupService groupService;
    private final UserService userService;

    public GroupRestController(GroupService groupService, UserService userService) {
        this.groupService = groupService;
        this.userService = userService;
    }

    /** 获取我的群列表 */
    @GetMapping
    public List<GroupChat> getUserGroups(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return groupService.getUserGroups(user.getId());
    }

    /** 创建群 */
    @PostMapping
    public GroupChat createGroup(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        String name = (String) body.get("name");
        @SuppressWarnings("unchecked")
        List<Long> memberIds = ((List<Number>) body.getOrDefault("memberIds", List.of()))
                .stream().map(Number::longValue).toList();
        return groupService.createGroup(name, user.getId(), memberIds);
    }

    /** 获取群详情（含成员昵称） */
    @GetMapping("/{id}")
    public Map<String, Object> getGroupDetail(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        GroupChat group = groupService.getGroup(id);
        Map<String, Object> result = new HashMap<>();
        result.put("group", group);
        // 返回带昵称的成员列表
        List<Map<String, Object>> members = new ArrayList<>();
        for (GroupMember m : groupService.getMembers(id)) {
            Map<String, Object> item = new HashMap<>();
            item.put("userId", m.getUserId());
            item.put("role", m.getRole());
            item.put("joinedAt", m.getJoinedAt());
            User u = userService.getById(m.getUserId());
            item.put("nickname", u != null ? (u.getNickname() != null ? u.getNickname() : u.getUsername()) : "用户" + m.getUserId());
            members.add(item);
        }
        result.put("members", members);
        result.put("isOwner", group != null && group.getOwnerId().equals(user.getId()));
        return result;
    }

    /** 更新群公告 */
    @PutMapping("/{id}/notice")
    public Map<String, Boolean> updateNotice(@PathVariable Long id, @RequestBody Map<String, String> body) {
        groupService.updateNotice(id, body.get("notice"));
        return Collections.singletonMap("success", true);
    }

    /** 踢出成员 */
    @DeleteMapping("/{id}/members/{userId}")
    public Map<String, Boolean> kickMember(@PathVariable Long id, @PathVariable Long userId) {
        groupService.removeMember(id, userId);
        return Collections.singletonMap("success", true);
    }

    /** 退出群 */
    @PostMapping("/{id}/leave")
    public Map<String, Boolean> leaveGroup(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.leaveGroup(id, user.getId());
        return Collections.singletonMap("success", true);
    }

    /** 解散群 */
    @DeleteMapping("/{id}")
    public Map<String, Boolean> dissolveGroup(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.dissolveGroup(id, user.getId());
        return Collections.singletonMap("success", true);
    }

    /** 获取群消息（含发送者昵称） */
    @GetMapping("/{id}/messages")
    public List<Map<String, Object>> getMessages(@PathVariable Long id) {
        return enrichMessages(groupService.getGroupMessages(id));
    }

    /** 搜索群消息（含发送者昵称） */
    @GetMapping("/{id}/messages/search")
    public List<Map<String, Object>> search(@PathVariable Long id, @RequestParam String keyword) {
        return enrichMessages(groupService.searchGroupMessages(id, keyword));
    }

    private List<Map<String, Object>> enrichMessages(List<GroupMessage> messages) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (GroupMessage m : messages) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", m.getId());
            item.put("senderId", m.getSenderId());
            item.put("content", m.getContent());
            item.put("msgType", m.getMsgType());
            item.put("audioData", m.getAudioData());
            item.put("createdAt", m.getCreatedAt());
            User u = userService.getById(m.getSenderId());
            item.put("sender", u != null ? (u.getNickname() != null ? u.getNickname() : u.getUsername()) : "用户");
            result.add(item);
        }
        return result;
    }
}
