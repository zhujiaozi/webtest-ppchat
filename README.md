# PP Chat 在线聊天系统

> 南昌大学 Web 程序设计（Java EE）课程大作业：基于 Spring Boot + MySQL + WebSocket 的在线聊天系统。

PP Chat 是一个参考 QQ / 微信风格设计的网页在线聊天系统，支持用户认证、好友管理、私聊、群聊、语音消息、通知中心、后台管理、主题切换、聊天记录搜索与导出等功能。

**线上地址**：https://pp.evog.top  
**代码仓库**：https://github.com/zhujiaozi/webtest-ppchat

---

## 功能特性

| 模块 | 功能 |
|------|------|
| 用户认证 | 注册、登录、登出、忘记密码、个人中心（昵称/头像/密码） |
| 好友管理 | 搜索用户、发送/处理好友申请、好友分组（创建/删除/重命名）、移动分组、设置备注、删除好友 |
| 通知中心 | 好友申请、群聊邀请、入群申请统一展示与处理 |
| 私聊 | 文本/语音消息实时收发、未读计数、消息状态（已发送/已送达/已读）、聊天记录搜索与导出 TXT |
| 群聊 | 创建群、邀请/申请入群、成员管理（踢出/退出/解散）、群公告、群聊天记录导出 |
| 语音消息 | MediaRecorder 录音（最长 10 秒）、Base64 编码、文件存储、播放 |
| 后台管理 | 独立管理员登录、仪表盘统计、10 张数据表 CRUD、搜索筛选、用户级联删除、重置密码 |
| 主题系统 | 亮色 / 暗色 / 跟随系统三种模式，CSS 变量驱动，全页面覆盖 |
| UI | QQ 风格三栏布局、可拖动分割线、信息抽屉、粒子背景、自定义模态框、Toast 提示 |

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 后端 | Spring Boot 4.0.6、Java 21 |
| 持久层 | Spring Data JPA / Hibernate、MySQL 8.0 |
| 实时通信 | WebSocket STOMP + SockJS + StompJS |
| 模板引擎 | Thymeleaf |
| 安全 | BCrypt 密码加密、Session 认证、自定义拦截器 |
| 前端 | 原生 JavaScript SPA + HTML + CSS（无构建工具） |
| 测试 | JUnit 5 + Mockito + Spring Boot Test |
| 部署 | Nginx 反向代理、Let's Encrypt SSL、systemd |

---

## 快速开始

### 环境要求

- JDK 21+
- Maven 3.8+（或使用项目自带 `mvnw` / `mvnw.cmd`）
- MySQL 8.0+

### 本地运行

```bash
# 克隆项目
git clone https://github.com/zhujiaozi/webtest-ppchat.git
cd webtest-ppchat

# 编译
./mvnw compile

# 运行测试（56 个用例）
./mvnw test

# 启动应用
./mvnw spring-boot:run
```

浏览器访问 http://localhost:8080

### 打包部署

```bash
# 打包 JAR
./mvnw clean package -DskipTests

# 生产环境启动
java -jar target/pp-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

> `application.yml` 包含基础配置，`application-prod.yml` 覆盖生产环境差异（端口、模板缓存、上传路径）。详见 `reports/7.项目部署文档.md`。

---

## 项目结构

```
src/main/java/com/ncu/pp/
├── PpApplication.java              # 启动类（含默认管理员初始化）
├── config/
│   ├── WebConfig.java              # 拦截器配置
│   └── WebSocketConfig.java        # WebSocket 配置（STOMP、认证、1MB 缓冲区）
├── entity/                         # 10 个 JPA 实体
│   ├── User.java / Admin.java
│   ├── FriendGroup.java / Friend.java / FriendRequest.java
│   ├── PrivateMessage.java
│   ├── GroupChat.java / GroupMember.java / GroupMessage.java
│   └── GroupInvitation.java        # 含 type 字段区分邀请/申请
├── repository/                     # 10 个 Repository 接口
├── service/                        # 6 个 Service
│   ├── UserService.java            # 用户 + 级联删除
│   ├── AdminService.java           # 管理员
│   ├── FriendService.java          # 好友
│   ├── ChatService.java            # 私聊
│   ├── GroupService.java           # 群聊 + 入群申请
│   └── FileService.java            # 文件上传
├── controller/
│   ├── page/                       # PageController + AdminController
│   ├── rest/                       # 5 个 REST Controller（含 AdminRestController）
│   └── websocket/ChatController.java
├── interceptor/                    # LoginInterceptor + AdminInterceptor
└── dto/                            # ApiResponse<T> + ChatMessage

src/main/resources/
├── application.yml                 # 基础配置
├── application-prod.yml            # 生产环境覆盖
├── templates/                      # Thymeleaf 页面（chat/login/register/admin 等）
└── static/
    ├── css/style.css               # 全局样式 + 主题系统
    └── js/
        ├── chat-core.js            # 全局状态、WebSocket、视图切换
        ├── chat-ui.js              # 粒子、分割线、模态框、Toast
        ├── chat-view.js            # 消息列表、聊天、语音、搜索/导出
        ├── chat-friends.js         # 好友、通知中心
        ├── chat-groups.js          # 群聊
        ├── chat-profile.js         # 个人中心
        ├── theme.js                # 主题切换
        └── icons.js                # SVG 图标
```

---

## WebSocket 通信

| 配置 | 值 |
|------|-----|
| 端点 | `/ws`（SockJS） |
| 私聊 | 发送 `/app/chat/private`，订阅 `/user/queue/private` |
| 群聊 | 发送 `/app/chat/group`，订阅 `/topic/group/{groupId}` |
| 缓冲区 | 1MB（支持语音消息） |
| 认证 | 握手时校验 Session，Principal 设为 userId |

---

## 数据库

10 张核心表，JPA `ddl-auto: update` 自动管理：

| 表 | 说明 |
|----|------|
| pp_user | 用户 |
| pp_admin | 管理员 |
| pp_friend_group | 好友分组 |
| pp_friend | 好友关系（双向存储） |
| pp_friend_request | 好友申请 |
| pp_private_message | 私聊消息 |
| pp_group_chat | 群聊 |
| pp_group_member | 群成员 |
| pp_group_message | 群消息 |
| pp_group_invitation | 群邀请/入群申请（type 字段区分） |

---

## 测试

```bash
./mvnw test
```

```
Tests run: 56, Failures: 0, Errors: 0, Skipped: 0

UserServiceTest:      11 tests
FriendServiceTest:    13 tests
ChatServiceTest:       7 tests
GroupServiceTest:     14 tests
Controller Tests:     11 tests
```

---

## 部署

已部署到阿里云 ECS：

| 项目 | 配置 |
|------|------|
| 域名 | pp.evog.top |
| 服务器 | Ubuntu 24.04、OpenJDK 21 |
| 反向代理 | Nginx + Let's Encrypt SSL |
| 应用端口 | 127.0.0.1:10601（仅 Nginx 可访问） |
| 数据库 | 远程 MySQL 8.0 |

部署流程详见 `reports/7.项目部署文档.md`。

---

## 课程信息

- **课程**：Web 程序设计（Java EE）
- **选题**：题目 3 — 在线聊天系统（85 分）
- **学校**：南昌大学
- **团队**：郭峰（组长）、陈弦、齐睿、沈越、宋佳伟、李子旸

---

## License

本项目为课程大作业，仅供学习交流。
