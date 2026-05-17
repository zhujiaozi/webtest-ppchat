# PP Chat — 在线聊天系统

## 项目概述

PP 是一个基于 Spring Boot 的在线聊天系统，参考 QQ/微信/Kook 风格设计。用于南昌大学 Web 程序设计（Java EE）课程大作业。

**技术栈：**
- **后端：** Spring Boot 4.0.6 / JDK 21 / Spring Data JPA / Spring WebSocket STOMP / Spring Security（仅 BCrypt）/ Thymeleaf
- **前端：** 原生 JavaScript SPA + Thymeleaf 服务端渲染混合架构
- **数据库：** 远程 MySQL（mysql6.sqlpub.com:3311/gove_sqlpub）
- **实时通信：** WebSocket STOMP + SockJS + StompJS（CDN）

**包名：** `com.ncu.pp`
**数据库：** `pp_db`（JPA ddl-auto: update 自动建表）

---

## 构建与运行

```bash
# 编译
.\mvnw.cmd compile

# 运行（端口 8080）
.\mvnw.cmd spring-boot:run

# 打包
.\mvnw.cmd package
```

访问 `http://localhost:8080`

---

## 项目结构

```
src/main/java/com/ncu/pp/
├── PpApplication.java              # 启动类
├── config/
│   ├── SecurityConfig.java         # BCrypt Bean + 禁用 CSRF
│   ├── WebConfig.java              # 拦截器注册 + 静态资源映射
│   └── WebSocketConfig.java        # STOMP 端点 /ws，代理 /topic /queue
├── entity/                          # JPA 实体（8 张表）
│   ├── User.java                   # pp_user
│   ├── FriendGroup.java            # friend_group
│   ├── Friend.java                 # friend（双向存储）
│   ├── FriendRequest.java          # friend_request
│   ├── PrivateMessage.java         # pp_private_message
│   ├── GroupChat.java              # group_chat
│   ├── GroupMember.java            # group_member
│   └── GroupMessage.java           # pp_group_message
├── repository/                      # Spring Data JPA 接口
├── service/
│   ├── UserService.java            # 注册/登录/资料管理
│   ├── FriendService.java          # 好友分组/申请/删除/移动
│   ├── ChatService.java            # 私聊消息/搜索/导出/未读计数
│   ├── GroupService.java           # 群聊 CRUD/成员管理
│   └── FileService.java            # 文件上传
├── controller/
│   ├── page/                       # Thymeleaf 页面控制器
│   │   ├── PageController.java     # 登录/注册/首页
│   │   ├── ChatPageController.java # /chat
│   │   ├── FriendPageController.java
│   │   ├── GroupPageController.java
│   │   └── ProfilePageController.java
│   ├── rest/                       # REST API（JSON）
│   │   ├── ChatRestController.java # /api/chat/**
│   │   ├── FriendRestController.java
│   │   ├── GroupRestController.java
│   │   └── ProfileRestController.java
│   └── websocket/
│       └── ChatController.java     # STOMP 消息处理
├── interceptor/
│   └── LoginInterceptor.java       # Session 鉴权
└── dto/
    └── ChatMessage.java            # WebSocket 消息 DTO

src/main/resources/
├── application.yml
├── templates/
│   ├── login.html / register.html
│   ├── chat.html                   # 核心 SPA 页面（QQ 三栏布局）
│   ├── profile.html
│   ├── common/layout.html
│   ├── friend/ (list.html, requests.html)
│   └── group/ (list.html, create.html, detail.html)
└── static/
    ├── css/style.css               # 主题系统（light/dark/system）
    └── js/
        ├── chat.js                 # SPA 核心逻辑（~1050 行）
        ├── theme.js                # 主题切换 + Toast
        └── icons.js                # SVG 图标系统
```

---

## 架构特点

1. **混合渲染：** 管理页面（登录/注册/好友/群/个人中心）用 Thymeleaf；聊天核心 `/chat` 用原生 JS SPA + REST API + WebSocket。
2. **鉴权：** Spring Security 仅提供 BCryptPasswordEncoder Bean，实际鉴权由自定义 `LoginInterceptor` 通过 Session 实现。`/api/**` 和 `/ws/**` 被排除在拦截器之外。
3. **实时通信：** 私聊推送到 `/user/{id}/queue/private`，群聊广播到 `/topic/group/{id}`。
4. **主题系统：** CSS 变量驱动，支持 light/dark/system 三种模式，localStorage 持久化。

---

## 开发约定

- **语言：** Java 21，JavaScript（ES6+，无构建工具）
- **命名：** 实体类 PascalCase，表名 snake_case，REST 路径 kebab-case
- **前端：** 无 npm/webpack，JS 直接通过 Thymeleaf `<script>` 引入
- **数据库：** JPA ddl-auto: update，实体变更自动同步表结构
- **CSS：** 使用 CSS 变量实现主题切换，样式写在 chat.html `<style>` 块或 style.css

---

## 功能模块

| 模块 | 后端 | 前端 | 状态 |
|------|------|------|------|
| 用户认证（登录/注册/登出） | UserService + PageController | login.html, register.html | ✅ |
| 好友管理（分组/申请/删除/移动/备注） | FriendService + REST | chat.js friends 视图 | ✅ |
| 私聊（实时消息/历史/搜索/导出TXT） | ChatService + WebSocket | chat.js chat 视图 | ✅ |
| 群聊（创建/消息/成员/公告/解散） | GroupService + REST + WS | chat.js groups 视图 | ✅ |
| 语音消息（录制/发送/播放） | MediaRecorder + Base64 | chat.js voice 逻辑 | ✅ |
| 个人中心（昵称/头像/密码） | UserService + FileService | chat.js profile 视图 | ✅ |
| 主题切换（light/dark/system） | — | theme.js + CSS 变量 | ✅ |
| 信息抽屉（聊天详情侧栏） | — | chat.js drawer 逻辑 | ✅ |
| 未读消息计数 | ChatService.getUnreadCount | chat.js loadChatView | ✅ |
| 可拖动分割线 | — | chat.js initResizer | ✅ |
| WebSocket 连接状态指示器 | — | chat.js updateWsStatus | ✅ |
| 粒子背景效果 | — | chat.js initParticles | ✅ |
| 自定义模态框 | — | chat.js showModal/showInputDialog | ✅ |

---

## 最新修改（2026-05-17）

### UI/UX 优化
- **可拖动分割线**：列表栏和聊天栏之间添加可拖动分割线，最小宽度 200px，最大宽度 400px
- **输入框扩大**：消息输入框高度从 36px 增加到 44px，支持自动增高到 120px
- **白天模式对比度增强**：调整了白天模式下的颜色变量，增强了边框和阴影的对比度
- **左栏深色保持**：左侧导航栏在白天模式下保持深色（#1a1a2e），与 QQ 风格一致
- **粒子效果**：添加了 20 个浮动粒子作为背景装饰
- **气泡 hover 动效**：消息气泡悬停时放大并加深阴影
- **详情卡片全屏**：右侧详情卡片占满整个右栏宽度

### 功能修复
- **消息重复显示**：WebSocket 订阅时过滤自己发送的消息（私聊+群聊），避免乐观更新后再次显示
- **消息发送防抖**：添加 300ms 防抖，防止快速点击重复发送
- **语音消息**：录音结束后立即显示语音消息（乐观更新），并添加最短时长检查（1秒）
- **快速点击防护**：添加 `isLoadingChat` 标志防止快速点击导致聊天记录重复加载
- **群公告输入框**：从单行 input 改为多行 textarea（最小高度 60px）
- **修改密码按钮**：样式从 btn-ghost 改为 btn-primary，添加锁图标

### 新增功能
- **未读消息计数**：聊天列表中显示每个好友的未读消息数量（红色徽章）
- **WebSocket 状态指示器**：左下角头像下方显示连接状态（绿色=已连接，黄色=连接中，红色=断开）
- **主题切换器位置调整**：移到用户头像上方，布局更紧凑
- **自定义模态框**：替换所有浏览器原生 `prompt()` 和 `confirm()` 为自定义模态框

### 测试
- **JUnit 测试**：新增 UserServiceTest（11个）、ChatServiceTest（7个）、FriendServiceTest（13个）、GroupServiceTest（14个），共 46 个测试用例全部通过

---

## 待办事项

- [ ] 部分聊天记录本地缓存（localStorage）
- [ ] 更多 UI 动效（消息发送动画、页面过渡等）
- [ ] 代码架构进一步优化
