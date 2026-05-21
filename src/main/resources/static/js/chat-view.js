/** PP Chat — Chat View */
async function loadChatView(gen) {
    const isStale = () => gen !== viewGeneration;
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    // 加载好友列表作为会话
    try {
        const res = await fetch('/api/friends');
        if (isStale()) return;
        const data = await parseApiResponse(res);
        friendsData = data;
        const friends = data.friends || [];
        // 批量获取未读消息数
        let unreadMap = {};
        try {
            const unreadRes = await fetch('/api/chat/private/unread-all');
            if (isStale()) return;
            unreadMap = await parseApiResponse(unreadRes) || {};
        } catch (e) {}
        for (const f of friends) {
            const name = f.remark || f.friendName || ('好友 #' + f.friendId);
            const unreadCount = unreadMap[f.friendId] || 0;
            const div = document.createElement('div');
            div.className = 'conv-item' + (currentChat && !currentChat.isGroup && currentChat.id == f.friendId ? ' active' : '');
            div.dataset.friendId = f.friendId;
            div.innerHTML = `<div class="conv-avatar-ph" style="background:${avatarGradient(name)}">${initial(name)}</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(name)}</div>
                <div class="conv-preview">点击开始聊天</div></div>
                ${unreadCount > 0 ? `<div class="conv-badge">${unreadCount}</div>` : ''}`;
            div.onclick = () => openChat(f.friendId, name, false);
            panel.appendChild(div);
        }
    } catch (e) { console.error('加载好友失败', e); }
    if (isStale()) return;
    // 加载群聊
    try {
        const res = await fetch('/api/groups');
        if (isStale()) return;
        const groups = await parseApiResponse(res);
        groupsData = groups;
        for (const g of groups) {
            const div = document.createElement('div');
            div.className = 'conv-item' + (currentChat && currentChat.isGroup && currentChat.id == g.id ? ' active' : '');
            div.dataset.groupId = g.id;
            div.innerHTML = `<div class="conv-avatar-ph" style="background:#4a90d9">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="color:#fff"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(g.name)}</div>
                <div class="conv-preview">${escapeHtml(g.notice || '暂无公告')}</div></div>`;
            div.onclick = () => openChat(g.id, g.name, true);
            panel.appendChild(div);
        }
    } catch (e) { console.error('加载群聊失败', e); }
    // 检查好友申请数量，显示红点
    checkFriendRequestBadge();
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
                <button onclick="exportChat()" title="导出聊天记录">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
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
            const msgs = await parseApiResponse(res);
            console.log(`[openChat] Loaded ${msgs.length} private messages for user ${id}`);
            msgs.forEach(m => appendChatMessage({ senderId: m.senderId, content: m.content, msgType: m.msgType, audioData: m.audioData, time: m.createdAt }));
            fetch(`/api/chat/private/${id}/read`, { method: 'POST' });
            // 清除未读红点
            const activeItem = document.querySelector(`.conv-item[data-friend-id="${id}"]`);
            if (activeItem) {
                const badge = activeItem.querySelector('.conv-badge');
                if (badge) badge.remove();
            }
        } catch (e) { console.error('[openChat] Failed to load private messages:', e); }
    } else {
        try {
            const res = await fetch(`/api/groups/${id}/messages`);
            const msgs = await parseApiResponse(res);
            console.log(`[openChat] Loaded ${msgs.length} group messages for group ${id}`);
            msgs.forEach(m => appendChatMessage({ senderId: m.senderId, sender: m.sender, content: m.content, msgType: m.msgType, audioData: m.audioData, time: m.createdAt }));
        } catch (e) { console.error('[openChat] Failed to load group messages:', e); }
        if (!groupSubscriptions[id] && stompClient && wsConnected) {
            stompClient.subscribe(`/topic/group/${id}`, (msg) => {
                const message = JSON.parse(msg.body);
                // 过滤自己发送的消息（避免重复显示）
                if (message.senderId == userId) return;
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
    const msgId = msg._msgId || ('msg-' + Date.now() + '-' + Math.random().toString(36).slice(2,6));
    div.id = msgId;
    div.className = 'im-msg-row' + (isMine ? ' self' : '');
    const senderName = msg.sender || (isMine ? userName : (currentChat ? currentChat.name : ''));
    const senderHtml = (currentChat && currentChat.isGroup && !isMine && senderName)
        ? `<div class="im-msg-sender">${escapeHtml(senderName)}</div>` : '';
    const statusHtml = isMine ? `<span class="msg-status-indicator${msg._status === 'sending' ? ' msg-sending' : ''}">${msg._status === 'sending' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" class="spin"><circle cx="12" cy="12" r="10" stroke-dasharray="40" stroke-dashoffset="10"/></svg>' : ''}</span>` : '';
    if (msg.msgType === 1 && msg.audioData) {
        const durationMatch = (msg.content || '').match(/(\d+)s/);
        const durationText = durationMatch ? ` ${durationMatch[1]}s` : '';
        div.innerHTML = `<div class="msg-av" style="background:${avatarGradient(isMine ? userName : senderName)}">${isMine ? initial(userName) : initial(senderName || '?')}</div>
            <div>${senderHtml}<div class="im-msg-bubble"><button data-src="${msg.audioData}" onclick="playAudio(this.dataset.src)" style="background:none;border:none;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:4px">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg> 播放语音${durationText}
            </button>${statusHtml}</div></div>`;
    } else {
        div.innerHTML = `<div class="msg-av" style="background:${avatarGradient(isMine ? userName : senderName)}">${isMine ? initial(userName) : initial(senderName || '?')}</div>
            <div>${senderHtml}<div class="im-msg-bubble">${escapeHtml(msg.content || '')}${statusHtml}</div></div>`;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
}

function markMessageFailed(msgId) {
    const el = typeof msgId === 'string' ? document.getElementById(msgId) : msgId;
    if (!el) return;
    const indicator = el.querySelector('.msg-status-indicator');
    if (indicator) {
        indicator.className = 'msg-status-indicator msg-failed';
        indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" title="发送失败"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }
}

function playAudio(src) { new Audio(src).play(); }

// ========== 信息抽屉 ==========

function searchChatHistory() {
    if (!currentChat) return;
    showInputDialog('搜索聊天记录', '输入搜索关键词...', (keyword) => {
        const url = currentChat.isGroup
            ? `/api/groups/${currentChat.id}/messages/search?keyword=${encodeURIComponent(keyword)}`
            : `/api/chat/private/${currentChat.id}/search?keyword=${encodeURIComponent(keyword)}`;
        fetch(url).then(parseApiResponse).then(msgs => {
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
                    const msgId = 'voice-' + Date.now();
                    // 立即显示语音消息（乐观更新，带发送中状态）
                    const msgEl = appendChatMessage({
                        senderId: userId, sender: userName,
                        content: `[语音消息 ${duration}s]`,
                        msgType: 1, audioData: reader.result,
                        createdAt: new Date().toISOString(),
                        _msgId: msgId, _status: 'sending'
                    });
                    try {
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
                        // 5秒后假设发送成功
                        setTimeout(() => {
                            const el = document.getElementById(msgId);
                            if (el) {
                                const indicator = el.querySelector('.msg-status-indicator');
                                if (indicator) {
                                    indicator.innerHTML = '';
                                    indicator.className = '';
                                }
                            }
                        }, 3000);
                    } catch (e) {
                        markMessageFailed(msgId);
                    }
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
        const res = await fetch(`/api/friends/search-friends?keyword=${encodeURIComponent(keyword)}`);
        const users = await parseApiResponse(res);
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

