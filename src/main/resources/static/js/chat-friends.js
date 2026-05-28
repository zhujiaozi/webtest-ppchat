/** PP Chat — Friends */

// ============================================================
//  Friends View
// ============================================================

async function loadFriendsView(gen) {
    const isStale = () => gen !== viewGeneration;
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    friendListData = [];

    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="im-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="48" height="48" style="opacity:0.25;margin-bottom:12px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>选择一个好友查看详情</p>
    </div>`;

    // 新建分组按钮
    const createGroupBtn = document.createElement('button');
    createGroupBtn.className = 'panel-btn';
    createGroupBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新建分组`;
    createGroupBtn.onclick = () => createGroup();
    panel.appendChild(createGroupBtn);

    // 添加好友按钮
    const addFriendBtn = document.createElement('button');
    addFriendBtn.className = 'panel-btn';
    addFriendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> 添加好友`;
    addFriendBtn.onclick = () => showAddFriendPanel();
    panel.appendChild(addFriendBtn);

    try {
        const res = await fetch('/api/friends');
        if (isStale()) return;
        const data = await parseApiResponse(res);
        friendsData = data;
        const groups = data.groups || [];
        const friends = data.friends || [];

        const renderedFriendIds = new Set();

        for (const g of groups) {
            const groupFriends = friends.filter(f => f.groupId === g.id);

            // 分组头：名称 + 数量 + 删除按钮
            const titleRow = document.createElement('div');
            titleRow.className = 'friend-group-header';
            titleRow.dataset.groupId = g.id;
            titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border-light)';
            const title = document.createElement('div');
            title.className = 'im-panel-section-title';
            title.style.cssText = 'flex:1;font-size:13px;font-weight:600;color:var(--text-secondary)';
            title.textContent = `${g.name} (${groupFriends.length})`;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-ghost btn-sm';
            deleteBtn.style.cssText = 'padding:4px 8px;font-size:11px';
            deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
            deleteBtn.title = '删除分组';
            deleteBtn.onclick = (e) => { e.stopPropagation(); deleteGroup(g.id, g.name); };
            titleRow.appendChild(title);
            titleRow.appendChild(deleteBtn);
            panel.appendChild(titleRow);

            for (const f of groupFriends) {
                renderedFriendIds.add(f.friendId);
                const name = f.remark || f.friendName || ('好友 #' + f.friendId);
                const div = document.createElement('div');
                div.className = 'friend-item';
                div.dataset.groupId = g.id;
                div.dataset.friendName = name;
                div.innerHTML = `<div class="f-avatar" style="background:${avatarGradient(name)}">${initial(name)}</div>
                    <div class="f-name">${escapeHtml(name)}</div>`;
                div.onclick = () => showFriendDetail(f);
                panel.appendChild(div);
                friendListData.push({ friendId: f.friendId, name, groupId: g.id, element: div, data: f });
            }
        }

        // 未分组好友
        const ungrouped = friends.filter(f => !renderedFriendIds.has(f.friendId));
        if (ungrouped.length > 0) {
            const titleRow = document.createElement('div');
            titleRow.className = 'friend-group-header';
            titleRow.dataset.groupId = 'ungrouped';
            titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border-light)';
            const title = document.createElement('div');
            title.className = 'im-panel-section-title';
            title.style.cssText = 'flex:1;font-size:13px;font-weight:600;color:var(--text-secondary)';
            title.textContent = `未分组 (${ungrouped.length})`;
            titleRow.appendChild(title);
            panel.appendChild(titleRow);

            for (const f of ungrouped) {
                const name = f.remark || f.friendName || ('好友 #' + f.friendId);
                const div = document.createElement('div');
                div.className = 'friend-item';
                div.dataset.groupId = 'ungrouped';
                div.dataset.friendName = name;
                div.innerHTML = `<div class="f-avatar" style="background:${avatarGradient(name)}">${initial(name)}</div>
                    <div class="f-name">${escapeHtml(name)}</div>`;
                div.onclick = () => showFriendDetail(f);
                panel.appendChild(div);
                friendListData.push({ friendId: f.friendId, name, groupId: 'ungrouped', element: div, data: f });
            }
        }
    } catch (e) { console.error(e); }
}

function filterFriendsList(keyword) {
    const kw = keyword.toLowerCase();
    document.querySelectorAll('#panelList .friend-item').forEach(el => {
        const name = (el.dataset.friendName || '').toLowerCase();
        el.style.display = !kw || name.includes(kw) ? '' : 'none';
    });
    document.querySelectorAll('#panelList .friend-group-header').forEach(header => {
        const gid = header.dataset.groupId;
        const hasVisible = !!document.querySelector(`#panelList .friend-item[data-group-id="${gid}"]:not([style*="display: none"])`);
        header.style.display = !kw || hasVisible ? '' : 'none';
    });
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
                    <div class="av" style="background:${avatarGradient(name)};width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px">${initial(name)}</div>
                    <div style="font-size:18px;font-weight:600;margin-top:10px">${escapeHtml(name)}</div>
                    <div style="font-size:12px;color:var(--text-tertiary)">ID: ${f.friendId}</div>
                </div>
                <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">
                    <button class="btn btn-primary" onclick="openChat(${f.friendId}, '${escapeHtml(name).replace(/'/g, "\\'")}', false);switchView('chat')">发消息</button>
                    <button class="btn btn-ghost" onclick="setFriendRemark(${f.friendId})">设置备注</button>
                    <button class="btn btn-ghost" onclick="moveFriend(${f.friendId})">移动分组</button>
                    <button class="btn btn-danger" onclick="deleteFriend(${f.friendId})">删除好友</button>
                </div>
            </div>
        </div>`;
}

// ============================================================
//  Friend Requests View
// ============================================================

async function loadFriendRequestsView(gen) {
    const isStale = () => gen !== viewGeneration;
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    friendRequestData = [];

    // 右栏默认显示搜索加好友
    showAddFriendPanel();

    try {
        const res = await fetch('/api/friends/requests');
        if (isStale()) return;
        const requests = await parseApiResponse(res);
        if (!requests || requests.length === 0) {
            panel.innerHTML = '<div style="padding:16px;color:var(--text-tertiary);font-size:13px;text-align:center">暂无待处理的好友申请</div>';
            return;
        }
        for (const r of requests) {
            const reqName = r.fromUserName || ('用户 #' + r.fromUserId);
            const div = document.createElement('div');
            div.className = 'conv-item';
            div.dataset.senderName = reqName;
            div.innerHTML = `<div class="conv-avatar-ph" style="background:${avatarGradient(reqName)}">${initial(reqName)}</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(reqName)}</div>
                <div class="conv-preview">${escapeHtml(r.message || '请求加你为好友')}</div></div>`;
            div.onclick = () => showRequestDetail(r);
            panel.appendChild(div);
            friendRequestData.push({ requestId: r.id, senderName: reqName, element: div, data: r });
        }
        // 去掉侧边栏好友申请红点
        const navBtn = document.querySelector('.im-nav-btn[data-view="friendRequests"] .nav-req-badge');
        if (navBtn) navBtn.remove();
    } catch (e) { console.error(e); }
}

function filterFriendRequests(keyword) {
    const kw = keyword.toLowerCase();
    document.querySelectorAll('#panelList .conv-item').forEach(el => {
        const name = (el.dataset.senderName || '').toLowerCase();
        el.style.display = !kw || name.includes(kw) ? '' : 'none';
    });
}

function showAddFriendPanel() {
    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="im-chat-header"><span class="ch-title">添加好友</span></div>
        <div class="im-detail"><div class="im-detail-card">
            <h2>搜索添加好友</h2>
            <div class="form-group"><label>搜索用户</label>
                <div style="display:flex;gap:8px">
                    <input type="text" class="input" id="addFriendSearch" placeholder="输入用户名或昵称" style="flex:1">
                    <button class="btn btn-primary" onclick="doSearchUserToAdd()">搜索</button>
                </div>
            </div>
            <div id="addFriendResults"></div>
        </div></div>`;
}

function showRequestDetail(r) {
    const reqName = r.fromUserName || ('用户 #' + r.fromUserId);
    // 高亮选中项
    document.querySelectorAll('#panelList .conv-item').forEach(el => el.classList.remove('active'));
    const items = document.querySelectorAll('#panelList .conv-item');
    items.forEach(el => {
        const nameEl = el.querySelector('.conv-name');
        if (nameEl && nameEl.textContent === reqName) el.classList.add('active');
    });
    const content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="im-chat-header">
            <span class="ch-title">好友申请</span>
            <div class="ch-actions">
                <button onclick="showAddFriendPanel()" title="搜索添加好友">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </button>
            </div>
        </div>
        <div class="im-detail"><div class="im-detail-card">
            <div class="profile-avatar-area">
                <div class="av" style="background:${avatarGradient(reqName)};width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px">${initial(reqName)}</div>
                <div style="font-size:18px;font-weight:600;margin-top:10px">${escapeHtml(reqName)}</div>
                <div style="font-size:12px;color:var(--text-tertiary)">ID: ${r.fromUserId}</div>
            </div>
            <div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:20px">${escapeHtml(r.message || '请求加你为好友')}</div>
            <div style="display:flex;gap:8px;justify-content:center">
                <button class="btn btn-primary" onclick="acceptRequest(${r.id})">同意</button>
                <button class="btn btn-danger" onclick="rejectRequest(${r.id})">拒绝</button>
            </div>
        </div></div>`;
}

// ============================================================
//  Add Friend / Search User
// ============================================================

async function doSearchUserToAdd() {
    const keyword = document.getElementById('addFriendSearch').value.trim();
    if (!keyword) return;
    const results = document.getElementById('addFriendResults');
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
            div.innerHTML = `<div class="su-av" style="width:36px;height:36px;border-radius:6px;flex-shrink:0;background:${avatarGradient(name)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px">${initial(name)}</div>
                <div style="flex:1"><div style="font-size:13px;font-weight:500">${escapeHtml(name)}</div><div style="font-size:11px;color:var(--text-tertiary)">@${escapeHtml(u.username)}</div></div>
                <button class="btn btn-primary btn-sm" onclick="sendFriendRequest(${u.id})">加好友</button>`;
            results.appendChild(div);
        }
    } catch (e) { results.innerHTML = '<p style="color:var(--danger);font-size:13px">搜索失败</p>'; }
}

async function sendFriendRequest(toUserId) {
    showInputDialog('发送好友申请', '验证消息（可留空）...', async (message) => {
        const res = await fetch('/api/friends/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId, message: message || '' }) });
        const data = await parseApiResponse(res);
        if (data.success) showToast('好友申请已发送');
        else showToast(data.error || '发送失败', 'error');
    });
}

// ============================================================
//  Friend Action Helpers
// ============================================================

async function acceptRequest(id) {
    await fetch(`/api/friends/requests/${id}/accept`, { method: 'POST' });
    showToast('已同意好友申请');
    loadFriendRequestsView(viewGeneration);
}

async function rejectRequest(id) {
    await fetch(`/api/friends/requests/${id}/reject`, { method: 'POST' });
    showToast('已拒绝');
    loadFriendRequestsView(viewGeneration);
}

async function deleteFriend(friendId) {
    showModal('确认删除', '<p>确定删除该好友？删除后将同时从对方好友列表中移除。</p>', `
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="confirmDeleteFriend(${friendId})">确定删除</button>
    `);
}

async function confirmDeleteFriend(friendId) {
    closeModal();
    await fetch(`/api/friends/${friendId}`, { method: 'DELETE' });
    showToast('已删除');
    loadFriendsView(viewGeneration);
    document.getElementById('contentArea').innerHTML = `<div class="im-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="48" height="48" style="opacity:0.25;margin-bottom:12px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>选择一个好友查看详情</p></div>`;
}

async function setFriendRemark(friendId) {
    showInputDialog('设置备注', '输入备注名...', async (remark) => {
        await fetch(`/api/friends/${friendId}/remark`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remark }) });
        showToast('备注已更新');
        loadFriendsView(viewGeneration);
    });
}

async function moveFriend(friendId) {
    const groups = friendsData?.groups || [];
    let bodyHtml = '<p style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">选择目标分组：</p>';
    if (groups.length === 0) {
        bodyHtml += '<p style="color:var(--text-tertiary);font-size:13px">暂无分组，请先在好友管理页面创建分组</p>';
    } else {
        for (const g of groups) {
            bodyHtml += `<div style="padding:10px 12px;margin-bottom:4px;border-radius:8px;cursor:pointer;transition:background 0.15s;font-size:13px"
                onmouseover="this.style.background='var(--bg-hover)'"
                onmouseout="this.style.background='transparent'"
                onclick="confirmMoveFriend(${friendId}, ${g.id})">${escapeHtml(g.name)}</div>`;
        }
    }
    showModal('移动分组', bodyHtml,
        `<button class="btn btn-ghost" onclick="confirmMoveFriend(${friendId}, null)">移至未分组</button>
         <button class="btn btn-ghost" onclick="closeModal()">取消</button>`);
}

async function confirmMoveFriend(friendId, groupId) {
    closeModal();
    await fetch(`/api/friends/${friendId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
    });
    showToast('已移动');
    loadFriendsView(viewGeneration);
}

async function createGroup() {
    showInputDialog('新建分组', '输入分组名称...', async (name) => {
        if (!name || !name.trim()) {
            showToast('分组名称不能为空', 'error');
            return;
        }
        const res = await fetch('/api/friends/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
        const result = await parseApiResponse(res);
        if (result && result.id) {
            showToast('分组已创建');
            loadFriendsView(viewGeneration);
        } else {
            showToast('创建失败', 'error');
        }
    });
}

async function deleteGroup(groupId, groupName) {
    showModal('删除分组', `<p>确定删除分组"${escapeHtml(groupName)}"？该分组下的好友将被移至未分组。</p>`, `
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="confirmDeleteGroup(${groupId})">确定删除</button>
    `);
}

async function confirmDeleteGroup(groupId) {
    closeModal();
    try {
        await fetch(`/api/friends/groups/${groupId}`, { method: 'DELETE' });
        showToast('分组已删除');
        loadFriendsView(viewGeneration);
    } catch (e) {
        showToast('删除失败', 'error');
    }
}

// ============================================================
//  Notifications View (合并好友申请 + 群聊邀请)
// ============================================================

let notificationsData = [];

async function loadNotificationsView(gen) {
    const isStale = () => gen !== viewGeneration;
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    notificationsData = [];

    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="im-empty"><p>选择左侧通知查看详情</p></div>`;
    try {
        const res = await fetch('/api/friends/requests');
        if (isStale()) return;
        const requests = await parseApiResponse(res);
        for (const r of (requests || [])) {
            const name = r.fromUserName || ('用户 #' + r.fromUserId);
            const div = document.createElement('div');
            div.className = 'conv-item';
            div.dataset.senderName = name.toLowerCase();
            div.dataset.type = 'friend-request';
            div.innerHTML = `<div class="conv-avatar-ph" style="background:${avatarGradient(name)}">${initial(name)}</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(name)}</div>
                <div class="conv-preview" style="color:var(--accent)">好友申请</div></div>`;
            div.onclick = () => showNotificationDetail('friend-request', r);
            panel.appendChild(div);
            notificationsData.push({ type: 'friend-request', data: r, element: div });
        }
    } catch (e) {}

    // 加载群聊邀请（被邀请）
    try {
        const res = await fetch('/api/groups/invitations');
        if (isStale()) return;
        const invitations = await parseApiResponse(res);
        for (const inv of (invitations || [])) {
            const groupName = inv.groupName || '群聊';
            const fromName = inv.fromUserName || '用户';
            const div = document.createElement('div');
            div.className = 'conv-item';
            div.dataset.senderName = (groupName + ' ' + fromName).toLowerCase();
            div.dataset.type = 'group-invitation';
            div.innerHTML = `<div class="conv-avatar-ph" style="background:#4a90d9">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18" style="color:#fff"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(groupName)}</div>
                <div class="conv-preview" style="color:#4a90d9">${escapeHtml(fromName)} 邀请你加入</div></div>`;
            div.onclick = () => showNotificationDetail('group-invitation', inv);
            panel.appendChild(div);
            notificationsData.push({ type: 'group-invitation', data: inv, element: div });
        }
    } catch (e) {}

    // 加载入群申请（群主收到的）
    try {
        const res = await fetch('/api/groups/join-requests');
        if (isStale()) return;
        const joinRequests = await parseApiResponse(res);
        for (const req of (joinRequests || [])) {
            const groupName = req.groupName || '群聊';
            const fromName = req.fromUserName || '用户';
            const div = document.createElement('div');
            div.className = 'conv-item';
            div.dataset.senderName = (groupName + ' ' + fromName).toLowerCase();
            div.dataset.type = 'join-request';
            div.innerHTML = `<div class="conv-avatar-ph" style="background:${avatarGradient(fromName)}">${initial(fromName)}</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(groupName)}</div>
                <div class="conv-preview" style="color:var(--warning)">${escapeHtml(fromName)} 申请加入</div></div>`;
            div.onclick = () => showNotificationDetail('join-request', req);
            panel.appendChild(div);
            notificationsData.push({ type: 'join-request', data: req, element: div });
        }
    } catch (e) {}

    // 清除侧边栏红点
    const navBtn = document.querySelector('.im-nav-btn[data-view="notifications"] .nav-notif-badge');
    if (navBtn) navBtn.remove();

    if (notificationsData.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:16px;color:var(--text-tertiary);font-size:13px;text-align:center';
        empty.textContent = '暂无新通知';
        panel.appendChild(empty);
    }
}

function filterNotifications(keyword) {
    const kw = keyword.toLowerCase();
    document.querySelectorAll('#panelList .conv-item').forEach(el => {
        const name = (el.dataset.senderName || '').toLowerCase();
        el.style.display = !kw || name.includes(kw) ? '' : 'none';
    });
}

function showNotificationDetail(type, data) {
    const content = document.getElementById('contentArea');
    if (type === 'friend-request') {
        const r = data;
        const name = r.fromUserName || ('用户 #' + r.fromUserId);
        content.innerHTML = `
            <div class="im-chat-header"><span class="ch-title">好友申请</span></div>
            <div class="im-detail"><div class="im-detail-card">
                <div class="profile-avatar-area">
                    <div class="av" style="background:${avatarGradient(name)};width:64px;height:64px;border-radius:16px">${initial(name)}</div>
                    <div style="font-size:18px;font-weight:600;margin-top:10px">${escapeHtml(name)}</div>
                    <div style="font-size:12px;color:var(--text-tertiary)">用户ID: ${r.fromUserId}</div>
                </div>
                <div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:20px">${escapeHtml(r.message || '请求加你为好友')}</div>
                <div style="display:flex;gap:8px;justify-content:center">
                    <button class="btn btn-primary" onclick="acceptNotifRequest(${r.id})">同意</button>
                    <button class="btn btn-danger" onclick="rejectNotifRequest(${r.id})">拒绝</button>
                </div>
            </div></div>`;
    } else if (type === 'group-invitation') {
        const inv = data;
        const fromName = inv.fromUserName || '用户';
        content.innerHTML = `
            <div class="im-chat-header"><span class="ch-title">群聊邀请</span></div>
            <div class="im-detail"><div class="im-detail-card">
                <div class="profile-avatar-area">
                    <div class="av" style="background:#4a90d9;width:64px;height:64px;border-radius:16px">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" width="28" height="28"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div style="font-size:18px;font-weight:700;margin-top:10px">${escapeHtml(inv.groupName || '群聊')}</div>
                </div>
                <div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:20px">${escapeHtml(fromName)} 邀请你加入该群聊</div>
                <div style="display:flex;gap:8px;justify-content:center">
                    <button class="btn btn-primary" onclick="acceptNotifGroupInvitation(${inv.id})">同意</button>
                    <button class="btn btn-danger" onclick="rejectNotifGroupInvitation(${inv.id})">拒绝</button>
                </div>
            </div></div>`;
    } else if (type === 'join-request') {
        const req = data;
        const fromName = req.fromUserName || '用户';
        content.innerHTML = `
            <div class="im-chat-header"><span class="ch-title">入群申请</span></div>
            <div class="im-detail"><div class="im-detail-card">
                <div class="profile-avatar-area">
                    <div class="av" style="background:${avatarGradient(fromName)};width:64px;height:64px;border-radius:16px">${initial(fromName)}</div>
                    <div style="font-size:18px;font-weight:600;margin-top:10px">${escapeHtml(fromName)}</div>
                </div>
                <div style="text-align:center;font-size:15px;font-weight:600;margin-bottom:20px">${escapeHtml(req.groupName || '群聊')}</div>
                <div style="display:flex;gap:8px;justify-content:center">
                    <button class="btn btn-primary" onclick="acceptJoinRequest(${req.id})">同意入群</button>
                    <button class="btn btn-danger" onclick="rejectJoinRequest(${req.id})">拒绝</button>
                </div>
            </div></div>`;
    }
}

async function acceptNotifRequest(id) {
    await fetch(`/api/friends/requests/${id}/accept`, { method: 'POST' });
    showToast('已同意好友申请');
    loadNotificationsView(viewGeneration);
}

async function rejectNotifRequest(id) {
    await fetch(`/api/friends/requests/${id}/reject`, { method: 'POST' });
    showToast('已拒绝');
    loadNotificationsView(viewGeneration);
}

async function acceptNotifGroupInvitation(id) {
    await fetch(`/api/groups/invitations/${id}/accept`, { method: 'POST' });
    showToast('已加入群聊');
    loadNotificationsView(viewGeneration);
}

async function rejectNotifGroupInvitation(id) {
    await fetch(`/api/groups/invitations/${id}/reject`, { method: 'POST' });
    showToast('已拒绝邀请');
    loadNotificationsView(viewGeneration);
}

async function acceptJoinRequest(id) {
    await fetch(`/api/groups/join-requests/${id}/accept`, { method: 'POST' });
    showToast('已同意入群');
    loadNotificationsView(viewGeneration);
}

async function rejectJoinRequest(id) {
    await fetch(`/api/groups/join-requests/${id}/reject`, { method: 'POST' });
    showToast('已拒绝');
    loadNotificationsView(viewGeneration);
}
