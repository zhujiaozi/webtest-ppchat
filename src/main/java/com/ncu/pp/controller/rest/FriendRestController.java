package com.ncu.pp.controller.rest;

import com.ncu.pp.entity.Friend;
import com.ncu.pp.entity.User;
import com.ncu.pp.service.FriendService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/friends")
public class FriendRestController {

    private final FriendService friendService;

    public FriendRestController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping
    public List<Friend> getFriends(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return friendService.getFriends(user.getId());
    }

    @GetMapping("/search")
    public List<User> search(@RequestParam String keyword) {
        return friendService.searchUsers(keyword);
    }
}
