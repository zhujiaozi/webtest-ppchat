# PP Chat — 在线聊天系统

## 项目概述

PP Chat 是一个基于 **Spring Boot 4.0.6 / JDK 21** 的在线聊天系统，参考 QQ、微信、Kook 的桌面聊天体验设计。项目用于南昌大学 Web 程序设计（Java EE）课程大作业。

核心能力包括：用户注册登录、好友管理、私聊、群聊、语音消息、个人资料管理、主题切换、聊天记录搜索与导出、未读计数、WebSocket 连接状态提示等。

## 技术栈

- **后端**：Spring Boot 4.0.6、Java 21、Spring Web MVC、Spring Data JPA、Spring WebSocket STOMP、Spring Security（主要用于 BCrypt）
- **前端**：Thymeleaf + 原生 JavaScript SPA，无 npm/webpack 构建流程
- **数据库**：MySQL 8+，当前配置为远程 MySQL
- **实时通信**：SockJS + StompJS（CDN）+ Spring WebSocket Simple Broker
- **模板引擎**：Thymeleaf
- **测试**：JUnit / Spring Boot Test / Mockito
- **构建工具**：Maven Wrapper（`mvnw.cmd`）

## 架构概览

项目采用 **混合渲染架构**：

1. `/chat` 是核心聊天 SPA 页面，由 `chat.html` 提供页面骨架，多个原生 JS 文件负责视图和交互逻辑。
2. 登录、注册、好友、群聊、个人中心等管理页面使用 Thymeleaf 服务端渲染。
3. 后端按 Controller / Service / Repository / Entity 分层。
4. 认证基于 Session：登录成功后写入 `session.currentUser`，页面和 API 由 `LoginInterceptor` 拦截校验。
5. WebSocket 握手通过 `WebSocketConfig.AuthHandshakeInterceptor` 校验 Session，未登录用户不能建立 WebSocket 连接。
6. 私聊推送到 `/user/{id}/queue/private`，群聊广播到 `/topic/group/{id}`。

## 目录结构

```text
src/main/java/com/ncu/pp/
├── PpApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── WebConfig.java
│   └── WebSocketConfig.java
├── controller/
│   ├── page/          # Thymeleaf 页面控制器
│   ├── rest/          # JSON REST API
│   └── websocket/     # STOMP 消息控制器
├── dto/
│   └── ChatMessage.java
├── entity/            # JPA 实体，共 8 张核心表
├── interceptor/
│   └── LoginInterceptor.java
├── repository/        # Spring Data JPA Repository
└── service/           # 业务逻辑层

src/main/resources/
├── application.yml
├── templates/
│   ├── chat.html
│   ├── login.html
│   ├── register.html
│   ├── common/layout.html
│   ├── friend/
│   └── group/
└── static/
    ├── css/style.css
    └── js/
        ├── chat-core.js
        ├── chat-ui.js
        ├── chat-view.js
        ├── chat-friends.js
        ├── chat-groups.js
        ├── chat-profile.js
        ├── chat.js          # 历史整合文件，当前 chat.html 不再引用
        ├── theme.js
        └── icons.js
```

## 构建、运行与测试

在 Windows 下使用 Maven Wrapper：

```bat
REM 编译
mvnw.cmd compile

REM 运行测试
mvnw.cmd test

REM 打包
mvnw.cmd package

REM 启动应用，默认端口 8080
mvnw.cmd spring-boot:run
```

访问地址：

```text
http://localhost:8080
```

当前测试套件位于：

```text
src/test/java/com/ncu/pp/service/
├── ChatServiceTest.java
├── FriendServiceTest.java
├── GroupServiceTest.java
└── UserServiceTest.java
```

最近验证命令：

```bat
mvnw.cmd compile
mvnw.cmd test
node --check src\main\resources\static\js\chat-core.js
node --check src\main\resources\static\js\chat-ui.js
node --check src\main\resources\static\js\chat-view.js
node --check src\main\resources\static\js\chat-friends.js
node --check src\main\resources\static\js\chat-groups.js
node --check src\main\resources\static\js\chat-profile.js
```

## 配置说明

主要配置文件：`src/main/resources/application.yml`

关键配置：

- 服务端口：`8080`
- 数据库：远程 MySQL，JPA `ddl-auto: update`
- SQL 日志：`show-sql: false`，`hibernate.format_sql: false`
- 连接池：HikariCP，最大连接数 10，最小空闲 2
- 文件上传限制：最大 10MB
- 上传目录：`./uploads/`

注意：`application.yml` 中包含数据库连接信息，修改、提交或展示时注意保护敏感信息。

## 后端模块说明

### 实体层

`src/main/java/com/ncu/pp/entity/` 包含 8 个核心实体：

- `User`：用户账号、昵称、头像、在线状态、登录统计
- `FriendGroup`：好友分组
- `Friend`：好友关系，采用双向记录存储
- `FriendRequest`：好友申请
- `PrivateMessage`：私聊消息
- `GroupChat`：群聊
- `GroupMember`：群成员与角色
- `GroupMessage`：群消息

语音消息说明：

- 新语音消息会由 `FileService.saveBase64Audio()` 保存为 `/uploads/audio/*.webm` 等文件，再把 URL 写入 `audioData`。
- `PrivateMessage.audioData` 和 `GroupMessage.audioData` 的数据库列仍保留 `LONGTEXT`，用于兼容历史 Base64 数据，避免 JPA 自动缩列导致数据截断。

### 服务层

主要服务：

- `UserService`：注册、登录、资料更新、密码修改
- `FriendService`：好友分组、申请、同意/拒绝、删除、移动、备注、用户搜索
- `ChatService`：私聊消息保存、查询、搜索、已读、未读计数、导出
- `GroupService`：群创建、成员管理、群公告、群消息、解散/退出
- `FileService`：头像/音频上传、类型校验、大小校验、Base64 音频落盘

`FriendService.searchUsers(keyword, excludeUserId)` 使用 `UserRepository.searchByKeyword()` 由数据库完成搜索过滤，不再用 `findAll().stream()` 全表内存扫描。

### 控制器层

页面控制器：

- `PageController`：登录、注册、登出、首页跳转
- `ChatPageController`：聊天页 `/chat`
- `FriendPageController`：好友管理页面
- `GroupPageController`：群聊管理页面
- `ProfilePageController`：个人中心页面

REST API：

- `/api/chat/**`：私聊记录、搜索、已读、未读、导出
- `/api/friends/**`：好友列表、搜索、申请、分组、备注、移动、删除
- `/api/groups/**`：群列表、创建、详情、公告、成员、群消息
- `/api/profile/**`：当前用户、指定用户、昵称、头像、密码

WebSocket：

- `@MessageMapping("/chat/private")`：保存私聊消息并推送给接收者
- `@MessageMapping("/chat/group")`：保存群消息并广播给群订阅者

## 鉴权与安全约定

- 登录状态保存在 `HttpSession` 的 `currentUser`。
- `LoginInterceptor` 拦截除登录、注册、静态资源、上传资源外的所有请求。
- `/api/**` 未登录时返回：`401` JSON：`{"error":"未登录","code":401}`。
- 普通页面未登录时重定向到 `/login`。
- WebSocket `/ws` 握手阶段检查 Session，未登录则拒绝连接。
- Spring Security 当前主要用于 BCrypt 和关闭默认 CSRF 干扰，实际业务鉴权由自定义拦截器完成。
- 文件上传必须经过 `FileService` 校验：图片仅允许 jpeg/png/gif/webp/svg，音频仅允许 webm/ogg/wav/mp4/mpeg，最大 10MB。

## 前端结构

`chat.html` 当前按以下顺序加载聊天 SPA 脚本：

```html
<script th:src="@{/js/chat-core.js}"></script>
<script th:src="@{/js/chat-ui.js}"></script>
<script th:src="@{/js/chat-view.js}"></script>
<script th:src="@{/js/chat-friends.js}"></script>
<script th:src="@{/js/chat-groups.js}"></script>
<script th:src="@{/js/chat-profile.js}"></script>
```

加载顺序很重要：这些文件不是 ES Module，没有 import/export，共享全局变量和全局函数。

模块职责：

- `chat-core.js`：全局状态、初始化、fetch 401 处理、WebSocket 连接、发送文本消息、通用工具函数
- `chat-ui.js`：粒子背景、拖拽分割线、信息抽屉、自定义模态框、导出入口
- `chat-view.js`：聊天列表、打开会话、消息渲染、语音播放、聊天记录搜索、录音按钮
- `chat-friends.js`：好友视图、好友申请、备注、移动分组、删除好友、搜索用户
- `chat-groups.js`：群列表、群详情、公告、踢人、退出、解散、创建群
- `chat-profile.js`：个人中心、昵称、头像、密码
- `theme.js`：light/dark/system 主题切换
- `icons.js`：SVG 图标工具

`chat.js` 是拆分前的历史整合文件，当前 `chat.html` 不再引用。修改聊天功能时优先改对应的 `chat-*.js` 模块。

## Thymeleaf 页面约定

- 登录/注册页独立使用 `auth-page` 布局：`login.html`、`register.html`。
- 管理页使用统一布局：`templates/common/layout.html`。
- 好友/群聊/个人中心页面通过 `th:replace="~{common/layout :: layout(...)}"` 注入内容。
- 聊天 SPA 页面 `chat.html` 使用独立三栏布局，不走 `common/layout.html`。

## 开发约定

- Java 包名：`com.ncu.pp`
- Java 版本：21
- 实体类使用 Lombok `@Data`
- 表名使用 snake_case，例如 `pp_user`、`pp_private_message`
- REST 路径使用小写复数路径，例如 `/api/friends`、`/api/groups`
- 前端无构建工具，直接写原生 JavaScript 和 CSS
- 不要随意引入 npm、webpack、Vite 等构建体系，除非用户明确要求
- 修改代码前先阅读相关 Controller / Service / Repository / Template / JS 模块，保持现有风格
- 涉及功能变更时优先补充或更新测试
- 完成改动前至少运行：`mvnw.cmd compile`，后端逻辑变更还应运行 `mvnw.cmd test`
- 修改前端 JS 时运行对应 `node --check` 语法检查

## 常见注意事项

1. **不要把 Base64 语音直接写回数据库**：新语音消息应保存为文件 URL。
2. **不要重新启用 SQL 日志**：`show-sql` 和 `format_sql` 当前应保持 false。
3. **不要绕过 LoginInterceptor**：新增 API 默认应受 Session 鉴权保护。
4. **不要改变 WebSocket 端点 `/ws`、应用前缀 `/app`、订阅前缀 `/topic` `/queue`，除非同时改前端。**
5. **不要把管理页改成和 chat.html 共用布局**：聊天页是独立 SPA。
6. **不要删除 `uploads/` 的静态资源映射**：头像和语音文件依赖 `/uploads/**`。
7. **如果修改 `audioData` 字段定义，必须考虑历史 LONGTEXT Base64 数据兼容。**

## 当前功能状态

已完成：

- 用户认证：登录、注册、登出、BCrypt 密码
- 好友管理：分组、申请、同意/拒绝、删除、移动、备注
- 私聊：实时消息、历史记录、搜索、导出 TXT、未读计数
- 群聊：创建、消息、成员管理、公告、退出、解散
- 语音消息：MediaRecorder 录音，保存为上传文件 URL
- 个人中心：昵称、头像、密码
- 主题系统：light/dark/system
- 自定义模态框
- 信息抽屉
- WebSocket 状态指示器
- 聊天面板拖拽分割线
- 基础服务层测试 46 个用例

后续可优化：

- 增加 Controller 层/API 鉴权与异常处理测试
- 增加前端端到端测试或手动验收脚本
- 清理历史 `chat.js` 或保留为备份需明确说明
- 进一步完善文件上传错误提示
- 给群消息增加已读/未读统计
- 优化远程数据库凭据管理，避免明文写入配置文件
