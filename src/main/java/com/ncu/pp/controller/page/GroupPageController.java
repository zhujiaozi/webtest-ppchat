package com.ncu.pp.controller.page;

import com.ncu.pp.entity.*;
import com.ncu.pp.service.FriendService;
import com.ncu.pp.service.GroupService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Controller
@RequestMapping("/groups")
public class GroupPageController {

    private final GroupService groupService;
    private final FriendService friendService;

    public GroupPageController(GroupService groupService, FriendService friendService) {
        this.groupService = groupService;
        this.friendService = friendService;
    }

    @GetMapping
    public String list(HttpSession session, Model model) {
        User user = (User) session.getAttribute("currentUser");
        model.addAttribute("groups", groupService.getUserGroups(user.getId()));
        return "group/list";
    }

    @GetMapping("/create")
    public String createPage(HttpSession session, Model model) {
        User user = (User) session.getAttribute("currentUser");
        model.addAttribute("friends", friendService.getFriends(user.getId()));
        return "group/create";
    }

    @PostMapping("/create")
    public String create(@RequestParam String name, @RequestParam(required = false) List<Long> memberIds, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.createGroup(name, user.getId(), memberIds != null ? memberIds : List.of());
        return "redirect:/groups";
    }

    @GetMapping("/{id}")
    public String detail(@PathVariable Long id, HttpSession session, Model model) {
        User user = (User) session.getAttribute("currentUser");
        if (!groupService.isMember(id, user.getId())) return "redirect:/groups";
        model.addAttribute("group", groupService.getGroup(id));
        model.addAttribute("members", groupService.getMembers(id));
        model.addAttribute("isOwner", groupService.getGroup(id).getOwnerId().equals(user.getId()));
        return "group/detail";
    }

    @PostMapping("/{id}/leave")
    public String leave(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.leaveGroup(id, user.getId());
        return "redirect:/groups";
    }

    @PostMapping("/{id}/dissolve")
    public String dissolve(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        groupService.dissolveGroup(id, user.getId());
        return "redirect:/groups";
    }

    @PostMapping("/{id}/notice")
    public String updateNotice(@PathVariable Long id, @RequestParam String notice) {
        groupService.updateNotice(id, notice);
        return "redirect:/groups/" + id;
    }

    @PostMapping("/{id}/invite")
    public String invite(@PathVariable Long id, @RequestParam Long userId) {
        groupService.addMember(id, userId, 0);
        return "redirect:/groups/" + id;
    }

    @PostMapping("/{id}/kick/{uid}")
    public String kick(@PathVariable Long id, @PathVariable Long uid) {
        groupService.removeMember(id, uid);
        return "redirect:/groups/" + id;
    }
}
