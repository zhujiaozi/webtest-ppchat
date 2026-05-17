# PP Chat 在线聊天系统

> 南昌大学 Web 程序设计（Java EE）课程大作业：基于 Spring Boot + MySQL + WebSocket 的在线聊天系统。

PP Chat 是一个参考 QQ / 微信 / Kook 风格设计的网页在线聊天系统，支持用户认证、好友管理、私聊、群聊、语音消息、个人中心、主题切换、聊天记录搜索与导出等功能。

---

## 1. 项目特性

- 用户注册、登录、登出
- BCrypt 密码加密
- Session 登录鉴权
- 好友分组管理
- 好友申请、同意、拒绝
- 删除好友、移动分组、设置备注
- 私聊实时消息
- 群聊创建、成员管理、公告、退出、解散
- WebSocket STOMP 实时通信
- 语音消息录制与播放
- 聊天记录搜索
- 私聊记录导出 TXT
- 未读消息计数
- 个人资料修改：昵称、头像、密码
- Light / Dark / System 主题切换
- QQ 风格三栏聊天界面
- 右侧信息抽屉
- 自定义模态框
- WebSocket 连接状态指示器

---

## 2. 技术栈

| 类型 | 技术 |
|------|------|
| 后端 | Spring Boot 4.0.6 |
| Java | JDK 21 |
| Web | Spring Web MVC |
| ORM | Spring Data JPA / Hibernate |
| 数据库 | MySQL 8+ |
| 实时通信 | Spring WebSocket STOMP + SockJS + StompJS |
| 模板引擎 | Thymeleaf |
| 安全 | Spring Security BCrypt + 自定义 Session 拦截器 |
| 前端 | 原生 JavaScript SPA + HTML + CSS |
| 测试 | JUnit / Spring Boot Test / Mockito |
| 构建 | Maven Wrapper |

---

## 3. 环境要求

- JDK 21 或更高版本
- Maven 3.8 或更高版本（推荐直接使用项目自带 `mvnw.cmd`）
- MySQL 8.0 或更高版本
- IntelliJ IDEA（推荐）

---

## 4. 快速开始

### 4.1 克隆项目

在 IntelliJ IDEA 中选择：

```text
File -> New -> Project from Version Control
```

填入 Git 仓库地址后等待 Maven 自动导入依赖。

README 中的导入截图位于：

```text
pictures/
```

### 4.2 配置数据库

数据库配置位于：

```text
src/main/resources/application.yml
```

核心配置示例：

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://mysql6.sqlpub.com:3311/gove_sqlpub?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
    username: iamgove
    password: ******
  jpa:
    hibernate:
      ddl-auto: update
```

> 注意：当前项目使用 JPA `ddl-auto: update` 自动建表/更新表结构。首次启动时会根据实体类自动创建表。

### 4.3 编译项目

```bat
mvnw.cmd compile
```

### 4.4 运行测试

```bat
mvnw.cmd test
```

当前测试覆盖服务层核心逻辑，共 46 个测试用例：

```text
src/test/java/com/ncu/pp/service/
├── ChatServiceTest.java
├── FriendServiceTest.java
├── GroupServiceTest.java
└── UserServiceTest.java
```

### 4.5 启动项目

```bat
mvnw.cmd spring-boot:run
```

浏览器访问：

```text
http://localhost:8080
```

### 4.6 打包项目

```bat
mvnw.cmd package
```

---

## 5. 项目结构

```text
PP/
├── pom.xml
├── mvnw
├── mvnw.cmd
├── README.md
├── QWEN.md
├── docs/
├── pictures/
├── uploads/
├── src/
│   ├── main/
│   │   ├── java/com/ncu/pp/
│   │   │   ├── PpApplication.java
│   │   │   ├── config/
│   │   │   ├── controller/
│   │   │   │   ├── page/
│   │   │   │   ├── rest/
│   │   │   │   └── websocket/
│   │   │   ├── dto/
│   │   │   ├── entity/
│   │   │   ├── interceptor/
│   │   │   ├── repository/
│   │   │   └── service/
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── templates/
│   │       └── static/
│   │           ├── css/
│   │           └── js/
│   └── test/
│       └── java/com/ncu/pp/service/
└── target/
```

---

## 6. 后端架构

### 6.1 分层说明

| 层级 | 说明 |
|------|------|
| `controller/page` | Thymeleaf 页面控制器 |
| `controller/rest` | JSON REST API 控制器 |
| `controller/websocket` | STOMP WebSocket 消息控制器 |
| `service` | 业务逻辑层 |
| `repository` | Spring Data JPA 数据访问层 |
| `entity` | JPA 实体类 |
| `dto` | 数据传输对象 |
| `config` | Web、WebSocket、Security 配置 |
| `interceptor` | 登录拦截器 |

### 6.2 核心实体

| 实体 | 说明 |
|------|------|
| `User` | 用户账号信息 |
| `FriendGroup` | 好友分组 |
| `Friend` | 好友关系，双向存储 |
| `FriendRequest` | 好友申请 |
| `PrivateMessage` | 私聊消息 |
| `GroupChat` | 群聊 |
| `GroupMember` | 群成员 |
| `GroupMessage` | 群消息 |

### 6.3 核心服务

| 服务 | 说明 |
|------|------|
| `UserService` | 注册、登录、资料、密码 |
| `FriendService` | 好友、分组、申请、备注、搜索 |
| `ChatService` | 私聊消息、搜索、已读、未读、导出 |
| `GroupService` | 群聊、成员、公告、群消息 |
| `FileService` | 头像与语音文件上传 |

---

## 7. 前端架构

项目没有使用 npm、webpack、Vite 等前端构建工具，所有 JavaScript 和 CSS 直接由 Thymeleaf 页面引入。

### 7.1 页面类型

| 页面 | 渲染方式 |
|------|----------|
| `login.html` | Thymeleaf 独立登录页 |
| `register.html` | Thymeleaf 独立注册页 |
| `chat.html` | 原生 JavaScript SPA |
| `friend/*` | Thymeleaf 管理页 |
| `group/*` | Thymeleaf 管理页 |
| `profile.html` | Thymeleaf 管理页 |
| `common/layout.html` | 管理页公共布局 |

### 7.2 聊天 SPA 模块

`chat.html` 按顺序加载以下脚本：

```html
<script th:src="@{/js/chat-core.js}"></script>
<script th:src="@{/js/chat-ui.js}"></script>
<script th:src="@{/js/chat-view.js}"></script>
<script th:src="@{/js/chat-friends.js}"></script>
<script th:src="@{/js/chat-groups.js}"></script>
<script th:src="@{/js/chat-profile.js}"></script>
```

模块职责：

| 文件 | 职责 |
|------|------|
| `chat-core.js` | 全局状态、初始化、WebSocket、文本发送、工具函数 |
| `chat-ui.js` | 粒子背景、分割线拖拽、信息抽屉、模态框 |
| `chat-view.js` | 聊天列表、打开会话、消息渲染、录音、搜索 |
| `chat-friends.js` | 好友视图、好友申请、备注、移动、删除 |
| `chat-groups.js` | 群聊视图、群详情、公告、成员、创建群 |
| `chat-profile.js` | 个人中心、昵称、头像、密码 |
| `theme.js` | 主题切换 |
| `icons.js` | SVG 图标 |

> `chat.js` 是拆分前的历史整合文件，当前 `chat.html` 不再引用。后续开发优先修改对应的 `chat-*.js` 文件。

---

## 8. 实时通信设计

WebSocket 配置位于：

```text
src/main/java/com/ncu/pp/config/WebSocketConfig.java
```

关键配置：

| 配置 | 值 |
|------|-----|
| STOMP 端点 | `/ws` |
| 应用消息前缀 | `/app` |
| 消息代理前缀 | `/topic`, `/queue` |
| 私聊订阅 | `/user/queue/private` |
| 群聊订阅 | `/topic/group/{groupId}` |
| 私聊发送 | `/app/chat/private` |
| 群聊发送 | `/app/chat/group` |

WebSocket 握手阶段会校验 `HttpSession` 中是否存在 `currentUser`，未登录用户无法建立连接。

---

## 9. 鉴权与安全

项目使用自定义 Session 鉴权：

- 登录成功后，当前用户写入 `session.currentUser`
- `LoginInterceptor` 拦截页面和 API 请求
- 普通页面未登录时重定向到 `/login`
- `/api/**` 未登录时返回 `401` JSON
- `/ws` WebSocket 握手时检查 Session

上传安全：

- 图片类型限制：`jpeg`、`png`、`gif`、`webp`、`svg`
- 音频类型限制：`webm`、`ogg`、`wav`、`mp4`、`mpeg`
- 单文件最大：10MB
- 上传文件保存到 `uploads/`

---

## 10. 语音消息说明

语音消息由浏览器 `MediaRecorder` 录制。

发送流程：

1. 前端录音得到 Base64 Data URL
2. WebSocket 发送语音消息
3. 后端 `ChatController` 调用 `FileService.saveBase64Audio()`
4. 音频保存到：

```text
uploads/audio/
```

5. 数据库只保存音频 URL，例如：

```text
/uploads/audio/xxxx.webm
```

兼容说明：

- 历史版本曾直接把 Base64 写入数据库
- 因此 `PrivateMessage.audioData` 和 `GroupMessage.audioData` 数据库列仍保留 `LONGTEXT`
- 新数据只写入文件 URL，避免数据库膨胀

---

## 11. 常用 API 概览

### 聊天 API

```text
GET  /api/chat/private/{friendId}
GET  /api/chat/private/{friendId}/search?keyword=xxx
POST /api/chat/private/{friendId}/read
GET  /api/chat/private/{friendId}/unread
GET  /api/chat/private/{friendId}/export
```

### 好友 API

```text
GET    /api/friends
GET    /api/friends/search?keyword=xxx
POST   /api/friends/request
GET    /api/friends/requests
POST   /api/friends/requests/{id}/accept
POST   /api/friends/requests/{id}/reject
POST   /api/friends/groups
PUT    /api/friends/groups/{id}
DELETE /api/friends/groups/{id}
DELETE /api/friends/{friendId}
PUT    /api/friends/{friendId}/move
PUT    /api/friends/{friendId}/remark
```

### 群聊 API

```text
GET    /api/groups
POST   /api/groups
GET    /api/groups/{id}
PUT    /api/groups/{id}/notice
DELETE /api/groups/{id}/members/{userId}
POST   /api/groups/{id}/leave
DELETE /api/groups/{id}
GET    /api/groups/{id}/messages
GET    /api/groups/{id}/messages/search?keyword=xxx
```

### 个人中心 API

```text
GET  /api/profile
GET  /api/profile/{userId}
PUT  /api/profile/nickname
POST /api/profile/avatar
PUT  /api/profile/password
```

---

## 12. 开发规范

- Java 包名统一使用：`com.ncu.pp`
- 实体类使用 PascalCase
- 数据库表名使用 snake_case
- REST 路径使用小写复数形式
- Service 层承载业务逻辑，Controller 不写复杂业务
- 前端不引入构建工具，保持原生 JavaScript 写法
- 修改聊天功能时优先修改 `chat-*.js` 模块
- 修改后端逻辑后至少运行：

```bat
mvnw.cmd compile
mvnw.cmd test
```

- 修改前端 JavaScript 后建议运行：

```bat
node --check src\main\resources\static\js\chat-core.js
node --check src\main\resources\static\js\chat-ui.js
node --check src\main\resources\static\js\chat-view.js
node --check src\main\resources\static\js\chat-friends.js
node --check src\main\resources\static\js\chat-groups.js
node --check src\main\resources\static\js\chat-profile.js
```

---

## 13. 已验证状态

最近一次验证结果：

```text
mvnw.cmd compile  -> BUILD SUCCESS
mvnw.cmd test     -> Tests run: 46, Failures: 0, Errors: 0, Skipped: 0
node --check      -> 6 个聊天模块语法检查通过
```

---

## 14. 后续可优化方向

- 增加 Controller 层和 REST API 鉴权测试
- 增加前端端到端测试或手动验收脚本
- 优化远程数据库凭据管理，避免明文配置
- 完善文件上传失败时的前端提示
- 群聊未读消息统计
- 消息本地缓存
- 更多 UI 动效和页面过渡
- 清理或归档历史 `chat.js`

---

## 15. 课程信息

- 项目名称：PP Chat 在线聊天系统
- 课程：Web 程序设计 / Java EE
- 学校：南昌大学
- 技术路线：Spring Boot + Thymeleaf + MySQL + WebSocket
