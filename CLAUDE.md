# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PP Chat** is a Spring Boot 4.0.6 + Java 21 course project for Nanchang University's Web Programming (Java EE) class. It is a web-based chat system with user auth, friend management, private chat, group chat, voice messages, notifications, and an admin backend.

### Stack
- **Backend:** Spring Boot, Spring Data JPA / Hibernate, MySQL
- **Realtime:** WebSocket STOMP + SockJS
- **Frontend:** Thymeleaf + vanilla JavaScript SPA modules
- **Security:** Session-based auth with custom interceptors, BCrypt passwords
- **Testing:** JUnit 5, Mockito, Spring Boot Test

## Common Commands

```bash
# Compile
./mvnw compile

# Run all tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=FriendServiceTest

# Start the app locally
./mvnw spring-boot:run

# Build the jar without tests
./mvnw clean package -DskipTests

# Check syntax for a frontend module when editing JS
node --check src/main/resources/static/js/chat-view.js
```

On Windows, use `mvnw.cmd` instead of `./mvnw` when needed.

## Big-Picture Architecture

### Backend shape
The app follows a conventional Spring layering:
- `controller/page/` renders Thymeleaf pages
- `controller/rest/` exposes JSON APIs wrapped in `ApiResponse<T>`
- `controller/websocket/ChatController.java` handles STOMP chat messages
- `service/` contains business logic
- `repository/` contains JPA access
- `entity/` models the chat domain

Authentication is **not** implemented with a Spring Security filter chain. The app uses session-based auth:
- login stores `currentUser` in session
- `LoginInterceptor` protects normal user pages and APIs
- admin routes use a separate admin flow and interceptor

### Frontend shape
The main user experience is the `chat.html` single-page shell backed by modular JS files under `src/main/resources/static/js/`.

Important modules:
- `chat-core.js` — global state, view switching, WebSocket init, shared utilities
- `chat-view.js` — conversation UI, message rendering, voice recording, history search/export
- `chat-friends.js` — friends, requests, notification-related friend actions
- `chat-groups.js` — groups, group detail, invitations, announcements
- `chat-profile.js` — profile editing
- `chat-ui.js` — modal/drawer/resizer/toast UI behavior
- `theme.js` — light/dark/system theme switching

Do **not** edit legacy `chat.js`; `chat.html` uses the split `chat-*.js` modules.

### Realtime messaging model
WebSocket/STOMP is central to the app:
- endpoint: `/ws`
- app prefix: `/app`
- private messages: send to `/app/chat/private`, subscribe on `/user/queue/private`
- group messages: send to `/app/chat/group`, subscribe on `/topic/group/{groupId}`

The WebSocket handshake checks the existing HTTP session and sets the STOMP `Principal` to the user ID string. This is required for private message delivery to work.

### Data model and domain rules
The main schema centers on users, friends, groups, and messages.

Important domain facts:
- friend relationships are stored **bidirectionally** in `pp_friend`
- group invitations and join requests share `pp_group_invitation`, distinguished by `type`
- private messages store a `status` field used for unread/read handling
- voice messages are persisted as files under `uploads/audio/`; the database stores only the URL
- JPA runs with `ddl-auto: update`, so entity changes can affect schema automatically

There are 10 core tables documented in `README.md` / `reports/5.数据库设计文档.md`, including both `pp_user` and `pp_admin`.

## Patterns That Matter Here

- Keep controller code thin; business rules belong in services.
- Prefer batch loading patterns already used in services to avoid N+1 queries.
- Preserve the generation-counter style used in frontend view switching to avoid stale async updates.
- When editing message flows, check both REST history loading and WebSocket delivery paths.
- When editing voice messages, follow the existing pipeline: browser recording → Base64 transfer → `FileService` save → URL persisted in message record.

## Important Files

- `src/main/resources/application.yml` — shared config including upload path and WebSocket buffer sizes
- `src/main/resources/application-prod.yml` — production overrides
- `src/main/java/com/ncu/pp/config/WebSocketConfig.java` — STOMP endpoint, handshake auth, message limits
- `src/main/java/com/ncu/pp/config/WebConfig.java` — interceptor wiring and resource handlers
- `src/main/java/com/ncu/pp/interceptor/LoginInterceptor.java` — user session gate
- `src/main/resources/templates/chat.html` — main SPA shell
- `src/main/resources/templates/admin.html` — admin UI
- `src/main/resources/static/css/style.css` — global styling and theme variables

## Reports and Deliverables

The repository includes course deliverables under `reports/`.
- `reports/1` through `reports/10` are the team submission documents
- `reports/self/` contains individual-report materials, screenshots, and reusable心得 content

When updating reports, prefer aligning claims with the current codebase and deployment state rather than expanding the docs speculatively.

## Notes From README / Current Repo State

- The project is intended to be runnable locally with MySQL and deployable behind Nginx with HTTPS.
- The online deployment and repo URL are documented in `README.md`.
- The app includes a separate admin backend in addition to the user-facing chat flow.
