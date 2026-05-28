/** PP Chat — Groups */
let groupsListCache = [];

async function loadGroupsView(gen) {
    const isStale = () => gen !== viewGeneration;
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    // 创建群按钮
    const createBtn = document.createElement('button');
    createBtn.className = 'panel-btn';
    createBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 创建群聊`;
    createBtn.onclick = () => showCreateGroup();
    panel.appendChild(createBtn);

    // 加入群聊按钮
    const joinBtn = document.createElement('button');
    joinBtn.className = 'panel-btn';
    joinBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> 加入群聊`;
    joinBtn.onclick = () => showJoinGroup();
    panel.appendChild(joinBtn);
    try {
        const res = await fetch('/api/groups');
        if (isStale()) return;
        const groups = await parseApiResponse(res);
        groupsData = groups;
        groupsListCache = groups;
        for (const g of groups) {
            const div = document.createElement('div');
            div.className = 'group-item';
            div.dataset.name = (g.name || '').toLowerCase();
            div.innerHTML = `<div class="g-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" style="color:#fff"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
                <div><div class="g-name">${escapeHtml(g.name)}</div>
                <div class="g-notice" style="font-size:11px;color:var(--text-tertiary);margin-top:2px">ID: ${g.id}</div></div>`;
            div.onclick = () => showGroupDetail(g.id);
            panel.appendChild(div);
        }
    } catch (e) { console.error(e); }
}

function filterGroupsList(keyword) {
    const kw = keyword.toLowerCase();
    document.querySelectorAll('#panelList .group-item').forEach(el => {
        el.style.display = !kw || el.dataset.name.includes(kw) ? '' : 'none';
    });
}

function filterGroupInvitations(keyword) {
    const kw = keyword.toLowerCase();
    document.querySelectorAll('#panelList .conv-item').forEach(el => {
        const name = (el.dataset.name || '').toLowerCase();
        el.style.display = !kw || name.includes(kw) ? '' : 'none';
    });
}

async function showGroupDetail(groupId) {
    // 高亮选中
    document.querySelectorAll('#panelList .group-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#panelList .group-item').forEach(el => {
        const nameEl = el.querySelector('.g-name');
        if (nameEl) {
            const g = groupsListCache.find(x => x.id === groupId);
            if (g && nameEl.textContent === g.name) el.classList.add('active');
        }
    });
    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="im-chat-header"><span class="ch-title">群详情</span></div>
        <div class="im-detail"><div class="im-detail-card"><p style="color:var(--text-tertiary)">加载中...</p></div></div>`;
    try {
        const res = await fetch(`/api/groups/${groupId}`);
        const data = await parseApiResponse(res);
        const group = data.group;
        const members = data.members || [];
        const isOwner = data.isOwner;
        const detail = content.querySelector('.im-detail-card');
        detail.innerHTML = `
            <div class="profile-avatar-area">
                <div class="av" style="background:#4a90d9;width:64px;height:64px;border-radius:16px">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" width="28" height="28"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <div style="font-size:18px;font-weight:700;margin-top:10px">${escapeHtml(group.name)}</div>
                <div style="font-size:12px;color:var(--text-tertiary)">群ID: ${group.id}</div>
            </div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">
                <button class="btn btn-primary" onclick="openChat(${groupId},'${escapeHtml(group.name).replace(/'/g, "\\'")}',true);switchView('chat')">进入聊天</button>
                ${isOwner ? `<button class="btn btn-ghost" onclick="showInviteMembers(${groupId})">邀请成员</button>` : ''}
                <button class="btn btn-ghost" onclick="exportGroupChat(${groupId})">导出记录</button>
                <button class="btn btn-ghost" onclick="leaveGroup(${groupId})">退出群聊</button>
                ${isOwner ? `<button class="btn btn-danger" onclick="dissolveGroup(${groupId})">解散群聊</button>` : ''}
            </div>
            <div style="margin-bottom:16px">
                <label style="font-size:12px;color:var(--text-tertiary);display:block;margin-bottom:4px">群公告</label>
                <div style="display:flex;gap:8px;align-items:flex-start">
                    <textarea class="input" id="groupNotice" placeholder="设置群公告" style="font-size:13px;flex:1;min-height:60px;resize:vertical">${escapeHtml(group.notice || '')}</textarea>
                    <button class="btn btn-ghost btn-sm" onclick="updateGroupNotice(${groupId})" style="margin-top:2px">更新</button>
                </div>
            </div>
            <div>
                <label style="font-size:12px;color:var(--text-tertiary);display:block;margin-bottom:8px">群成员 (${members.length})</label>
                <div class="member-grid">
                    ${members.map(m => `<div class="member-chip">
                        <div class="mc-av">${initial(m.nickname || 'U')}</div>
                        <div style="flex:1;min-width:0">
                            <span class="mc-name">${escapeHtml(m.nickname || '用户')}</span>
                            <div style="font-size:10px;color:var(--text-tertiary)">ID: ${m.userId}</div>
                        </div>
                        <span class="mc-role">${m.role == 2 ? '群主' : m.role == 1 ? '管理' : ''}</span>
                        ${isOwner && m.role != 2 ? `<button class="btn btn-sm btn-danger" onclick="kickMember(${groupId},${m.userId})" style="padding:2px 6px;font-size:11px">踢出</button>` : ''}
                    </div>`).join('')}
                </div>
            </div>`;
    } catch (e) { console.error(e); }
}

async function showInviteMembers(groupId) {
    let friends = [];
    try {
        const res = await fetch('/api/friends');
        const data = await parseApiResponse(res);
        friends = data.friends || [];
    } catch (e) {}
    if (friends.length === 0) {
        showToast('没有可邀请的好友', 'error');
        return;
    }
    const bodyHtml = friends.map(f => {
        const name = f.remark || f.friendName || ('好友 #' + f.friendId);
        return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer">
            <input type="checkbox" name="inviteMembers" value="${f.friendId}" style="accent-color:var(--accent)">
            ${escapeHtml(name)} <span style="font-size:11px;color:var(--text-tertiary)">(ID: ${f.friendId})</span>
        </label>`;
    }).join('');
    showModal('邀请成员加入群聊', bodyHtml, `
        <button class="btn btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="doInviteMembers(${groupId})">发送邀请</button>
    `);
}

async function doInviteMembers(groupId) {
    const checked = document.querySelectorAll('input[name=inviteMembers]:checked');
    if (checked.length === 0) { showToast('请选择要邀请的好友', 'error'); return; }
    for (const cb of checked) {
        await fetch(`/api/groups/${groupId}/invite`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: parseInt(cb.value) })
        });
    }
    closeModal();
    showToast(`已发送 ${checked.length} 个邀请`);
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
    loadGroupsView(viewGeneration);
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
    loadGroupsView(viewGeneration);
    document.getElementById('contentArea').innerHTML = `<div class="im-empty"><p>选择一个群查看详情</p></div>`;
}

function exportGroupChat(groupId) {
    window.open(`/api/groups/${groupId}/export`);
}

// 群聊邀请视图
async function loadGroupInvitationsView(gen) {
    const isStale = () => gen !== viewGeneration;
    const panel = document.getElementById('panelList');
    panel.innerHTML = '';
    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="im-chat-header"><span class="ch-title">群聊邀请</span></div>
        <div class="im-empty"><p>选择左侧邀请查看详情</p></div>`;
    try {
        const res = await fetch('/api/groups/invitations');
        if (isStale()) return;
        const invitations = await parseApiResponse(res);
        if (!invitations || invitations.length === 0) {
            panel.innerHTML = '<div style="padding:16px;color:var(--text-tertiary);font-size:13px;text-align:center">暂无群聊邀请</div>';
            return;
        }
        for (const inv of invitations) {
            const div = document.createElement('div');
            div.className = 'conv-item';
            div.dataset.name = (inv.groupName || '').toLowerCase();
            div.innerHTML = `<div class="conv-avatar-ph" style="background:#4a90d9">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18" style="color:#fff"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
                <div class="conv-body"><div class="conv-name">${escapeHtml(inv.groupName || '群聊')}</div>
                <div class="conv-preview">${escapeHtml(inv.fromUserName || '用户')} 邀请你加入</div></div>`;
            div.onclick = () => showInvitationDetail(inv);
            panel.appendChild(div);
        }
    } catch (e) { console.error(e); }
}

function showInvitationDetail(inv) {
    const fromName = inv.fromUserName || '用户';
    const content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="im-chat-header"><span class="ch-title">群聊邀请</span></div>
        <div class="im-detail"><div class="im-detail-card">
            <div class="profile-avatar-area">
                <div class="av" style="background:#4a90d9;width:64px;height:64px;border-radius:16px">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" width="28" height="28"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <div style="font-size:18px;font-weight:700;margin-top:10px">${escapeHtml(inv.groupName || '群聊')}</div>
            </div>
            <div style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:20px">${escapeHtml(fromName)} 邀请你加入该群聊</div>
            <div style="display:flex;gap:8px;justify-content:center">
                <button class="btn btn-primary" onclick="acceptGroupInvitation(${inv.id})">同意</button>
                <button class="btn btn-danger" onclick="rejectGroupInvitation(${inv.id})">拒绝</button>
            </div>
        </div></div>`;
}

async function acceptGroupInvitation(id) {
    await fetch(`/api/groups/invitations/${id}/accept`, { method: 'POST' });
    showToast('已加入群聊');
    loadGroupInvitationsView(viewGeneration);
}

async function rejectGroupInvitation(id) {
    await fetch(`/api/groups/invitations/${id}/reject`, { method: 'POST' });
    showToast('已拒绝邀请');
    loadGroupInvitationsView(viewGeneration);
}

// 创建群聊
async function showCreateGroup() {
    const content = document.getElementById('contentArea');
    let friends = [];
    try {
        const res = await fetch('/api/friends');
        const data = await parseApiResponse(res);
        friends = data.friends || [];
    } catch (e) {}
    content.innerHTML = `<div class="im-chat-header"><span class="ch-title">创建群聊</span></div>
        <div class="im-detail"><div class="im-detail-card">
            <h2>创建群聊</h2>
            <div class="form-group"><label>群名称</label><input type="text" class="input" id="newGroupName" placeholder="请输入群名称" required></div>
            <div class="form-group"><label>邀请好友</label>
                ${friends.length === 0 ? '<p style="color:var(--text-tertiary);font-size:13px">暂无好友</p>' :
                    friends.map(f => {
                        const name = f.remark || f.friendName || ('好友 #' + f.friendId);
                        return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer">
                            <input type="checkbox" name="newGroupMembers" value="${f.friendId}" style="accent-color:var(--accent)">
                            ${escapeHtml(name)} <span style="font-size:11px;color:var(--text-tertiary)">(ID: ${f.friendId})</span>
                        </label>`;
                    }).join('')}
            </div>
            <button class="btn btn-primary btn-block" onclick="doCreateGroup()">创建</button>
        </div></div>`;
}

async function doCreateGroup() {
    const name = document.getElementById('newGroupName').value.trim();
    if (!name) { showToast('请输入群名称', 'error'); return; }
    const memberIds = [...document.querySelectorAll('input[name=newGroupMembers]:checked')].map(cb => parseInt(cb.value));
    const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, memberIds }) });
    const group = await parseApiResponse(res);
    showToast('群聊创建成功');
    switchView('groups');
}

function showJoinGroup() {
    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="im-chat-header"><span class="ch-title">加入群聊</span></div>
        <div class="im-detail"><div class="im-detail-card">
            <h2>申请加入群聊</h2>
            <div class="form-group"><label>群聊 ID</label>
                <div style="display:flex;gap:8px">
                    <input type="number" class="input" id="joinGroupId" placeholder="输入群聊 ID" style="flex:1">
                    <button class="btn btn-primary" onclick="doRequestJoinGroup()">申请加入</button>
                </div>
            </div>
            <div id="joinGroupResult"></div>
        </div></div>`;
}

async function doRequestJoinGroup() {
    const groupId = document.getElementById('joinGroupId').value.trim();
    if (!groupId) { showToast('请输入群聊 ID', 'error'); return; }
    const result = document.getElementById('joinGroupResult');
    try {
        const res = await fetch(`/api/groups/${groupId}/request-join`, { method: 'POST' });
        const data = await parseApiResponse(res);
        result.innerHTML = '<p style="color:var(--accent);font-size:13px;margin-top:12px">申请已发送，请等待群主审核</p>';
        showToast('入群申请已发送');
    } catch (e) {
        result.innerHTML = `<p style="color:var(--danger);font-size:13px;margin-top:12px">${e.message || '申请失败'}</p>`;
    }
}
