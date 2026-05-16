let stompClient = null;
let currentChat = null;
const container = document.querySelector('.chat-container');
const userId = parseInt(container.dataset.userId);
const userName = container.dataset.userName;

async function init() {
    await loadSessions();
    connectWebSocket();
}

async function loadSessions() {
    const list = document.getElementById('sessionList');
    list.innerHTML = '';
    // 加载好友
    try {
        const res = await fetch('/api/friends');
        const friends = await res.json();
        for (const f of friends) {
            const div = document.createElement('div');
            div.className = 'session-item';
            div.dataset.id = f.friendId;
            div.dataset.name = f.remark || ('用户' + f.friendId);
            div.dataset.isGroup = 'false';
            div.innerHTML = `<div class="avatar avatar-lg" style="background:#3b82f6">${(f.remark || 'U')[0]}</div>
                <div style="flex:1;min-width:0"><div style="font-weight:600">${f.remark || '用户' + f.friendId}</div></div>`;
            div.onclick = () => openChat(f.friendId, f.remark || ('用户' + f.friendId), false);
            list.appendChild(div);
        }
    } catch (e) { console.error('加载好友失败', e); }
    // 加载群聊
    try {
        const res = await fetch('/api/groups');
        const groups = await res.json();
        for (const g of groups) {
            const div = document.createElement('div');
            div.className = 'session-item';
            div.dataset.id = g.id;
            div.dataset.name = g.name;
            div.dataset.isGroup = 'true';
            div.innerHTML = `<div class="avatar avatar-lg" style="background:#27ae60">👥</div>
                <div style="flex:1;min-width:0"><div style="font-weight:600">${g.name}</div></div>`;
            div.onclick = () => openChat(g.id, g.name, true);
            list.appendChild(div);
        }
    } catch (e) { console.error('加载群聊失败', e); }
}

function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;
    stompClient.connect({}, function() {
        stompClient.subscribe('/user/queue/private', function(msg) {
            const message = JSON.parse(msg.body);
            if (currentChat && !currentChat.isGroup &&
                (message.senderId == currentChat.id || message.receiverId == currentChat.id)) {
                appendMessage(message);
            }
        });
    });
}

async function openChat(id, name, isGroup) {
    currentChat = { id, name, isGroup };
    document.getElementById('chatHeader').style.display = '';
    document.getElementById('inputArea').style.display = '';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('chatTitle').textContent = name;
    document.querySelectorAll('.session-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.id) === id);
    });
    const box = document.getElementById('messages');
    box.innerHTML = '';
    if (!isGroup) {
        try {
            const res = await fetch(`/api/chat/private/${id}`);
            const messages = await res.json();
            messages.forEach(m => appendMessage({
                senderId: m.senderId, content: m.content,
                msgType: m.msgType, audioData: m.audioData, time: m.createdAt
            }));
            fetch(`/api/chat/private/${id}/read`, { method: 'POST' });
        } catch (e) { console.error('加载聊天记录失败', e); }
    } else {
        try {
            const res = await fetch(`/api/groups/${id}/messages`);
            const messages = await res.json();
            messages.forEach(m => appendMessage({
                senderId: m.senderId, content: m.content,
                msgType: m.msgType, audioData: m.audioData, time: m.createdAt
            }));
        } catch (e) { console.error('加载群消息失败', e); }
        stompClient.subscribe(`/topic/group/${id}`, function(msg) {
            const message = JSON.parse(msg.body);
            if (currentChat && currentChat.isGroup && currentChat.id == id) {
                appendMessage(message);
            }
        });
    }
    box.scrollTop = box.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('msgInput');
    const content = input.value.trim();
    if (!content || !currentChat) return;
    const message = {
        senderId: userId, sender: userName,
        receiverId: currentChat.isGroup ? null : currentChat.id,
        receiver: currentChat.id.toString(),
        content: content, msgType: 0, isGroup: currentChat.isGroup
    };
    stompClient.send(currentChat.isGroup ? '/app/chat/group' : '/app/chat/private', {}, JSON.stringify(message));
    input.value = '';
}

function appendMessage(msg) {
    const box = document.getElementById('messages');
    const isMine = msg.senderId == userId;
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = isMine ? 'flex-end' : 'flex-start';
    if (msg.msgType === 1 && msg.audioData) {
        div.innerHTML = `<div class="msg-bubble ${isMine ? 'msg-mine' : 'msg-other'}">
            <button onclick="playAudio('${msg.audioData}')" style="background:none;border:none;cursor:pointer;font-size:14px">🔊 播放语音</button></div>`;
    } else {
        div.innerHTML = `<div class="msg-bubble ${isMine ? 'msg-mine' : 'msg-other'}">${escapeHtml(msg.content)}</div>`;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// 语音录制
let mediaRecorder, audioChunks = [];
const voiceBtn = document.getElementById('voiceBtn');
let isRecording = false;

voiceBtn.addEventListener('mousedown', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                if (!currentChat) return;
                stompClient.send(
                    currentChat.isGroup ? '/app/chat/group' : '/app/chat/private', {},
                    JSON.stringify({
                        senderId: userId, sender: userName,
                        receiverId: currentChat.isGroup ? null : currentChat.id,
                        receiver: currentChat.id.toString(),
                        content: '[语音消息]', msgType: 1, audioData: reader.result,
                        isGroup: currentChat.isGroup
                    })
                );
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        voiceBtn.textContent = '⏹';
    } catch (e) { alert('无法访问麦克风'); }
});

voiceBtn.addEventListener('mouseup', () => {
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        isRecording = false;
        voiceBtn.textContent = '🎤';
    }
});

function playAudio(base64) { new Audio(base64).play(); }

function exportChat() {
    if (!currentChat || currentChat.isGroup) return;
    window.open(`/api/chat/private/${currentChat.id}/export`);
}

function searchMessages() {
    if (!currentChat) return;
    const keyword = prompt('输入搜索关键词:');
    if (!keyword) return;
    if (currentChat.isGroup) {
        fetch(`/api/groups/${currentChat.id}/messages/search?keyword=${encodeURIComponent(keyword)}`)
            .then(r => r.json()).then(msgs => {
                const box = document.getElementById('messages');
                box.innerHTML = '';
                msgs.forEach(m => appendMessage({
                    senderId: m.senderId, content: m.content,
                    msgType: m.msgType, audioData: m.audioData, time: m.createdAt
                }));
            });
    } else {
        fetch(`/api/chat/private/${currentChat.id}/search?keyword=${encodeURIComponent(keyword)}`)
            .then(r => r.json()).then(msgs => {
                const box = document.getElementById('messages');
                box.innerHTML = '';
                msgs.forEach(m => appendMessage({
                    senderId: m.senderId, content: m.content,
                    msgType: m.msgType, audioData: m.audioData, time: m.createdAt
                }));
            });
    }
}

document.getElementById('searchInput').addEventListener('input', async function() {
    const keyword = this.value.trim();
    if (!keyword) { loadSessions(); return; }
    const res = await fetch(`/api/friends/search?keyword=${encodeURIComponent(keyword)}`);
    const users = await res.json();
    const list = document.getElementById('sessionList');
    list.innerHTML = '';
    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'session-item';
        div.innerHTML = `<div class="avatar avatar-lg" style="background:#f39c12">${(u.nickname || u.username)[0]}</div>
            <div><div style="font-weight:600">${u.nickname || u.username}</div><div style="font-size:12px;color:#888">${u.username}</div></div>`;
        div.onclick = () => openChat(u.id, u.nickname || u.username, false);
        list.appendChild(div);
    });
});

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

document.getElementById('msgInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

init();
