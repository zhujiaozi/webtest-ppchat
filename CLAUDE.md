# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**PP Chat** is a Spring Boot 4.0.6 + Java 21 web-based instant messaging application for the Nanchang University "Web Programming (Java EE)" course project. It implements user authentication, friend management (with groups), private chat, group chat, voice messages, personal center, theme switching, and chat history search/export.

### Tech Stack
- **Backend**: Spring Boot 4.0.6, Java 21, Spring Data JPA/Hibernate, MySQL 8+
- **Real-time**: WebSocket STOMP + SockJS + StompJS
- **Template Engine**: Thymeleaf
- **Security**: BCrypt (Spring Security) + custom Session interceptor
- **Frontend**: Vanilla JavaScript SPA + HTML + CSS (no build tools)
- **Testing**: JUnit 5, Spring Boot Test, Mockito
- **Build**: Maven Wrapper (`mvnw` / `mvnw.cmd`)

---

## Common Commands

```bash
# Compile
./mvnw compile          # Linux/Mac
mvnw.cmd compile        # Windows

# Run tests
./mvnw test             # All tests
./mvnw test -Dtest=FriendServiceTest  # Single test class

# Start application
./mvnw spring-boot:run

# Package
./mvnw clean package -DskipTests

# Check JS syntax (optional)
node --check src/main/resources/static/js/chat-core.js
```

---

## Architecture

### Backend Layers
| Layer | Path | Purpose |
|-------|------|---------|
| Page Controllers | `controller/page/` | Thymeleaf page rendering |
| REST Controllers | `controller/rest/` | JSON API endpoints |
| WebSocket Controller | `controller/websocket/ChatController.java` | STOMP message handling |
| Services | `service/` | Business logic |
| Repositories | `repository/` | JPA data access |
| Entities | `entity/` | JPA entities (9 tables) |
| Config | `config/` | Web, WebSocket, Security config |
| Interceptor | `interceptor/LoginInterceptor.java` | Session auth |

### Frontend Modules (chat.html SPA)
| File | Purpose |
|------|---------|
| `chat-core.js` | Global state, init, WebSocket, text sending, utilities |
| `chat-ui.js` | Particles, resizer, drawer, modal system |
| `chat-view.js` | Chat list, open chat, message rendering, voice recording, search |
| `chat-friends.js` | Friends view, requests, remarks, move, delete |
| `chat-groups.js` | Groups view, details, announcements, members, create |
| `chat-profile.js` | Personal center, nickname, avatar, password |
| `theme.js` | Theme switching (light/dark/system) |
| `icons.js` | SVG icon library |

> Note: `chat.js` is a legacy bundled file no longer used by `chat.html`. Modify individual `chat-*.js` files instead.

---

## Key Design Decisions

### Database
- 9 core tables: `pp_user`, `pp_friend_group`, `pp_friend`, `pp_friend_request`, `pp_private_message`, `pp_group_chat`, `pp_group_member`, `pp_group_message`, `pp_group_invitation`
- Friend relationships stored bidirectionally (A→B and B→A)
- JPA `ddl-auto: update` for automatic schema management

### WebSocket STOMP
- Endpoint: `/ws` (SockJS fallback)
- App prefix: `/app`, Broker prefixes: `/topic`, `/queue`
- Private: send to `/app/chat/private`, subscribe `/user/{userId}/queue/private`
- Group: send to `/app/chat/group`, subscribe `/topic/group/{groupId}`
- Auth: Handshake checks `session.currentUser`; Principal set to user ID string
- Buffer size: 1MB (configured in `WebSocketConfig.java` and `application.yml`)

### Authentication
- Custom Session-based auth (not Spring Security filter chain)
- Login stores `User` object in `session.setAttribute("currentUser", user)`
- `LoginInterceptor` redirects unauthenticated requests to `/login`
- Password field hidden from API responses via `@JsonIgnore`

### Voice Messages
- Recorded via MediaRecorder API (`audio/webm;codecs=opus`)
- Converted to Base64 Data URL, sent via STOMP
- Saved as files in `uploads/audio/`, database stores URL only
- Max duration: 10 seconds

### Performance Optimizations
- Batch queries to avoid N+1 (e.g., `countUnreadGroupedBySender`, `findAllById`)
- Generation counter pattern prevents async view loading race conditions
- Enriched API responses include sender names to avoid extra fetches

---

## API Endpoints Summary

### Friends (`/api/friends`)
- `GET /` — Get friends and groups
- `GET /search?keyword=` — Search all users
- `GET /search-friends?keyword=` — Search only friends
- `POST /request` — Send friend request
- `GET /requests` — Get pending requests (enriched with sender name)
- `POST /requests/{id}/accept|reject`
- `POST /groups` — Create group
- `PUT /groups/{id}` — Rename group
- `DELETE /groups/{id}` — Delete group (moves friends to ungrouped)
- `DELETE /{friendId}` — Delete friend (bidirectional)
- `PUT /{friendId}/move` — Move to group
- `PUT /{friendId}/remark` — Set remark

### Chat (`/api/chat`)
- `GET /private/{friendId}` — Get conversation
- `GET /private/{friendId}/search?keyword=` — Search conversation
- `POST /private/{friendId}/read` — Mark as read
- `GET /private/{friendId}/unread` — Unread count
- `GET /private/unread-all` — Batch unread counts (Map)
- `GET /private/{friendId}/export` — Export as TXT

### Groups (`/api/groups`)
- `GET /` — Get user's groups
- `POST /` — Create group
- `GET /{id}` — Get group detail with members
- `PUT /{id}/notice` — Update announcement (owner only)
- `DELETE /{id}/members/{userId}` — Kick member (owner only)
- `POST /{id}/leave` — Leave group
- `DELETE /{id}` — Dissolve group (owner only)
- `POST /{id}/invite` — Invite member
- `GET /invitations` — Get pending invitations
- `POST /invitations/{id}/accept|reject`
- `GET /{id}/messages` — Get messages (enriched)
- `GET /{id}/messages/search?keyword=` — Search messages
- `GET /{id}/export` — Export group chat

### Profile (`/api/profile`)
- `GET /` — Get current user profile
- `PUT /nickname` — Update nickname
- `POST /avatar` — Upload avatar (multipart)
- `PUT /password` — Change password

---

## Important Files

| File | Purpose |
|------|---------|
| `src/main/resources/application.yml` | DB config, upload dir, WebSocket buffer sizes |
| `src/main/java/com/ncu/pp/config/WebSocketConfig.java` | STOMP endpoint, auth handshake, buffer limits |
| `src/main/java/com/ncu/pp/config/WebConfig.java` | LoginInterceptor, resource handlers |
| `src/main/java/com/ncu/pp/interceptor/LoginInterceptor.java` | Session auth check |
| `src/main/resources/templates/chat.html` | Main SPA page with inline CSS |
| `src/main/resources/static/css/style.css` | Global styles, theme variables |
| `docs/superpowers/specs/2026-05-16-pp-chat-design.md` | Original design spec |
| `reports/` | Course deliverables (10 markdown docs) |

---

## Development Guidelines

1. **No frontend build tools** — All JS/CSS loaded directly via Thymeleaf
2. **Modify `chat-*.js` modules** — Not the legacy `chat.js`
3. **Service layer for business logic** — Controllers should be thin
4. **Batch queries over loops** — Avoid N+1 with `findAllById`, `GROUP BY`
5. **Use generation counter for async views** — Prevent race conditions in `switchView()`
6. **Run `compile` and `test` after backend changes**
7. **Upload directory** (`uploads/`) is gitignored; use `.gitkeep` to preserve structure
8. **ApiResponse<T>** wrapper for all REST responses; global exception handler returns consistent error format
9. **Commit messages** — Use Conventional Commits-style prefixes with Chinese descriptions, e.g. `feat: 完善后台管理功能`, `fix: 删除账号后失效旧会话`, `docs: 更新项目说明`, `test: 补充登录锁定测试`. Do not push directly to `main`.

---

## Known Issues & Solutions

| Issue | Solution |
|-------|----------|
| STOMP buffer limit (64KB) blocks voice messages | Increased to 1MB in `WebSocketConfig.java` + `application.yml` |
| WebSocket messages not delivered to receiver | Set Principal in `DefaultHandshakeHandler.determineUser()` |
| Rapid view switching mixes content | Generation counter pattern in `switchView()` |
| N+1 queries in message lists | Batch load users with `findAllById()`, build Map |
| Deleting group leaves orphaned groupId | Move friends to ungrouped before deleting group |
| Filenames with spaces break URLs | Sanitize with regex replacement |
| Password leaked in API responses | Added `@JsonIgnore` on `User.password` |

---

## Testing

- 56 unit tests across UserService, FriendService, ChatService, GroupService
- Integration tests for ChatRestController, ProfileRestController
- Test coverage ~78%
- Run with `./mvnw test`

---

## Course Deliverables

Located in `reports/`:
1. `1.项目访问地址.md` — Deployment URL (to be filled)
2. `2.项目代码地址.md` — Git repo URL (to be filled)
3. `3.需求分析文档.md` — Requirements analysis
4. `4.设计文档.md` — System design
5. `5.数据库设计文档.md` — Database schema
6. `6.接口设计文档.md` — API documentation
7. `7.项目部署文档.md` — Deployment guide
8. `8.测试用例.md` — Test cases
9. `9.交流记录分工记录.md` — Team communication log
10. `10.完整实验报告.md` — Complete lab report

Team members: 郭峰 (lead), 陈弦, 齐睿, 沈越, 宋佳伟, 李子旸
