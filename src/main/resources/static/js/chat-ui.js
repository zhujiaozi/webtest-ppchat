/** PP Chat — UI */
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
            const data = await parseApiResponse(res);
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

