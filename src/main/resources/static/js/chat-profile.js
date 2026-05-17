/** PP Chat — Profile */
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
                        <div class="av" style="background:${avatarGradient(user.nickname || user.username)}">${user.avatar ? `<img src="${user.avatar}" style="width:72px;height:72px;border-radius:50%;object-fit:cover">` : initial(user.nickname || user.username)}</div>
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

