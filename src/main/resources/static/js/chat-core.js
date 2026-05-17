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

let stompClient = null;
let currentView = 'chat';      // 当前左侧选中的视图
let currentChat = null;         // 当前打开的聊天 { id, name, isGroup }
let friendsData = null;         // 缓存好友数据
let groupsData = null;          // 缓存群数据
let groupSubscriptions = {};    // 已订阅的群 STOMP
let isLoadingChat = false;      // 防止重复加载聊天

// ========== 初始化 ==========
async function init() {
    bindGlobalEvents();
    initResizer();
    initParticles();
    await loadChatView();
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
                if (!keyword) loadChatView();
                else searchUsersForChat(keyword);
            } else if (currentView === 'friends') {
                if (!keyword) loadFriendsView();
                else searchUsersForFriend(keyword);
            } else if (currentView === 'groups') {
                if (!keyword) loadGroupsView();
            }
        });
    }
}

// ========== 视图切换 ==========

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.im-nav-btn[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    const searchInput = document.getElementById('panelSearchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = { chat: '搜索联系人...', friends: '搜索用户...', groups: '搜索群聊...', profile: '' }[view] || '搜索...';
    }
    switch (view) {
        case 'chat': loadChatView(); break;
        case 'friends': loadFriendsView(); break;
        case 'groups': loadGroupsView(); break;
        case 'profile': loadProfileView(); break;
    }
}
let wsConnected = false;

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
        // 立即显示自己的消息（乐观更新）
        appendChatMessage({ ...message, createdAt: new Date().toISOString() });
        stompClient.send(
            currentChat.isGroup ? '/app/chat/group' : '/app/chat/private',
            {},
            JSON.stringify(message)
        );
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
