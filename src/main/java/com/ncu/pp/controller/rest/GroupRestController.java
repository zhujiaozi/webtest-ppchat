package com.ncu.pp.controller.rest;

import com.ncu.pp.entity.*;
import com.ncu.pp.service.GroupService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupRestController {

    private final GroupService groupService;

    public GroupRestController(GroupService groupService) {
        this.groupService = groupService;
    }

    @GetMapping
    public List<GroupChat> getUserGroups(HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        return groupService.getUserGroups(user.getId());
    }

    @GetMapping("/{id}/messages")
    public List<GroupMessage> getMessages(@PathVariable Long id) {
        return groupService.getGroupMessages(id);
    }

    @GetMapping("/{id}/messages/search")
    public List<GroupMessage> search(@PathVariable Long id, @RequestParam String keyword) {
        return groupService.searchGroupMessages(id, keyword);
    }
}
