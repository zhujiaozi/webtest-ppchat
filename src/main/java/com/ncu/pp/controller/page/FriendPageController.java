package com.ncu.pp.controller.page;

import com.ncu.pp.entity.User;
import com.ncu.pp.service.FriendService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/friends")
public class FriendPageController {

    private final FriendService friendService;

    public FriendPageController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String keyword, HttpSession session, Model model) {
        User user = (User) session.getAttribute("currentUser");
        model.addAttribute("groups", friendService.getGroups(user.getId()));
        model.addAttribute("friends", friendService.getFriends(user.getId()));
        if (keyword != null && !keyword.isEmpty()) {
            model.addAttribute("searchResults", friendService.searchUsers(keyword));
            model.addAttribute("keyword", keyword);
        }
        return "friend/list";
    }

    @GetMapping("/requests")
    public String requests(HttpSession session, Model model) {
        User user = (User) session.getAttribute("currentUser");
        model.addAttribute("requests", friendService.getPendingRequests(user.getId()));
        return "friend/requests";
    }

    @PostMapping("/request/send")
    public String sendRequest(@RequestParam Long toUserId,
                              @RequestParam(required = false) String message,
                              HttpSession session, RedirectAttributes ra) {
        User user = (User) session.getAttribute("currentUser");
        String error = friendService.sendRequest(user.getId(), toUserId, message);
        if (error != null) ra.addFlashAttribute("error", error);
        else ra.addFlashAttribute("msg", "申请已发送");
        return "redirect:/friends";
    }

    @PostMapping("/request/accept/{id}")
    public String acceptRequest(@PathVariable Long id) {
        friendService.acceptRequest(id);
        return "redirect:/friends/requests";
    }

    @PostMapping("/request/reject/{id}")
    public String rejectRequest(@PathVariable Long id) {
        friendService.rejectRequest(id);
        return "redirect:/friends/requests";
    }

    @PostMapping("/delete/{friendId}")
    public String deleteFriend(@PathVariable Long friendId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.deleteFriend(user.getId(), friendId);
        return "redirect:/friends";
    }

    @PostMapping("/move")
    public String moveFriend(@RequestParam Long friendId, @RequestParam Long groupId, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.moveFriend(user.getId(), friendId, groupId);
        return "redirect:/friends";
    }

    @PostMapping("/remark")
    public String setRemark(@RequestParam Long friendId, @RequestParam String remark, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.setRemark(user.getId(), friendId, remark);
        return "redirect:/friends";
    }

    @PostMapping("/group/create")
    public String createGroup(@RequestParam String name, HttpSession session) {
        User user = (User) session.getAttribute("currentUser");
        friendService.createGroup(user.getId(), name);
        return "redirect:/friends";
    }

    @PostMapping("/group/delete/{id}")
    public String deleteGroup(@PathVariable Long id) {
        friendService.deleteGroup(id);
        return "redirect:/friends";
    }
}
