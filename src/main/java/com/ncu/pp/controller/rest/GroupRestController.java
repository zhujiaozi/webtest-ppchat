package com.ncu.pp.controller.rest;

import com.ncu.pp.entity.*;
import com.ncu.pp.service.GroupService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/groups")
public class GroupRestController {

    private final GroupService groupService;

    public GroupRestController(GroupService groupService) {
        this.groupService = groupService;
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

    /** 获取群详情 */
    @GetMapping("/{id}")
    public Map<String, Object> getGroupDetail(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        Map<String, Object> result = new HashMap<>();
        result.put("group", groupService.getGroup(id));
        result.put("members", groupService.getMembers(id));
        result.put("isOwner", groupService.getGroup(id) != null &&
                groupService.getGroup(id).getOwnerId().equals(user.getId()));
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

    /** 获取群消息 */
    @GetMapping("/{id}/messages")
    public List<GroupMessage> getMessages(@PathVariable Long id) {
        return groupService.getGroupMessages(id);
    }

    /** 搜索群消息 */
    @GetMapping("/{id}/messages/search")
    public List<GroupMessage> search(@PathVariable Long id, @RequestParam String keyword) {
        return groupService.searchGroupMessages(id, keyword);
    }
}
