package com.ncu.pp.controller.rest;

import com.ncu.pp.entity.*;
import com.ncu.pp.service.FriendService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/friends")
public class FriendRestController {

    private final FriendService friendService;

    public FriendRestController(FriendService friendService) {
        this.friendService = friendService;
    }

    /** 获取好友列表（按分组） */
    @GetMapping
    public Map<String, Object> getFriends(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        List<FriendGroup> groups = friendService.getGroups(user.getId());
        List<Friend> friends = friendService.getFriends(user.getId());
        Map<String, Object> result = new HashMap<>();
        result.put("groups", groups);
        result.put("friends", friends);
        return result;
    }

    /** 搜索用户 */
    @GetMapping("/search")
    public List<User> search(@RequestParam String keyword) {
        return friendService.searchUsers(keyword);
    }

    /** 发送好友申请 */
    @PostMapping("/request")
    public Map<String, Object> sendRequest(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        Long toUserId = Long.valueOf(body.get("toUserId").toString());
        String message = (String) body.getOrDefault("message", "");
        Map<String, Object> result = new HashMap<>();
        String error = friendService.sendRequest(user.getId(), toUserId, message);
        result.put("success", error == null);
        if (error != null) result.put("error", error);
        return result;
    }

    /** 获取待处理的好友申请 */
    @GetMapping("/requests")
    public List<FriendRequest> getRequests(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return friendService.getPendingRequests(user.getId());
    }

    /** 同意好友申请 */
    @PostMapping("/requests/{id}/accept")
    public Map<String, Boolean> acceptRequest(@PathVariable Long id) {
        friendService.acceptRequest(id);
        return Collections.singletonMap("success", true);
    }

    /** 拒绝好友申请 */
    @PostMapping("/requests/{id}/reject")
    public Map<String, Boolean> rejectRequest(@PathVariable Long id) {
        friendService.rejectRequest(id);
        return Collections.singletonMap("success", true);
    }

    /** 创建分组 */
    @PostMapping("/groups")
    public FriendGroup createGroup(@RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return friendService.createGroup(user.getId(), body.get("name"));
    }

    /** 重命名分组 */
    @PutMapping("/groups/{id}")
    public Map<String, Boolean> renameGroup(@PathVariable Long id, @RequestBody Map<String, String> body) {
        friendService.renameGroup(id, body.get("name"));
        return Collections.singletonMap("success", true);
    }

    /** 删除分组 */
    @DeleteMapping("/groups/{id}")
    public Map<String, Boolean> deleteGroup(@PathVariable Long id) {
        friendService.deleteGroup(id);
        return Collections.singletonMap("success", true);
    }

    /** 删除好友 */
    @DeleteMapping("/{friendId}")
    public Map<String, Boolean> deleteFriend(@PathVariable Long friendId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.deleteFriend(user.getId(), friendId);
        return Collections.singletonMap("success", true);
    }

    /** 移动好友到分组 */
    @PutMapping("/{friendId}/move")
    public Map<String, Boolean> moveFriend(@PathVariable Long friendId,
                                            @RequestBody Map<String, Long> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.moveFriend(user.getId(), friendId, body.get("groupId"));
        return Collections.singletonMap("success", true);
    }

    /** 设置好友备注 */
    @PutMapping("/{friendId}/remark")
    public Map<String, Boolean> setRemark(@PathVariable Long friendId,
                                           @RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.setRemark(user.getId(), friendId, body.get("remark"));
        return Collections.singletonMap("success", true);
    }
}
