/**
 * PP Chat — QQ 桌面端风格 SPA
 * 四个视图: chat / friends / groups / profile
 */
const APP = document.querySelector('.im-app');
const userId = parseInt(APP.dataset.userId);
const userName = APP.dataset.userName;

let stompClient = null;
let currentView = 'chat';      // 当前左侧选中的视图
let currentChat = null;         // 当前打开的聊天 { id, name, isGroup }
let friendsData = null;         // 缓存好友数据
let groupsData = null;          // 缓存群数据
let groupSubscriptions = {};    // 已订阅的群 STOMP

// ========== 初始化 ==========
async function init() {
    await loadChatView();
    connectWebSocket();
}

// ========== 视图切换 ==========
function switchView(view) {
    currentView = view;
    // 更新左侧按钮高亮
    document.querySelectorAll('.im-nav-btn[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    // 清空搜索
    const searchInput = document.getElementById('panelSearchInput');
    searchInput.value = '';
    searchInput.placeholder = { chat: '搜索联系人...', friends: '搜索用户...', groups: '搜索群聊...', profile: '' }[view];
    // 加载对应视图
    switch (view) {
        case 'chat': loadChatView(); break;
        case 'friends': loadFriendsView(); break;
        case 'groups': loadGroupsView(); break;
        case 'profile': loadProfileView(); break;
    }
}

// ========== 搜索输入绑定 ==========
document.getElementById('panelSearchInput').addEventListener('input', function () {
    const keyword = this.value.trim();
    if (currentView === 'chat') {
        if (!keyword) loadChatView();
        else searchUsersForChat(keyword);
    } else if (currentView === 'friends') {
        if (!keyword) loadFriendsView();
        else searchUsersForFriend(keyword);
    }
});

// ========== WebSocket ==========
function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;
    stompClient.connect({}, () => {
        stompClient.subscribe('/user/queue/private', (msg) => {
            const message = JSON.parse(msg.body);
            if (currentChat && !currentChat.isGroup &&
                (message.senderId == currentChat.id || message.receiverId == currentChat.id)) {
                appendChatMessage(message);
            }
            // TODO: 更新会话列表未读计数
        });
    });
}

// ========== 发送消息 ==========
function sendMessage() {
    const input = document.getElementById('imMsgInput');
    const content = input.value.trim();
    if (!content || !currentChat) return;
    const message = {
        senderId: userId, sender: userName,
        receiverId: currentChat.isGroup ? null : currentChat.id,
        receiver: currentChat.id.toString(),
        content, msgType: 0, isGroup: currentChat.isGroup
    };
    stompClient.send(currentChat.isGroup ? '/app/chat/group' : '/app/chat/private', {}, JSON.stringify(message));
    input.value = '';
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
            const div = document.createElement('div');
            div.className = 'conv-item' + (currentChat && !currentChat.isGroup && currentChat.id == f.friendId ? ' active' : '');
            div.innerHTML = `<div class="conv-avatar-ph">${initial(name)}</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(name)}</div>
                <div class="conv-preview">点击开始聊天</div></div>`;
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
            div.innerHTML = `<div class="conv-avatar-ph" style="background:#4a90d9">👥</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(g.name)}</div>
                <div class="conv-preview">${escapeHtml(g.notice || '暂无公告')}</div></div>`;
            div.onclick = () => openChat(g.id, g.name, true);
            panel.appendChild(div);
        }
    } catch (e) { console.error('加载群聊失败', e); }
}

async function openChat(id, name, isGroup) {
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
                <button onclick="searchChatHistory()" title="搜索聊天记录">🔍</button>
                ${!isGroup ? '<button onclick="exportChat()" title="导出聊天记录">📥</button>' : ''}
            </div>
        </div>
        <div class="im-messages" id="imMessages"></div>
        <div class="im-input-area">
            <div class="im-input-toolbar">
                <button onclick="document.getElementById('imFileInput').click()" title="发送文件">📎</button>
                <button id="imVoiceBtn" title="按住录音">🎤</button>
                <input type="file" id="imFileInput" style="display:none">
            </div>
            <div class="im-input-row">
                <textarea id="imMsgInput" placeholder="输入消息... (Enter发送)" rows="1"></textarea>
                <button class="send-btn" onclick="sendMessage()">发送</button>
            </div>
        </div>`;

    document.getElementById('imMsgInput').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    initVoiceBtn();

    // 加载消息
    const box = document.getElementById('imMessages');
    if (!isGroup) {
        try {
            const res = await fetch(`/api/chat/private/${id}`);
            const msgs = await res.json();
            msgs.forEach(m => appendChatMessage({ senderId: m.senderId, content: m.content, msgType: m.msgType, audioData: m.audioData, time: m.createdAt }));
            fetch(`/api/chat/private/${id}/read`, { method: 'POST' });
        } catch (e) { console.error(e); }
    } else {
        try {
            const res = await fetch(`/api/groups/${id}/messages`);
            const msgs = await res.json();
            msgs.forEach(m => appendChatMessage({ senderId: m.senderId, sender: m.sender, content: m.content, msgType: m.msgType, audioData: m.audioData, time: m.createdAt }));
        } catch (e) { console.error(e); }
        if (!groupSubscriptions[id]) {
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
        div.innerHTML = `<div class="msg-av">${isMine ? initial(userName) : initial(senderName || '?')}</div>
            <div>${senderHtml}<div class="im-msg-bubble"><button onclick="playAudio('${msg.audioData}')" style="background:none;border:none;cursor:pointer;font-size:13px">🔊 播放语音</button></div></div>`;
    } else {
        div.innerHTML = `<div class="msg-av">${isMine ? initial(userName) : initial(senderName || '?')}</div>
            <div>${senderHtml}<div class="im-msg-bubble">${escapeHtml(msg.content || '')}</div></div>`;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function playAudio(base64) { new Audio(base64).play(); }

function exportChat() {
    if (!currentChat || currentChat.isGroup) return;
    window.open(`/api/chat/private/${currentChat.id}/export`);
}

function searchChatHistory() {
    if (!currentChat) return;
    const keyword = prompt('输入搜索关键词:');
    if (!keyword) return;
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
}

// 语音录制
function initVoiceBtn() {
    const btn = document.getElementById('imVoiceBtn');
    if (!btn) return;
    let recorder, chunks = [], recording = false;
    btn.addEventListener('mousedown', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            chunks = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (!currentChat) return;
                    stompClient.send(currentChat.isGroup ? '/app/chat/group' : '/app/chat/private', {},
                        JSON.stringify({ senderId: userId, sender: userName, receiverId: currentChat.isGroup ? null : currentChat.id, receiver: currentChat.id.toString(), content: '[语音消息]', msgType: 1, audioData: reader.result, isGroup: currentChat.isGroup }));
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start(); recording = true; btn.classList.add('recording');
        } catch (e) { showToast('无法访问麦克风', 'error'); }
    });
    btn.addEventListener('mouseup', () => { if (recording && recorder) { recorder.stop(); recording = false; btn.classList.remove('recording'); } });
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
            div.innerHTML = `<div class="conv-avatar-ph" style="background:#f39c12">${initial(name)}</div>
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
        reqBtn.innerHTML = '📬 好友申请';
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
                div.innerHTML = `<div class="f-avatar" style="background:#3b82f6">${initial(name)}</div>
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
            div.innerHTML = `<div class="f-avatar" style="background:#f39c12">U</div>
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
    document.getElementById('contentArea').innerHTML = '<div class="im-empty"><div class="im-empty-icon">👥</div><p>选择一个好友查看详情</p></div>';
}
async function setFriendRemark(friendId) {
    const remark = prompt('输入备注名:');
    if (!remark) return;
    await fetch(`/api/friends/${friendId}/remark`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remark }) });
    showToast('备注已更新');
    loadFriendsView();
}
async function moveFriend(friendId) {
    const groupId = prompt('输入目标分组ID:');
    if (!groupId) return;
    await fetch(`/api/friends/${friendId}/move`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: parseInt(groupId) }) });
    showToast('已移动');
    loadFriendsView();
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
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();sendFriendRequest(${u.id})">加好友</button>`;
            area.appendChild(div);
        }
    } catch (e) { console.error(e); }
}
async function sendFriendRequest(toUserId) {
    const message = prompt('验证消息（可留空）:') || '';
    const res = await fetch('/api/friends/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId, message }) });
    const data = await res.json();
    if (data.success) showToast('好友申请已发送');
    else showToast(data.error || '发送失败', 'error');
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
    createBtn.innerHTML = '➕ 创建群聊';
    createBtn.onclick = () => showCreateGroup();
    panel.appendChild(createBtn);
    try {
        const res = await fetch('/api/groups');
        const groups = await res.json();
        groupsData = groups;
        for (const g of groups) {
            const div = document.createElement('div');
            div.className = 'group-item';
            div.innerHTML = `<div class="g-avatar">👥</div>
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
                <div style="display:flex;gap:8px">
                    <input type="text" class="input" id="groupNotice" value="${escapeHtml(group.notice || '')}" placeholder="设置群公告" style="font-size:13px">
                    <button class="btn btn-ghost btn-sm" onclick="updateGroupNotice(${group.id})">更新</button>
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
    if (!confirm('确定踢出该成员？')) return;
    await fetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
    showToast('已踢出');
    showGroupDetail(groupId);
}
async function leaveGroup(groupId) {
    if (!confirm('确定退出该群聊？')) return;
    await fetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
    showToast('已退出');
    loadGroupsView();
    document.getElementById('contentArea').innerHTML = '<div class="im-empty"><div class="im-empty-icon">🏠</div><p>选择一个群查看详情</p></div>';
}
async function dissolveGroup(groupId) {
    if (!confirm('确定解散该群聊？此操作不可撤销！')) return;
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    showToast('已解散');
    loadGroupsView();
    document.getElementById('contentArea').innerHTML = '<div class="im-empty"><div class="im-empty-icon">🏠</div><p>选择一个群查看详情</p></div>';
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
                    <button class="btn btn-ghost" onclick="updatePassword()">修改密码</button>
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
