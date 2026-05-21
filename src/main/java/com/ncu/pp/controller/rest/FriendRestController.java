package com.ncu.pp.controller.rest;

import com.ncu.pp.dto.ApiResponse;
import com.ncu.pp.entity.*;
import com.ncu.pp.service.FriendService;
import com.ncu.pp.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
public class FriendRestController {
    private final FriendService friendService;
    private final UserService userService;

    public FriendRestController(FriendService friendService, UserService userService) {
        this.friendService = friendService;
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> getFriends(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        Map<String, Object> result = new HashMap<>();
        result.put("groups", friendService.getGroups(user.getId()));
        result.put("friends", friendService.getFriends(user.getId()));
        return ApiResponse.ok(result);
    }

    @GetMapping("/search")
    public ApiResponse<List<User>> search(@RequestParam String keyword, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return ApiResponse.ok(friendService.searchUsers(keyword, user.getId()));
    }

    @GetMapping("/search-friends")
    public ApiResponse<List<User>> searchFriends(@RequestParam String keyword, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return ApiResponse.ok(friendService.searchFriends(keyword, user.getId()));
    }

    @PostMapping("/request")
    public ApiResponse<Map<String, Object>> sendRequest(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        Long toUserId = Long.valueOf(body.get("toUserId").toString());
        String message = (String) body.getOrDefault("message", "");
        String error = friendService.sendRequest(user.getId(), toUserId, message);
        Map<String, Object> result = new HashMap<>();
        result.put("success", error == null);
        if (error != null) result.put("error", error);
        return ApiResponse.ok(result);
    }

    @GetMapping("/requests")
    public ApiResponse<List<Map<String, Object>>> getRequests(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        List<FriendRequest> requests = friendService.getPendingRequests(user.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (FriendRequest r : requests) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", r.getId());
            item.put("fromUserId", r.getFromUserId());
            item.put("toUserId", r.getToUserId());
            item.put("message", r.getMessage());
            item.put("status", r.getStatus());
            item.put("createdAt", r.getCreatedAt());
            User sender = userService.getById(r.getFromUserId());
            item.put("fromUserName", sender != null ? sender.getDisplayName() : "用户" + r.getFromUserId());
            result.add(item);
        }
        return ApiResponse.ok(result);
    }

    @PostMapping("/requests/{id}/accept")
    public ApiResponse<Void> acceptRequest(@PathVariable Long id) {
        friendService.acceptRequest(id);
        return ApiResponse.ok();
    }

    @PostMapping("/requests/{id}/reject")
    public ApiResponse<Void> rejectRequest(@PathVariable Long id) {
        friendService.rejectRequest(id);
        return ApiResponse.ok();
    }

    @PostMapping("/groups")
    public ApiResponse<FriendGroup> createGroup(@RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return ApiResponse.ok(friendService.createGroup(user.getId(), body.get("name")));
    }

    @PutMapping("/groups/{id}")
    public ApiResponse<Void> renameGroup(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        FriendGroup group = friendService.getGroupById(id);
        if (group == null || !group.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("无权操作该分组");
        }
        friendService.renameGroup(id, body.get("name"));
        return ApiResponse.ok();
    }

    @DeleteMapping("/groups/{id}")
    public ApiResponse<Void> deleteGroup(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        FriendGroup group = friendService.getGroupById(id);
        if (group == null || !group.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("无权操作该分组");
        }
        friendService.deleteGroup(id);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{friendId}")
    public ApiResponse<Void> deleteFriend(@PathVariable Long friendId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.deleteFriend(user.getId(), friendId);
        return ApiResponse.ok();
    }

    @PutMapping("/{friendId}/move")
    public ApiResponse<Void> moveFriend(@PathVariable Long friendId,
                                        @RequestBody Map<String, Long> body,
                                        HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.moveFriend(user.getId(), friendId, body.get("groupId"));
        return ApiResponse.ok();
    }

    @PutMapping("/{friendId}/remark")
    public ApiResponse<Void> setRemark(@PathVariable Long friendId,
                                       @RequestBody Map<String, String> body,
                                       HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.setRemark(user.getId(), friendId, body.get("remark"));
        return ApiResponse.ok();
    }
}
