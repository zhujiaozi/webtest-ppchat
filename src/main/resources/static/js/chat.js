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

let stompClient = null;
let currentView = 'chat';      // 当前左侧选中的视图
let currentChat = null;         // 当前打开的聊天 { id, name, isGroup }
let friendsData = null;         // 缓存好友数据
let groupsData = null;          // 缓存群数据
let groupSubscriptions = {};    // 已订阅的群 STOMP

// ========== 初始化 ==========
async function init() {
    bindGlobalEvents();
    initResizer();
    initParticles();
    await loadChatView();
    connectWebSocket();
}

// 粒子效果
function initParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;
    const colors = ['rgba(91,141,239,.3)', 'rgba(65,211,189,.3)', 'rgba(155,89,182,.2)', 'rgba(241,196,15,.2)'];
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 6 + 2;
        p.style.cssText = `
            width:${size}px; height:${size}px;
            left:${Math.random()*100}%;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            animation-duration:${Math.random()*15+10}s;
            animation-delay:${Math.random()*10}s;
        `;
        container.appendChild(p);
    }
}

// 可拖动分割线
function initResizer() {
    const resizer = document.getElementById('imResizer');
    const panel = document.getElementById('imPanel');
    if (!resizer || !panel) return;
    let isDragging = false;
    const MIN_WIDTH = 200, MAX_WIDTH = 400;

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const sidebarWidth = 72; // im-sidebar width
        const newWidth = e.clientX - sidebarWidth;
        if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
            panel.style.width = newWidth + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

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
async function loadChatView() {
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    // 加载好友列表作为会话
    try {
        const res = await fetch('/api/friends');
        const data = await res.json();
        friendsData = data;
        const friends = data.friends || [];
        for (const f of friends) {
            const name = f.remark || ('好友 #' + f.friendId);
            // 获取未读消息数
            let unreadCount = 0;
            try {
                const unreadRes = await fetch(`/api/chat/private/${f.friendId}/unread`);
                unreadCount = await unreadRes.json();
            } catch (e) {}
            const div = document.createElement('div');
            div.className = 'conv-item' + (currentChat && !currentChat.isGroup && currentChat.id == f.friendId ? ' active' : '');
            div.innerHTML = `<div class="conv-avatar-ph" style="background:${avatarGradient(name)}">${initial(name)}</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(name)}</div>
                <div class="conv-preview">点击开始聊天</div></div>
                ${unreadCount > 0 ? `<div class="conv-badge">${unreadCount}</div>` : ''}`;
            div.onclick = () => openChat(f.friendId, name, false);
            panel.appendChild(div);
        }
    } catch (e) { console.error('加载好友失败', e); }
    // 加载群聊
    try {
        const res = await fetch('/api/groups');
        const groups = await res.json();
        groupsData = groups;
        for (const g of groups) {
            const div = document.createElement('div');
            div.className = 'conv-item' + (currentChat && currentChat.isGroup && currentChat.id == g.id ? ' active' : '');
            div.innerHTML = `<div class="conv-avatar-ph" style="background:#4a90d9">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="color:#fff"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(g.name)}</div>
                <div class="conv-preview">${escapeHtml(g.notice || '暂无公告')}</div></div>`;
            div.onclick = () => openChat(g.id, g.name, true);
            panel.appendChild(div);
        }
    } catch (e) { console.error('加载群聊失败', e); }
}

async function openChat(id, name, isGroup) {
    if (isLoadingChat) return;
    isLoadingChat = true;
    try {
        await _openChatImpl(id, name, isGroup);
    } finally {
        isLoadingChat = false;
    }
}

async function _openChatImpl(id, name, isGroup) {
    currentChat = { id, name, isGroup };
    // 高亮
    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    // 找到对应的 conv-item 并高亮
    const items = document.querySelectorAll('.conv-item');
    items.forEach(el => {
        const body = el.querySelector('.conv-name');
        if (body && body.textContent === name) el.classList.add('active');
    });

    const content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="im-chat-header">
            <span class="ch-title">${escapeHtml(name)}</span>
            <div class="ch-actions">
                <button onclick="searchChatHistory()" title="搜索聊天记录">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </button>
                ${!isGroup ? `<button onclick="exportChat()" title="导出聊天记录">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>` : ''}
                <button onclick="toggleInfoDrawer()" title="更多信息">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
            </div>
        </div>
        <div class="im-messages" id="imMessages"></div>
        <div class="im-input-area">
            <div class="im-input-row">
                <textarea id="imMsgInput" placeholder="输入消息... (Enter发送)" rows="1"></textarea>
                <button id="imVoiceBtn" class="voice-btn" title="点击录音（最长10秒）">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
                <button class="send-btn" onclick="sendMessage()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="margin-right:4px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    发送
                </button>
            </div>
        </div>`;

    document.getElementById('imMsgInput').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    // textarea 自动增高
    document.getElementById('imMsgInput').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
    initVoiceBtn();
    // 绑定发送按钮（防止重复绑定）
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) {
        sendBtn.onclick = sendMessage;
    }

    // 加载消息
    const box = document.getElementById('imMessages');
    if (!box) {
        console.error('[openChat] imMessages element not found');
        return;
    }
    box.innerHTML = ''; // 清空旧消息
    if (!isGroup) {
        try {
            const res = await fetch(`/api/chat/private/${id}`);
            const msgs = await res.json();
            console.log(`[openChat] Loaded ${msgs.length} private messages for user ${id}`);
            msgs.forEach(m => appendChatMessage({ senderId: m.senderId, content: m.content, msgType: m.msgType, audioData: m.audioData, time: m.createdAt }));
            fetch(`/api/chat/private/${id}/read`, { method: 'POST' });
        } catch (e) { console.error('[openChat] Failed to load private messages:', e); }
    } else {
        try {
            const res = await fetch(`/api/groups/${id}/messages`);
            const msgs = await res.json();
            console.log(`[openChat] Loaded ${msgs.length} group messages for group ${id}`);
            msgs.forEach(m => appendChatMessage({ senderId: m.senderId, sender: m.sender, content: m.content, msgType: m.msgType, audioData: m.audioData, time: m.createdAt }));
        } catch (e) { console.error('[openChat] Failed to load group messages:', e); }
        if (!groupSubscriptions[id] && stompClient && wsConnected) {
            stompClient.subscribe(`/topic/group/${id}`, (msg) => {
                const message = JSON.parse(msg.body);
                if (currentChat && currentChat.isGroup && currentChat.id == id) {
                    appendChatMessage(message);
                }
            });
            groupSubscriptions[id] = true;
        }
    }
    box.scrollTop = box.scrollHeight;
}

function appendChatMessage(msg) {
    const box = document.getElementById('imMessages');
    if (!box) return;
    const isMine = msg.senderId == userId;
    const div = document.createElement('div');
    div.className = 'im-msg-row' + (isMine ? ' self' : '');
    const senderName = msg.sender || (isMine ? userName : '');
    const senderHtml = (currentChat && currentChat.isGroup && !isMine && senderName)
        ? `<div class="im-msg-sender">${escapeHtml(senderName)}</div>` : '';
    if (msg.msgType === 1 && msg.audioData) {
        const durationMatch = (msg.content || '').match(/(\d+)s/);
        const durationText = durationMatch ? ` ${durationMatch[1]}s` : '';
        div.innerHTML = `<div class="msg-av" style="background:${avatarGradient(isMine ? userName : senderName)}">${isMine ? initial(userName) : initial(senderName || '?')}</div>
            <div>${senderHtml}<div class="im-msg-bubble"><button onclick="playAudio('${msg.audioData}')" style="background:none;border:none;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:4px">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg> 播放语音${durationText}
            </button></div></div>`;
    } else {
        div.innerHTML = `<div class="msg-av" style="background:${avatarGradient(isMine ? userName : senderName)}">${isMine ? initial(userName) : initial(senderName || '?')}</div>
            <div>${senderHtml}<div class="im-msg-bubble">${escapeHtml(msg.content || '')}</div></div>`;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function playAudio(base64) { new Audio(base64).play(); }

// ========== 信息抽屉 ==========
function toggleInfoDrawer(forceState) {
    const drawer = document.getElementById('infoDrawer');
    if (!drawer) return;
    const shouldShow = forceState !== undefined ? forceState : drawer.classList.contains('hidden');
    if (shouldShow) {
        drawer.classList.remove('hidden');
        loadDrawerContent();
    } else {
        drawer.classList.add('hidden');
    }
}

async function loadDrawerContent() {
    if (!currentChat) return;
    const title = document.getElementById('drawerTitle');
    const body = document.getElementById('drawerBody');
    if (currentChat.isGroup) {
        title.textContent = '群信息';
        body.innerHTML = '<p style="color:var(--text-tertiary);text-align:center">加载中...</p>';
        try {
            const res = await fetch(`/api/groups/${currentChat.id}`);
            const data = await res.json();
            const group = data.group;
            const members = data.members || [];
            body.innerHTML = `
                <div class="drawer-user-info">
                    <div class="du-avatar" style="background:#4a90d9">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    </div>
                    <div class="du-name">${escapeHtml(group.name)}</div>
                    <div class="du-id">群ID: ${group.id}</div>
                </div>
                ${group.notice ? `<div class="drawer-section">
                    <div class="drawer-section-title">群公告</div>
                    <div style="font-size:13px;color:var(--text-secondary);padding:10px;background:var(--bg-primary);border-radius:8px">${escapeHtml(group.notice)}</div>
                </div>` : ''}
                <div class="drawer-section">
                    <div class="drawer-section-title">群成员 (${members.length})</div>
                    <div class="drawer-member-list">
                        ${members.map(m => `<div class="drawer-member">
                            <div class="dm-av">${initial(m.nickname || 'U')}</div>
                            <span class="dm-name">${escapeHtml(m.nickname || '用户')}</span>
                            ${m.role == 2 ? '<span class="dm-role">群主</span>' : m.role == 1 ? '<span class="dm-role">管理</span>' : ''}
                        </div>`).join('')}
                    </div>
                </div>
                <div class="drawer-actions">
                    <button class="drawer-action-btn" onclick="showGroupDetail(${currentChat.id});switchView('groups')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        查看群详情
                    </button>
                </div>`;
        } catch (e) { body.innerHTML = '<p style="color:var(--danger)">加载失败</p>'; }
    } else {
        title.textContent = '好友信息';
        const name = currentChat.name;
        body.innerHTML = `
            <div class="drawer-user-info">
                <div class="du-avatar">${initial(name)}</div>
                <div class="du-name">${escapeHtml(name)}</div>
                <div class="du-id">ID: ${currentChat.id}</div>
            </div>
            <div class="drawer-actions">
                <button class="drawer-action-btn" onclick="setFriendRemark(${currentChat.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    设置备注
                </button>
                <button class="drawer-action-btn" onclick="moveFriend(${currentChat.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
                    移动分组
                </button>
                <button class="drawer-action-btn" onclick="exportChat()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    导出聊天记录
                </button>
                <button class="drawer-action-btn danger" onclick="deleteFriend(${currentChat.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    删除好友
                </button>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function exportChat() {
    if (!currentChat || currentChat.isGroup) return;
    window.open(`/api/chat/private/${currentChat.id}/export`);
}

// ========== 自定义模态框 ==========
function showModal(title, bodyHtml, footerHtml) {
    const modal = document.getElementById('imModal');
    if (!modal) return;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalFooter').innerHTML = footerHtml || '';
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('imModal');
    if (modal) modal.classList.add('hidden');
}

function showInputDialog(title, placeholder, onConfirm) {
    showModal(title, `
        <input type="text" id="modalInput" class="input" placeholder="${placeholder}" style="width:100%;font-size:14px">
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="confirmInputDialog()">确定</button>
    `);
    window._modalCallback = onConfirm;
    setTimeout(() => document.getElementById('modalInput')?.focus(), 100);
}

function confirmInputDialog() {
    const input = document.getElementById('modalInput');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    closeModal();
    if (window._modalCallback) {
        window._modalCallback(value);
        window._modalCallback = null;
    }
}

function searchChatHistory() {
    if (!currentChat) return;
    showInputDialog('搜索聊天记录', '输入搜索关键词...', (keyword) => {
        const url = currentChat.isGroup
            ? `/api/groups/${currentChat.id}/messages/search?keyword=${encodeURIComponent(keyword)}`
            : `/api/chat/private/${currentChat.id}/search?keyword=${encodeURIComponent(keyword)}`;
        fetch(url).then(r => r.json()).then(msgs => {
            const box = document.getElementById('imMessages');
            box.innerHTML = '';
            if (msgs.length === 0) {
                box.innerHTML = '<div class="im-empty"><p>未找到匹配的消息</p></div>';
            }
            msgs.forEach(m => appendChatMessage({ senderId: m.senderId, sender: m.sender, content: m.content, msgType: m.msgType, audioData: m.audioData, time: m.createdAt }));
        });
    });
}

// 语音录制（点击开始/停止，最长 10 秒，记录时长）
function initVoiceBtn() {
    const btn = document.getElementById('imVoiceBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    let recorder, chunks = [], recording = false, countdownTimer = null, secondsLeft = 0, startTime = 0;
    const MAX_SECONDS = 10;

    const micIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;

    function updateBtnTime() {
        btn.innerHTML = `<span style="font-size:11px;font-weight:700;color:var(--danger)">${secondsLeft}</span>`;
    }

    async function startRecording() {
        if (!stompClient || !wsConnected) {
            showToast('正在连接服务器，请稍后...', 'error');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            chunks = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                clearInterval(countdownTimer);
                const duration = Math.round((Date.now() - startTime) / 1000);
                if (duration < 1) {
                    showToast('录音时间太短', 'error');
                    stream.getTracks().forEach(t => t.stop());
                    btn.classList.remove('recording');
                    btn.innerHTML = micIcon;
                    recording = false;
                    return;
                }
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (!currentChat) return;
                    // 立即显示语音消息（乐观更新）
                    appendChatMessage({
                        senderId: userId, sender: userName,
                        content: `[语音消息 ${duration}s]`,
                        msgType: 1, audioData: reader.result,
                        createdAt: new Date().toISOString()
                    });
                    stompClient.send(
                        currentChat.isGroup ? '/app/chat/group' : '/app/chat/private', {},
                        JSON.stringify({
                            senderId: userId, sender: userName,
                            receiverId: currentChat.isGroup ? null : currentChat.id,
                            receiver: currentChat.id.toString(),
                            content: `[语音消息 ${duration}s]`,
                            msgType: 1, audioData: reader.result,
                            isGroup: currentChat.isGroup
                        })
                    );
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
                btn.classList.remove('recording');
                btn.innerHTML = micIcon;
                recording = false;
            };
            recorder.start();
            recording = true;
            startTime = Date.now();
            btn.classList.add('recording');
            secondsLeft = MAX_SECONDS;
            updateBtnTime();
            countdownTimer = setInterval(() => {
                secondsLeft--;
                if (secondsLeft <= 0) {
                    recorder.stop();
                } else {
                    updateBtnTime();
                }
            }, 1000);
        } catch (e) {
            showToast('无法访问麦克风，请检查权限', 'error');
        }
    }

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (recording) {
            recorder.stop();
        } else {
            startRecording();
        }
    });
}

// 搜索用户（聊天视图）
async function searchUsersForChat(keyword) {
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    try {
        const res = await fetch(`/api/friends/search?keyword=${encodeURIComponent(keyword)}`);
        const users = await res.json();
        users.forEach(u => {
            const name = u.nickname || u.username;
            const div = document.createElement('div');
            div.className = 'conv-item';
            div.innerHTML = `<div class="conv-avatar-ph" style="background:${avatarGradient(name)}">${initial(name)}</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(name)}</div>
                <div class="conv-preview">@${escapeHtml(u.username)}</div></div>`;
            div.onclick = () => openChat(u.id, name, false);
            panel.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

// ============================================================
//  好友视图
// ============================================================
async function loadFriendsView() {
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    try {
        const res = await fetch('/api/friends');
        const data = await res.json();
        friendsData = data;
        const groups = data.groups || [];
        const friends = data.friends || [];
        // 好友申请按钮
        const reqBtn = document.createElement('button');
        reqBtn.className = 'panel-btn';
        reqBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> 好友申请`;
        reqBtn.onclick = () => showFriendRequests();
        panel.appendChild(reqBtn);
        // 搜索结果区
        const searchArea = document.createElement('div');
        searchArea.id = 'friendSearchArea';
        panel.appendChild(searchArea);
        // 按分组显示好友
        for (const g of groups) {
            const groupFriends = friends.filter(f => f.groupId === g.id);
            const title = document.createElement('div');
            title.className = 'im-panel-section-title';
            title.textContent = `${g.name} (${groupFriends.length})`;
            panel.appendChild(title);
            for (const f of groupFriends) {
                const name = f.remark || ('好友 #' + f.friendId);
                const div = document.createElement('div');
                div.className = 'friend-item';
                div.innerHTML = `<div class="f-avatar" style="background:${avatarGradient(name)}">${initial(name)}</div>
                    <div class="f-name">${escapeHtml(name)}</div>`;
                div.onclick = () => showFriendDetail(f);
                panel.appendChild(div);
            }
        }
    } catch (e) { console.error(e); }
}

function showFriendDetail(f) {
    const name = f.remark || ('好友 #' + f.friendId);
    const content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="im-chat-header">
            <span class="ch-title">${escapeHtml(name)}</span>
            <div class="ch-actions"></div>
        </div>
        <div class="im-detail">
            <div class="im-detail-card">
                <div class="profile-avatar-area">
                    <div class="av">${initial(name)}</div>
                    <div style="font-size:16px;font-weight:600">${escapeHtml(name)}</div>
                    <div style="font-size:12px;color:var(--text-tertiary)">ID: ${f.friendId}</div>
                </div>
                <div style="display:flex;gap:8px;justify-content:center;margin-bottom:20px">
                    <button class="btn btn-primary" onclick="openChat(${f.friendId}, '${escapeHtml(name)}', false);switchView('chat')">发消息</button>
                    <button class="btn btn-ghost" onclick="setFriendRemark(${f.friendId})">设置备注</button>
                    <button class="btn btn-ghost" onclick="moveFriend(${f.friendId})">移动分组</button>
                    <button class="btn btn-danger" onclick="deleteFriend(${f.friendId})">删除</button>
                </div>
            </div>
        </div>`;
}

async function showFriendRequests() {
    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="im-chat-header"><span class="ch-title">好友申请</span></div>
        <div class="im-detail"><div class="im-detail-card" id="requestList"><p style="color:var(--text-tertiary)">加载中...</p></div></div>`;
    try {
        const res = await fetch('/api/friends/requests');
        const requests = await res.json();
        const list = document.getElementById('requestList');
        if (requests.length === 0) { list.innerHTML = '<p style="color:var(--text-tertiary);text-align:center">暂无待处理的好友申请</p>'; return; }
        list.innerHTML = '';
        for (const r of requests) {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-light)';
            const reqName = '用户 #' + r.fromUserId;
            div.innerHTML = `<div class="f-avatar" style="background:${avatarGradient(reqName)}">U</div>
                <div style="flex:1"><div style="font-size:14px;font-weight:500">用户 #${r.fromUserId}</div>
                <div style="font-size:12px;color:var(--text-tertiary)">${escapeHtml(r.message || '请求加你为好友')}</div></div>
                <button class="btn btn-primary btn-sm" onclick="acceptRequest(${r.id})">同意</button>
                <button class="btn btn-ghost btn-sm" onclick="rejectRequest(${r.id})">拒绝</button>`;
            list.appendChild(div);
        }
    } catch (e) { console.error(e); }
}

async function acceptRequest(id) {
    await fetch(`/api/friends/requests/${id}/accept`, { method: 'POST' });
    showToast('已同意好友申请');
    showFriendRequests();
    loadFriendsView();
}
async function rejectRequest(id) {
    await fetch(`/api/friends/requests/${id}/reject`, { method: 'POST' });
    showToast('已拒绝');
    showFriendRequests();
}
async function deleteFriend(friendId) {
    if (!confirm('确定删除该好友？')) return;
    await fetch(`/api/friends/${friendId}`, { method: 'DELETE' });
    showToast('已删除');
    loadFriendsView();
    document.getElementById('contentArea').innerHTML = `<div class="im-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="48" height="48" style="opacity:0.25;margin-bottom:12px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>选择一个好友查看详情</p></div>`;
}
async function setFriendRemark(friendId) {
    showInputDialog('设置备注', '输入备注名...', async (remark) => {
        await fetch(`/api/friends/${friendId}/remark`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remark }) });
        showToast('备注已更新');
        loadFriendsView();
    });
}
async function moveFriend(friendId) {
    showInputDialog('移动分组', '输入目标分组ID...', async (groupId) => {
        await fetch(`/api/friends/${friendId}/move`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: parseInt(groupId) }) });
        showToast('已移动');
        loadFriendsView();
    });
}

async function searchUsersForFriend(keyword) {
    const area = document.getElementById('friendSearchArea');
    if (!area) return;
    area.innerHTML = '';
    try {
        const res = await fetch(`/api/friends/search?keyword=${encodeURIComponent(keyword)}`);
        const users = await res.json();
        if (users.length === 0) { area.innerHTML = '<div style="padding:12px;color:var(--text-tertiary);font-size:13px">未找到用户</div>'; return; }
        for (const u of users) {
            const name = u.nickname || u.username;
            const div = document.createElement('div');
            div.className = 'search-user-item';
            div.innerHTML = `<div class="su-av">${initial(name)}</div>
                <div class="su-info"><div class="su-name">${escapeHtml(name)}</div><div class="su-username">@${escapeHtml(u.username)}</div></div>
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();sendFriendRequest(${u.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" style="margin-right:2px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    加好友
                </button>`;
            area.appendChild(div);
        }
    } catch (e) { console.error(e); }
}
async function sendFriendRequest(toUserId) {
    showInputDialog('发送好友申请', '验证消息（可留空）...', async (message) => {
        const res = await fetch('/api/friends/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId, message: message || '' }) });
        const data = await res.json();
        if (data.success) showToast('好友申请已发送');
        else showToast(data.error || '发送失败', 'error');
    });
}

// ============================================================
//  群聊视图
// ============================================================
async function loadGroupsView() {
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    // 创建群按钮
    const createBtn = document.createElement('button');
    createBtn.className = 'panel-btn';
    createBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 创建群聊`;
    createBtn.onclick = () => showCreateGroup();
    panel.appendChild(createBtn);
    try {
        const res = await fetch('/api/groups');
        const groups = await res.json();
        groupsData = groups;
        for (const g of groups) {
            const div = document.createElement('div');
            div.className = 'group-item';
            div.innerHTML = `<div class="g-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="color:#fff"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
                <div><div class="g-name">${escapeHtml(g.name)}</div>
                <div class="g-notice">${escapeHtml(g.notice || '暂无公告')}</div></div>`;
            div.onclick = () => showGroupDetail(g.id);
            panel.appendChild(div);
        }
    } catch (e) { console.error(e); }
}

async function showGroupDetail(groupId) {
    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="im-chat-header"><span class="ch-title">群详情</span></div>
        <div class="im-detail"><div class="im-detail-card"><p style="color:var(--text-tertiary)">加载中...</p></div></div>`;
    try {
        const res = await fetch(`/api/groups/${groupId}`);
        const data = await res.json();
        const group = data.group;
        const members = data.members || [];
        const isOwner = data.isOwner;
        const detail = content.querySelector('.im-detail-card');
        detail.innerHTML = `
            <h2>${escapeHtml(group.name)}</h2>
            <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:16px">群ID: ${group.id} · 创建于 ${formatTime(group.createdAt)}</div>
            <div style="margin-bottom:16px">
                <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px">群公告</label>
                <div style="display:flex;gap:8px;align-items:flex-start">
                    <textarea class="input" id="groupNotice" placeholder="设置群公告" style="font-size:13px;flex:1;min-height:60px;resize:vertical">${escapeHtml(group.notice || '')}</textarea>
                    <button class="btn btn-ghost btn-sm" onclick="updateGroupNotice(${group.id})" style="margin-top:2px">更新</button>
                </div>
            </div>
            <div style="margin-bottom:16px">
                <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:8px">群成员 (${members.length})</label>
                <div class="member-grid">
                    ${members.map(m => `<div class="member-chip">
                        <div class="mc-av">${initial(m.nickname || 'U')}</div>
                        <span class="mc-name">${escapeHtml(m.nickname || '用户')}</span>
                        <span class="mc-role">${m.role == 2 ? '群主' : m.role == 1 ? '管理' : ''}</span>
                        ${isOwner && m.role != 2 ? `<button class="btn btn-sm btn-danger" onclick="kickMember(${group.id},${m.userId})" style="padding:2px 6px;font-size:11px">踢出</button>` : ''}
                    </div>`).join('')}
                </div>
            </div>
            <div style="display:flex;gap:8px;padding-top:16px;border-top:1px solid var(--border-light)">
                <button class="btn btn-primary" onclick="openChat(${group.id},'${escapeHtml(group.name)}',true);switchView('chat')">进入聊天</button>
                <button class="btn btn-ghost" onclick="leaveGroup(${group.id})">退出群聊</button>
                ${isOwner ? `<button class="btn btn-danger" onclick="dissolveGroup(${group.id})">解散群聊</button>` : ''}
            </div>`;
    } catch (e) { console.error(e); }
}

async function updateGroupNotice(groupId) {
    const notice = document.getElementById('groupNotice').value;
    await fetch(`/api/groups/${groupId}/notice`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notice }) });
    showToast('群公告已更新');
}
async function kickMember(groupId, userId) {
    showModal('确认操作', '<p>确定踢出该成员？</p>', `
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="confirmKickMember(${groupId},${userId})">确定踢出</button>
    `);
}
async function confirmKickMember(groupId, userId) {
    closeModal();
    await fetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
    showToast('已踢出');
    showGroupDetail(groupId);
}

async function leaveGroup(groupId) {
    showModal('确认操作', '<p>确定退出该群聊？</p>', `
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="confirmLeaveGroup(${groupId})">确定退出</button>
    `);
}
async function confirmLeaveGroup(groupId) {
    closeModal();
    await fetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
    showToast('已退出');
    loadGroupsView();
    document.getElementById('contentArea').innerHTML = '<div class="im-empty"><div class="im-empty-icon">🏠</div><p>选择一个群查看详情</p></div>';
}

async function dissolveGroup(groupId) {
    showModal('确认操作', '<p style="color:var(--danger);font-weight:600">确定解散该群聊？此操作不可撤销！</p>', `
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="confirmDissolveGroup(${groupId})">确定解散</button>
    `);
}
async function confirmDissolveGroup(groupId) {
    closeModal();
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    showToast('已解散');
    loadGroupsView();
    document.getElementById('contentArea').innerHTML = `<div class="im-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="48" height="48" style="opacity:0.25;margin-bottom:12px"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        <p>选择一个群查看详情</p></div>`;
}

async function showCreateGroup() {
    const content = document.getElementById('contentArea');
    // 加载好友列表供选择
    let friends = [];
    try {
        const res = await fetch('/api/friends');
        const data = await res.json();
        friends = data.friends || [];
    } catch (e) {}
    content.innerHTML = `<div class="im-chat-header"><span class="ch-title">创建群聊</span></div>
        <div class="im-detail"><div class="im-detail-card">
            <h2>创建群聊</h2>
            <div class="form-group"><label>群名称</label><input type="text" class="input" id="newGroupName" placeholder="请输入群名称" required></div>
            <div class="form-group"><label>邀请好友</label>
                ${friends.length === 0 ? '<p style="color:var(--text-tertiary);font-size:13px">暂无好友</p>' :
                    friends.map(f => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer">
                        <input type="checkbox" name="newGroupMembers" value="${f.friendId}" style="accent-color:var(--accent)">
                        ${escapeHtml(f.remark || ('好友 #' + f.friendId))}</label>`).join('')}
            </div>
            <button class="btn btn-primary" onclick="doCreateGroup()">创建</button>
        </div></div>`;
}
async function doCreateGroup() {
    const name = document.getElementById('newGroupName').value.trim();
    if (!name) { showToast('请输入群名称', 'error'); return; }
    const memberIds = [...document.querySelectorAll('input[name=newGroupMembers]:checked')].map(cb => parseInt(cb.value));
    const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, memberIds }) });
    const group = await res.json();
    showToast('群聊创建成功');
    switchView('groups');
}

// ============================================================
//  个人中心视图
// ============================================================
async function loadProfileView() {
    const panel = document.getElementById('panelList');
    panel.innerHTML = '<div style="padding:16px;color:var(--text-tertiary);font-size:13px;text-align:center">个人设置</div>';
    const content = document.getElementById('contentArea');
    try {
        const res = await fetch('/api/profile');
        const user = await res.json();
        content.innerHTML = `
            <div class="im-chat-header"><span class="ch-title">个人中心</span></div>
            <div class="im-detail">
                <div class="im-detail-card">
                    <div class="profile-avatar-area">
                        <div class="av">${user.avatar ? `<img src="${user.avatar}" style="width:72px;height:72px;border-radius:50%;object-fit:cover">` : initial(user.nickname || user.username)}</div>
                        <div style="font-size:16px;font-weight:600">${escapeHtml(user.nickname || user.username)}</div>
                        <div style="font-size:12px;color:var(--text-tertiary)">@${escapeHtml(user.username)}</div>
                        <label style="font-size:12px;color:var(--text-link);cursor:pointer;margin-top:6px">
                            更换头像 <input type="file" id="avatarFile" accept="image/*" style="display:none" onchange="uploadAvatar()">
                        </label>
                    </div>
                    <div class="profile-stats">
                        <div class="profile-stat"><div class="sv">${user.loginCount || 0}</div><div class="sl">登录次数</div></div>
                        <div class="profile-stat"><div class="sv">${user.lastLogin ? formatTime(user.lastLogin) : '--'}</div><div class="sl">最近登录</div></div>
                    </div>
                    <div class="form-group"><label>昵称</label>
                        <div style="display:flex;gap:8px"><input type="text" class="input" id="profileNickname" value="${escapeHtml(user.nickname || '')}">
                        <button class="btn btn-ghost btn-sm" onclick="updateNickname()">保存</button></div>
                    </div>
                    <hr style="margin:20px 0;border:none;border-top:1px solid var(--border-light)">
                    <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">修改密码</h3>
                    <div class="form-group"><label>原密码</label><input type="password" class="input" id="oldPwd" placeholder="请输入原密码"></div>
                    <div class="form-group"><label>新密码</label><input type="password" class="input" id="newPwd" placeholder="请输入新密码"></div>
                    <button class="btn btn-primary" onclick="updatePassword()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        修改密码
                    </button>
                    <hr style="margin:20px 0;border:none;border-top:1px solid var(--border-light)">
                    <a href="/logout" style="text-decoration:none;display:block">
                        <button class="btn btn-danger btn-block" style="gap:8px">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            退出登录
                        </button>
                    </a>
                </div>
            </div>`;
    } catch (e) { console.error(e); }
}

async function updateNickname() {
    const nickname = document.getElementById('profileNickname').value.trim();
    if (!nickname) return;
    await fetch('/api/profile/nickname', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname }) });
    showToast('昵称已更新');
}
async function uploadAvatar() {
    const file = document.getElementById('avatarFile').files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) { showToast('头像已更新'); loadProfileView(); }
    else showToast('上传失败', 'error');
}
async function updatePassword() {
    const oldPassword = document.getElementById('oldPwd').value;
    const newPassword = document.getElementById('newPwd').value;
    if (!oldPassword || !newPassword) { showToast('请填写完整', 'error'); return; }
    const res = await fetch('/api/profile/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) });
    const data = await res.json();
    if (data.success) showToast('密码已修改');
    else showToast(data.error || '修改失败', 'error');
}
