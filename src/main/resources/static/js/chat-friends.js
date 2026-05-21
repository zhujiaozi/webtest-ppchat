/** PP Chat — Friends */
async function loadFriendsView(gen) {
    const isStale = () => gen !== viewGeneration;
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    try {
        const res = await fetch('/api/friends');
        if (isStale()) return;
        const data = await parseApiResponse(res);
        friendsData = data;
        const groups = data.groups || [];
        const friends = data.friends || [];
        // 创建分组按钮
        const createGroupBtn = document.createElement('button');
        createGroupBtn.className = 'panel-btn';
        createGroupBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新建分组`;
        createGroupBtn.onclick = () => createGroup();
        panel.appendChild(createGroupBtn);
        // 搜索结果区
        const searchArea = document.createElement('div');
        searchArea.id = 'friendSearchArea';
        panel.appendChild(searchArea);
        // 按分组显示好友
        const renderedFriendIds = new Set();
        for (const g of groups) {
            const groupFriends = friends.filter(f => f.groupId === g.id);
            const titleRow = document.createElement('div');
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
                div.innerHTML = `<div class="f-avatar" style="background:${avatarGradient(name)}">${initial(name)}</div>
                    <div class="f-name">${escapeHtml(name)}</div>`;
                div.onclick = () => showFriendDetail(f);
                panel.appendChild(div);
            }
        }
        // 未分组好友
        const ungrouped = friends.filter(f => !renderedFriendIds.has(f.friendId));
        if (ungrouped.length > 0) {
            const title = document.createElement('div');
            title.className = 'im-panel-section-title';
            title.textContent = `未分组 (${ungrouped.length})`;
            panel.appendChild(title);
            for (const f of ungrouped) {
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
                    <div class="av" style="background:${avatarGradient(name)}">${initial(name)}</div>
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

// 好友申请视图：左栏=申请列表(条目)，右栏=搜索加好友+申请详情(操作)
async function loadFriendRequestsView(gen) {
    const isStale = () => gen !== viewGeneration;
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    // 右栏默认显示搜索加好友
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

    try {
        const res = await fetch('/api/friends/requests');
        if (isStale()) return;
        const requests = await parseApiResponse(res);
        if (requests.length === 0) {
            panel.innerHTML = '<div style="padding:16px;color:var(--text-tertiary);font-size:13px;text-align:center">暂无待处理的好友申请</div>';
            return;
        }
        for (const r of requests) {
            const reqName = r.fromUserName || ('用户 #' + r.fromUserId);
            const div = document.createElement('div');
            div.className = 'conv-item' + (r._active ? ' active' : '');
            div.innerHTML = `<div class="conv-avatar-ph" style="background:${avatarGradient(reqName)}">${initial(reqName)}</div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(reqName)}</div>
                <div class="conv-preview">${escapeHtml(r.message || '请求加你为好友')}</div></div>`;
            div.onclick = () => showRequestDetail(r);
            panel.appendChild(div);
        }
        // 去掉侧边栏好友申请红点
        const navBtn = document.querySelector('.im-nav-btn[data-view="friendRequests"] .nav-req-badge');
        if (navBtn) navBtn.remove();
    } catch (e) { console.error(e); }
}

function showRequestDetail(r) {
    const reqName = r.fromUserName || ('用户 #' + r.fromUserId);
    // 高亮选中项
    document.querySelectorAll('.im-panel-list .conv-item').forEach(el => el.classList.remove('active'));
    const items = document.querySelectorAll('.im-panel-list .conv-item');
    items.forEach(el => {
        const nameEl = el.querySelector('.conv-name');
        if (nameEl && nameEl.textContent === reqName) el.classList.add('active');
    });
    const content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="im-chat-header"><span class="ch-title">好友申请</span></div>
        <div class="im-detail"><div class="im-detail-card">
            <div class="profile-avatar-area">
                <div class="av" style="background:${avatarGradient(reqName)}">${initial(reqName)}</div>
                <div style="font-size:16px;font-weight:600">${escapeHtml(reqName)}</div>
                <div style="font-size:12px;color:var(--text-tertiary)">ID: ${r.fromUserId}</div>
            </div>
            <div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:20px">${escapeHtml(r.message || '请求加你为好友')}</div>
            <div style="display:flex;gap:8px;justify-content:center">
                <button class="btn btn-primary" onclick="acceptRequest(${r.id})">同意</button>
                <button class="btn btn-danger" onclick="rejectRequest(${r.id})">拒绝</button>
            </div>
        </div></div>`;
}

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

async function searchUsersForFriend(keyword) {
    const area = document.getElementById('friendSearchArea');
    if (!area) return;
    area.innerHTML = '';
    try {
        const res = await fetch(`/api/friends/search?keyword=${encodeURIComponent(keyword)}`);
        const users = await parseApiResponse(res);
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
    showInputDialog('发送好友申请', '验证消息（可留空）...', async (message) => {
        const res = await fetch('/api/friends/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId, message: message || '' }) });
        const data = await parseApiResponse(res);
        if (data.success) showToast('好友申请已发送');
        else showToast(data.error || '发送失败', 'error');
    });
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
