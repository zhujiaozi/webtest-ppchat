/** PP Chat — Core */
/**
 * PP Chat — QQ 桌面端风格 SPA
 * 四个视图: chat / friends / groups / profile
 */
const APP = document.querySelector('.im-app');
if (!APP) {
    console.error('[PP Chat] .im-app element not found');
}
const userId = APP ? parseInt(APP.dataset.userId) : 0;
const userName = APP ? (APP.dataset.userName || 'User') : 'User';

if (!userId) {
    console.warn('[PP Chat] User not logged in, redirecting to login...');
    window.location.href = '/login';
}

// 全局 fetch 封装：未登录(401)时自动跳转登录页
const _originalFetch = window.fetch;
window.fetch = async function(...args) {
    const res = await _originalFetch.apply(this, args);
    if (res.status === 401) {
        window.location.href = '/login';
        return new Promise(() => {});
    }
    return res;
};

async function parseApiResponse(res) {
    const payload = await res.json();
    if (payload && typeof payload === 'object' &&
        'code' in payload && 'message' in payload && 'data' in payload) {
        if (payload.code >= 400) throw new Error(payload.message || '请求失败');
        return payload.data;
    }
    return payload;
}

let stompClient = null;
let currentView = 'chat';      // 当前左侧选中的视图
let currentChat = null;         // 当前打开的聊天 { id, name, isGroup }
let friendsData = null;         // 缓存好友数据
let groupsData = null;          // 缓存群数据
let chatListData = [];          // 聊天列表数据（用于过滤）
let friendListData = [];        // 好友列表数据（用于过滤）
let friendRequestData = [];     // 好友申请数据（用于过滤）
let groupSubscriptions = {};    // 已订阅的群 STOMP
let isLoadingChat = false;      // 防止重复加载聊天

// ========== 初始化 ==========
async function init() {
    bindGlobalEvents();
    initResizer();
    initParticles();
    await loadChatView(viewGeneration);
    connectWebSocket();
}

// 粒子效果

function bindGlobalEvents() {
    const searchInput = document.getElementById('panelSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        searchInput.addEventListener('input', function () {
            const keyword = this.value.trim();
            if (currentView === 'chat') {
                filterChatList(keyword);
            } else if (currentView === 'friends') {
                filterFriendsList(keyword);
            } else if (currentView === 'groups') {
                filterGroupsList(keyword);
            } else if (currentView === 'notifications') {
                filterNotifications(keyword);
            }
        });
    }
}

// ========== 视图切换 ==========

function switchView(view) {
    currentView = view;
    const gen = ++viewGeneration;
    document.querySelectorAll('.im-nav-btn[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    const searchInput = document.getElementById('panelSearchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = { chat: '搜索会话...', friends: '搜索好友...', groups: '搜索群聊...', notifications: '搜索通知...', profile: '' }[view] || '搜索...';
    }
    switch (view) {
        case 'chat': loadChatView(gen); break;
        case 'friends': loadFriendsView(gen); break;
        case 'groups': loadGroupsView(gen); break;
        case 'notifications': loadNotificationsView(gen); break;
        case 'profile': loadProfileView(gen); break;
    }
}
let wsConnected = false;
let viewGeneration = 0;    // 防止异步视图加载竞争

function updateWsStatus() {
    const indicator = document.getElementById('ws-status');
    if (!indicator) return;
    indicator.className = 'ws-status-indicator' + (wsConnected ? ' connected' : ' connecting');
    indicator.title = wsConnected ? 'WebSocket 已连接' : 'WebSocket 连接中...';
}

function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;
    updateWsStatus();
    stompClient.connect({}, () => {
        wsConnected = true;
        updateWsStatus();
        console.log('[WS] 已连接');
        stompClient.subscribe('/user/queue/private', (msg) => {
            const message = JSON.parse(msg.body);
            // 过滤自己发送的消息（避免重复显示）
            if (message.senderId == userId) return;
            if (currentChat && !currentChat.isGroup &&
                (message.senderId == currentChat.id || message.receiverId == currentChat.id)) {
                appendChatMessage(message);
            }
        });
    }, (error) => {
        wsConnected = false;
        updateWsStatus();
        console.error('[WS] 连接失败:', error);
        setTimeout(connectWebSocket, 3000);
    });
}

// ========== 发送消息 ==========
let lastSendTime = 0;
const SEND_DEBOUNCE = 300; // 300ms 防抖

function sendMessage() {
    const now = Date.now();
    if (now - lastSendTime < SEND_DEBOUNCE) return; // 防抖：300ms 内只能发送一次
    lastSendTime = now;

    const input = document.getElementById('imMsgInput');
    if (!input) return;
    const content = input.value.trim();
    if (!content || !currentChat) return;
    if (!stompClient || !wsConnected) {
        showToast('正在连接服务器，请稍后重试...', 'error');
        return;
    }
    const message = {
        senderId: userId,
        sender: userName,
        receiverId: currentChat.isGroup ? null : currentChat.id,
        receiver: currentChat.id.toString(),
        content: content,
        msgType: 0,
        isGroup: currentChat.isGroup
    };
    try {
        // 立即显示自己的消息（乐观更新，带发送状态）
        const msgId = 'msg-' + Date.now();
        appendChatMessage({ ...message, createdAt: new Date().toISOString(), _msgId: msgId, _status: 'sending' });
        stompClient.send(
            currentChat.isGroup ? '/app/chat/group' : '/app/chat/private',
            {},
            JSON.stringify(message)
        );
        // 3秒后清除发送状态
        setTimeout(() => {
            const el = document.getElementById(msgId);
            if (el) {
                const indicator = el.querySelector('.msg-status-indicator');
                if (indicator) { indicator.innerHTML = ''; indicator.className = ''; }
            }
        }, 3000);
        input.value = '';
        input.style.height = 'auto';
        input.focus();
    } catch (e) {
        console.error('[WS] 发送失败:', e);
        showToast('发送失败，请重试', 'error');
    }
}

// ========== 工具函数 ==========

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function formatTime(t) {
    if (!t) return '';
    const d = new Date(t);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function initial(str) { return str ? str.charAt(0).toUpperCase() : 'U'; }

// 根据字符串生成渐变色

function avatarGradient(str) {
    const colors = [
        ['#5b8def','#41d3bd'], ['#f39c12','#e74c3c'], ['#9b59b6','#3498db'],
        ['#1abc9c','#2ecc71'], ['#e67e22','#f1c40f'], ['#e74c3c','#c0392b'],
        ['#2ecc71','#1abc9c'], ['#3498db','#9b59b6'], ['#f1c40f','#e67e22'],
    ];
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const pair = colors[Math.abs(hash) % colors.length];
    return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

// ============================================================
//  聊天视图
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function checkFriendRequestBadge() {
    try {
        const res = await fetch('/api/friends/requests');
        const requests = await parseApiResponse(res);
        const navBtn = document.querySelector('.im-nav-btn[data-view="notifications"]');
        if (!navBtn) return;
        const existing = navBtn.querySelector('.nav-notif-badge');
        if (requests && requests.length > 0) {
            if (!existing) {
                const badge = document.createElement('span');
                badge.className = 'nav-notif-badge';
                badge.style.cssText = 'position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:var(--danger);border:2px solid var(--bg-nav)';
                navBtn.appendChild(badge);
            }
        } else {
            if (existing) existing.remove();
        }
    } catch (e) {}
}

async function searchUsersForFriendFromRequests(keyword) {
    const results = document.getElementById('addFriendResults');
    if (!results) return;
    results.innerHTML = '<p style="color:var(--text-tertiary);font-size:13px">搜索中...</p>';
    try {
        const res = await fetch(`/api/friends/search?keyword=${encodeURIComponent(keyword)}`);
        const users = await parseApiResponse(res);
        if (users.length === 0) { results.innerHTML = '<p style="color:var(--text-tertiary);font-size:13px">未找到用户</p>'; return; }
        results.innerHTML = '';
        for (const u of users) {
            const name = u.nickname || u.username;
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border-light)';
            div.innerHTML = `<div style="width:36px;height:36px;border-radius:6px;flex-shrink:0;background:${avatarGradient(name)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px">${initial(name)}</div>
                <div style="flex:1"><div style="font-size:13px;font-weight:500">${escapeHtml(name)}</div><div style="font-size:11px;color:var(--text-tertiary)">@${escapeHtml(u.username)}</div></div>
                <button class="btn btn-primary btn-sm" onclick="sendFriendRequest(${u.id})">加好友</button>`;
            results.appendChild(div);
        }
    } catch (e) { results.innerHTML = '<p style="color:var(--danger);font-size:13px">搜索失败</p>'; }
}
