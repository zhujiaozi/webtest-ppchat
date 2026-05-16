# PP Chat UI/UX 完善实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 PP 聊天系统的 UI/UX 重构，使其达到 QQ 桌面端风格的视觉质量，修复已知问题。

**Architecture:** 在现有 chat.html + chat.js + style.css 基础上进行增量修改，不改变后端架构。

**Tech Stack:** HTML/CSS/JavaScript, Thymeleaf, WebSocket STOMP

---

## 当前状态

- ✅ 后端全部完成（用户认证、好友、私聊、群聊、语音、个人中心）
- ✅ 三栏布局基本完成（左侧导航 + 中间列表 + 右侧内容）
- ✅ 主题系统（light/dark/system）
- ✅ SVG 图标系统
- ⏳ 右侧信息抽屉（HTML 存在但无 CSS/JS）
- ❌ 文件上传按钮需移除
- ❌ 语音录制无时间限制
- ❌ 整体 UI 打磨不足

---

## Task 1: 移除文件上传 UI

**Files:**
- Modify: `src/main/resources/static/js/chat.js` (openChat 函数中的 toolbar)

- [ ] **Step 1: 移除文件按钮和隐藏的 file input**

在 `chat.js` 的 `openChat` 函数中，删除文件上传按钮和 `<input type="file">` 元素。

- [ ] **Step 2: 验证编译**

Run: `.\mvnw.cmd compile`
Expected: BUILD SUCCESS

---

## Task 2: 语音录制限制 10 秒

**Files:**
- Modify: `src/main/resources/static/js/chat.js` (initVoiceBtn 函数)

- [ ] **Step 1: 添加 10 秒自动停止逻辑**

在 `initVoiceBtn` 函数中，录音开始后设置 10 秒超时自动停止，并在按钮上显示倒计时。

- [ ] **Step 2: 验证编译**

Run: `.\mvnw.cmd compile`
Expected: BUILD SUCCESS

---

## Task 3: 右侧信息抽屉（Drawer）

**Files:**
- Modify: `src/main/resources/templates/chat.html` (添加 drawer CSS)
- Modify: `src/main/resources/static/js/chat.js` (添加 toggleInfoDrawer 和 drawer 内容)

- [ ] **Step 1: 添加 drawer CSS 到 chat.html 的 `<style>` 块**

添加 `.im-drawer` 的样式：固定宽度 300px，右侧滑入动画，头部/主体布局。

- [ ] **Step 2: 实现 toggleInfoDrawer 函数**

在 chat.js 中实现 drawer 的显示/隐藏切换，以及根据当前聊天类型（私聊/群聊）填充不同内容。

- [ ] **Step 3: 在聊天头部添加"更多"按钮**

修改 `openChat` 函数中的 `ch-actions`，添加三横线按钮触发 `toggleInfoDrawer(true)`。

- [ ] **Step 4: 验证编译**

Run: `.\mvnw.cmd compile`
Expected: BUILD SUCCESS

---

## Task 4: UI 细节打磨

**Files:**
- Modify: `src/main/resources/templates/chat.html` (内联 CSS)
- Modify: `src/main/resources/static/css/style.css`

- [ ] **Step 1: 优化消息气泡样式**

添加头像渐变色（根据用户名 hash 生成不同颜色），优化气泡圆角和阴影。

- [ ] **Step 2: 优化输入区域**

添加 textarea 自动增高、placeholder 动画、发送按钮 hover 效果。

- [ ] **Step 3: 添加空状态插图**

用 SVG 替代文字空状态，增加视觉吸引力。

- [ ] **Step 4: 优化滚动条样式**

确保暗色主题下滚动条可见且美观。

- [ ] **Step 5: 验证编译**

Run: `.\mvnw.cmd compile`
Expected: BUILD SUCCESS

---

## Task 5: 最终验证

- [ ] **Step 1: 完整编译**

Run: `.\mvnw.cmd compile`
Expected: BUILD SUCCESS

- [ ] **Step 2: 检查所有文件无语法错误**

逐一检查 chat.html, chat.js, style.css, icons.js, theme.js 的语法完整性。
