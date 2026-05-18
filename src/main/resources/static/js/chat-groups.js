/** PP Chat — Groups */
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
        const groups = await parseApiResponse(res);
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
        const data = await parseApiResponse(res);
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
        const data = await parseApiResponse(res);
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
    const group = await parseApiResponse(res);
    showToast('群聊创建成功');
    switchView('groups');
}

// ============================================================
//  个人中心视图
// ============================================================

