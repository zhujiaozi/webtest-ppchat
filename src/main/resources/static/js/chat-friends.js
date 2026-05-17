/** PP Chat — Friends */
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
                const name = f.remark || f.friendName || ('好友 #' + f.friendId);
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
    const name = f.remark || f.friendName || ('好友 #' + f.friendId);
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
            // 获取申请人信息
            let reqName = '用户 #' + r.fromUserId;
            try {
                const userRes = await fetch(`/api/profile/${r.fromUserId}`);
                const userData = await userRes.json();
                reqName = userData.nickname || userData.username;
            } catch (e) {}
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-light)';
            div.innerHTML = `<div class="f-avatar" style="background:${avatarGradient(reqName)}">${initial(reqName)}</div>
                <div style="flex:1"><div style="font-size:14px;font-weight:500">${escapeHtml(reqName)}</div>
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

