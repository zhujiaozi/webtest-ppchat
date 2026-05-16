# PP 在线聊天系统 — 设计文档

> **项目名称**：PP 在线聊天系统
> **创建日期**：2026-05-16
> **技术栈**：Spring Boot 4.0.6 / JDK 21 / JPA / MySQL / WebSocket STOMP / Thymeleaf
> **参考风格**：微信 / QQ / Kook

---

## 1. 项目概述

PP 是一个基于 Web 的在线聊天系统，支持用户注册登录、好友管理（分组）、一对一私聊、多人群聊、语音消息、聊天记录查询与导出。

采用**混合架构**：管理类页面（登录注册、好友管理、群管理、个人资料）使用 Thymeleaf 服务端渲染；聊天核心页面使用原生 JavaScript + WebSocket 实时通信。单体部署，无跨域问题。

### 1.1 评分目标

对应课程"题目3：在线聊天系统（85分）"，覆盖全部要求：

| 要求 | 对应模块 |
|------|---------|
| 登录与注册 | 模块1：用户认证 |
| 聊天管理（私聊、群聊） | 模块3 + 模块4 |
| 查询聊天记录，下载到本地 | 模块3：聊天记录搜索 + TXT 导出 |
| 语音聊天（+5分） | 模块5：语音消息 |
| 好友管理（分组、移动、删除、重新发送验证信息） | 模块2：好友管理 |

---

## 2. 系统架构

### 2.1 整体分层

```
┌─────────────────────────────────────────────────────────────────┐
│                        浏览器 (Browser)                         │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │   Thymeleaf 页面      │    │      聊天 SPA 页面            │   │
│  │  ┌────────────────┐  │    │  ┌────────────┐ ┌─────────┐  │   │
│  │  │ 登录 / 注册     │  │    │  │ 好友列表    │ │ 聊天区域 │  │   │
│  │  │ 好友管理(CRUD)  │  │    │  │ (JS渲染)   │ │(WebSocket│  │   │
│  │  │ 群管理(CRUD)    │  │    │  │            │ │  实时)   │  │   │
│  │  │ 个人资料        │  │    │  │            │ │ 语音录制 │  │   │
│  │  └────────────────┘  │    │  └────────────┘ └─────────┘  │   │
│  └──────────┬───────────┘    └──────────────┬───────────────┘   │
│             │ HTTP (表单提交/页面跳转)        │ HTTP + WebSocket  │
└─────────────┼───────────────────────────────┼───────────────────┘
              │                               │
┌─────────────┼───────────────────────────────┼───────────────────┐
│             ▼           Spring Boot         ▼                   │
│  ┌──────────────────┐            ┌──────────────────────┐       │
│  │  PageController   │            │  REST Controller     │       │
│  │  (Thymeleaf渲染)  │            │  (返回JSON)          │       │
│  └────────┬─────────┘            └──────────┬───────────┘       │
│           │                                 │                   │
│  ┌────────┴─────────────────────────────────┴───────────┐       │
│  │                   Service 层                          │       │
│  │  UserService / FriendService / ChatService /          │       │
│  │  GroupService / MessageService / FileService          │       │
│  └────────────────────────┬──────────────────────────────┘       │
│                           │                                     │
│  ┌────────────────────────┴──────────────────────────────┐       │
│  │                  Repository 层 (JPA)                   │       │
│  └────────────────────────┬──────────────────────────────┘       │
│                           │                                     │
│  ┌────────────────────────┴──────────────────────────────┐       │
│  │              WebSocket (STOMP)                         │       │
│  │  ChatController — 私聊/群聊消息转发                      │       │
│  └───────────────────────────────────────────────────────┘       │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │     MySQL 数据库       │
                    │   pp_db (8张核心表)     │
                    └───────────────────────┘
```

### 2.2 页面路由规划

| 路径 | 渲染方式 | 功能 |
|------|---------|------|
| `/login` | Thymeleaf | 登录页 |
| `/register` | Thymeleaf | 注册页 |
| `/chat` | 纯 HTML + JS | 聊天主界面（核心） |
| `/friends` | Thymeleaf | 好友管理（分组 CRUD） |
| `/groups` | Thymeleaf | 群管理（创建/退出/成员） |
| `/profile` | Thymeleaf | 个人资料编辑 |
| `/api/**` | REST JSON | 聊天数据 API（给 JS 调用） |
| `/ws` | WebSocket | STOMP 端点（实时消息） |

---

## 3. 数据库设计

### 3.1 ER 关系概览

8 张核心表，关系如下：

- `user` 是中心实体，所有其他表通过外键关联到 `user.id`
- `friend_group` 和 `friend` 构成好友分组体系
- `friend_request` 记录好友申请流程
- `private_message` 和 `group_message` 分别存储私聊和群聊消息
- `group_chat` 和 `group_member` 构成群聊体系

### 3.2 表结构明细

#### 3.2.1 user — 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| username | VARCHAR(50) | UNIQUE NOT NULL | 登录用户名 |
| password | VARCHAR(255) | NOT NULL | 密码（BCrypt 加密） |
| nickname | VARCHAR(50) | | 显示昵称 |
| avatar | VARCHAR(500) | | 头像 URL |
| status | INT | DEFAULT 0 | 0=离线 1=在线 2=隐身 |
| last_login | DATETIME | | 最近登录时间 |
| login_count | INT | DEFAULT 0 | 累计登录次数 |
| created_at | DATETIME | | 注册时间 |
| updated_at | DATETIME | | 更新时间 |

#### 3.2.2 friend_group — 好友分组表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| user_id | BIGINT | FK → user.id | 所属用户 |
| name | VARCHAR(50) | NOT NULL | 分组名称（如"同事""同学"） |
| sort_order | INT | DEFAULT 0 | 排序权重 |

#### 3.2.3 friend — 好友关系表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| user_id | BIGINT | FK → user.id | 用户 A |
| friend_id | BIGINT | FK → user.id | 用户 B（好友） |
| group_id | BIGINT | FK → friend_group.id | 所属分组 |
| remark | VARCHAR(50) | | 好友备注名 |
| created_at | DATETIME | | 成为好友时间 |

**设计说明**：双向存储。A 加 B 为好友时插入两条记录 `(A, B)` 和 `(B, A)`，查询时只需 `WHERE user_id = ?`，无需 UNION。

#### 3.2.4 friend_request — 好友申请表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| from_user_id | BIGINT | FK → user.id | 发起者 |
| to_user_id | BIGINT | FK → user.id | 接收者 |
| message | VARCHAR(200) | | 验证消息 |
| status | INT | DEFAULT 0 | 0=待处理 1=已同意 2=已拒绝 |
| created_at | DATETIME | | 申请时间 |

#### 3.2.5 private_message — 私聊消息表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| sender_id | BIGINT | FK → user.id | 发送者 |
| receiver_id | BIGINT | FK → user.id | 接收者 |
| content | TEXT | | 消息内容 |
| msg_type | INT | DEFAULT 0 | 0=文本 1=语音 |
| audio_data | LONGTEXT | | 语音 Base64（仅语音消息） |
| status | INT | DEFAULT 0 | 0=已发送 1=已送达 2=已读 |
| created_at | DATETIME | | 发送时间 |

#### 3.2.6 group_chat — 群表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| name | VARCHAR(100) | NOT NULL | 群名称 |
| owner_id | BIGINT | FK → user.id | 群主 |
| avatar | VARCHAR(500) | | 群头像 |
| notice | VARCHAR(500) | | 群公告 |
| created_at | DATETIME | | 创建时间 |

#### 3.2.7 group_member — 群成员表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| group_id | BIGINT | FK → group_chat.id | 所属群 |
| user_id | BIGINT | FK → user.id | 成员 |
| role | INT | DEFAULT 0 | 0=普通成员 1=管理员 2=群主 |
| joined_at | DATETIME | | 加入时间 |

#### 3.2.8 group_message — 群聊消息表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK AUTO_INCREMENT | 主键 |
| group_id | BIGINT | FK → group_chat.id | 所属群 |
| sender_id | BIGINT | FK → user.id | 发送者 |
| content | TEXT | | 消息内容 |
| msg_type | INT | DEFAULT 0 | 0=文本 1=语音 |
| audio_data | LONGTEXT | | 语音 Base64 |
| created_at | DATETIME | | 发送时间 |

---

## 4. UI 设计

### 4.1 聊天主界面（/chat）

微信/QQ 风格三栏布局：

```
┌──────┬────────────────┬──────────────────────────────────────┐
│      │                │                                      │
│  💬  │  🔍 搜索       │  张三                          ⋯    │
│      │                │──────────────────────────────────────│
│  👥  │  张三   14:32  │                                      │
│      │  好的，明天见！ │  14:20                              │
│  🏠  │                │  ┌─────────────────┐                 │
│      │  李四   13:15  │  │ 明天下午有空吗？ │  (对方·白色)    │
│      │  [3] 你看到群  │  └─────────────────┘                 │
│      │  计科2班 12:00 │              ┌──────────────┐        │
│      │  王五: 下午有  │              │ 有空，什么事？│ (我·绿色)│
│      │                │              └──────────────┘        │
│      │  赵六   昨天   │  ┌─────────────────┐                 │
│      │  [语音消息]    │  │ 好的，明天见！   │  (对方·白色)    │
│      │                │  └─────────────────┘                 │
│  我  │                │  ┌🔊 ─────── 0:05┐  (语音消息)       │
│      │                │  └───────────────┘                   │
│      │                │──────────────────────────────────────│
│      │                │  😊  📎  🎤  ✂️                      │
│      │                │  ┌──────────────────────┐ [发送]     │
│      │                │  │ 输入消息...           │  Enter     │
│      │                │  └──────────────────────┘            │
└──────┴────────────────┴──────────────────────────────────────┘
 左侧     中间会话列表        右侧聊天区域
 导航
```

- **左侧导航栏**：💬 聊天、👥 好友、🏠 群聊、头像（个人中心）
- **中间会话列表**：搜索栏 + 按最近消息时间排序的会话列表，显示未读计数
- **右侧聊天区域**：消息头部 + 消息气泡区 + 输入工具栏 + 输入框

### 4.2 消息气泡样式

- **我的消息**：绿色背景 `#95ec69`，靠右对齐，圆角 `12px 0 12px 12px`
- **对方消息**：白色背景，靠左对齐，圆角 `0 12px 12px 12px`，带头像
- **语音消息**：显示 🔊 图标 + 进度条 + 时长，点击播放
- **时间标记**：居中灰色小字，每 5 分钟显示一次

### 4.3 其他页面

- `/login`、`/register`：简洁表单，居中卡片式布局
- `/friends`：左侧分组树 + 右侧好友列表，支持搜索、申请处理、分组管理
- `/groups`：群列表 + 群详情（成员管理、公告编辑）
- `/profile`：头像上传 + 表单编辑

---

## 5. 功能模块设计

### 5.1 模块1：用户认证

**功能清单**：
- 注册（用户名 + 密码 + 昫称）
- 登录（Session 鉴权，密码 BCrypt 加密）
- 登出（销毁 Session）
- 记录登录次数 & 最近登录时间

**技术要点**：
- `LoginInterceptor` 拦截所有请求，排除 `/login`、`/register`、`/css/**`、`/js/**`、`/api/**`、`/ws`
- 密码使用 Spring Security 的 `BCryptPasswordEncoder` 加密
- 登录成功后将 `User` 对象存入 `HttpSession`

### 5.2 模块2：好友管理

**功能清单**：
- 搜索用户（按用户名模糊搜索）
- 发送好友申请（附验证消息）
- 同意/拒绝申请（可重新发送验证信息）
- 好友分组（创建/重命名/删除分组，默认分组"我的好友"）
- 移动好友到其他分组
- 设置好友备注名
- 删除好友（双向删除）

**数据流**：
1. 用户 A 搜索到用户 B → 发送好友申请（写入 `friend_request`）
2. 用户 B 在好友申请列表看到 → 同意
3. 系统在 `friend` 表插入两条记录 `(A, B)` 和 `(B, A)`
4. 双方好友列表即时更新

### 5.3 模块3：私聊

**功能清单**：
- 从好友列表点击好友进入私聊
- 实时文本消息收发（WebSocket STOMP）
- 消息状态（已发送 → 已送达 → 已读）
- 未读消息计数
- 聊天记录查询（关键词搜索）
- 聊天记录导出（TXT 下载）

**WebSocket 通信流程**：

```
用户A → STOMP /app/chat/private → ChatController
  → 存入 private_message 表
  → 推送 /user/{receiver}/queue/private → 用户B
  → 推送 /user/{sender}/queue/private → 用户A（确认显示）
```

**消息状态机制**：
- 发送时：status = 0（已发送）
- 对方在线收到推送时：status = 1（已送达）
- 对方打开会话时：status = 2（已读），通过 REST API `/api/message/read` 批量更新

### 5.4 模块4：群聊

**功能清单**：
- 创建群（选好友入群，设置群名）
- 群消息实时收发（WebSocket 广播）
- 群成员管理（邀请/踢出，仅群主和管理员）
- 群公告编辑
- 退出/解散群聊（群主解散全员退出）
- 群消息免打扰

**WebSocket 通信流程**：

```
用户A → STOMP /app/chat/group → ChatController
  → 存入 group_message 表
  → 广播 /topic/group/{groupId} → 群内所有在线成员
```

**入群时自动订阅** `/topic/group/{groupId}`，退群时取消订阅。

### 5.5 模块5：语音消息

**功能清单**：
- 浏览器录音（MediaRecorder API）
- 音频转 Base64 编码
- 通过 WebSocket 发送（复用私聊/群聊通道）
- 接收端播放音频（Audio API）
- 私聊 & 群聊均支持
- 录音时长限制 60 秒

**技术流程**：
1. 用户长按 🎤 按钮 → 调用 `navigator.mediaDevices.getUserMedia({ audio: true })`
2. 创建 `MediaRecorder`，格式 `audio/webm;codecs=opus`
3. 松开按钮 → `mediaRecorder.stop()` → 合并音频 Blob
4. `FileReader.readAsDataURL(audioBlob)` → 转为 Base64
5. 通过 STOMP 发送，`msg_type = 1`，`audio_data = base64String`
6. 接收端 `new Audio(base64Data).play()` 播放

### 5.6 模块6：个人中心

**功能清单**：
- 修改昵称
- 修改头像（上传图片，`MultipartFile` 存储到服务器 `/uploads/`）
- 修改密码（需验证旧密码）
- 查看登录次数 & 最近登录时间

---

## 6. 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Spring Boot | 4.0.6 | 后端框架 |
| JDK | 21 | Java 运行时 |
| Spring Data JPA | - | 数据库 ORM |
| MySQL | 8.0+ | 关系型数据库 |
| Thymeleaf | - | 服务端模板引擎 |
| WebSocket (STOMP) | - | 实时消息通信 |
| SockJS + StompJS | - | 前端 WebSocket 客户端 |
| Lombok | - | 减少样板代码 |
| BCrypt (Spring Security) | - | 密码加密 |
| 原生 JS (MediaRecorder) | - | 语音录制 |

---

## 7. 项目包结构

```
com.ncu.pp/
├── PpApplication.java                 # 启动类
├── config/
│   ├── WebConfig.java                 # 拦截器注册
│   └── WebSocketConfig.java           # WebSocket 配置
├── entity/                            # 8 个实体类
│   ├── User.java
│   ├── FriendGroup.java
│   ├── Friend.java
│   ├── FriendRequest.java
│   ├── PrivateMessage.java
│   ├── GroupChat.java
│   ├── GroupMember.java
│   └── GroupMessage.java
├── repository/                        # 8 个 Repository 接口
├── service/                           # 6 个 Service
│   ├── UserService.java
│   ├── FriendService.java
│   ├── ChatService.java
│   ├── GroupService.java
│   ├── MessageService.java
│   └── FileService.java
├── controller/
│   ├── rest/                          # REST API（给 JS 调用）
│   │   ├── AuthRestController.java
│   │   ├── FriendRestController.java
│   │   ├── ChatRestController.java
│   │   ├── GroupRestController.java
│   │   └── MessageRestController.java
│   ├── page/                          # 页面控制器（Thymeleaf）
│   │   ├── PageController.java
│   │   ├── FriendPageController.java
│   │   ├── GroupPageController.java
│   │   └── ProfilePageController.java
│   └── websocket/
│       └── ChatController.java        # WebSocket 消息处理
├── interceptor/
│   └── LoginInterceptor.java
└── dto/
    └── ChatMessage.java               # WebSocket 消息 DTO
```

---

## 8. 非功能需求

| 项目 | 要求 |
|------|------|
| 编码 | UTF-8，防止中文乱码 |
| 密码安全 | BCrypt 加密存储，不明文 |
| 响应式 | 聊天页面适配桌面端（800px+） |
| 浏览器兼容 | Chrome / Firefox / Edge 近 2 个版本 |
| 部署 | 远程/云服务器 MySQL，Spring Boot 内嵌 Tomcat |
