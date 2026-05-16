/**
 * PP Chat — 主题管理
 * 支持三种主题: light / dark / system
 */
const ThemeManager = {
    THEMES: ['light', 'dark', 'system'],

    init() {
        const saved = localStorage.getItem('pp-theme') || 'system';
        this.apply(saved);
    },

    apply(theme) {
        if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        localStorage.setItem('pp-theme', theme);
        this.updateButtons(theme);
    },

    current() {
        return localStorage.getItem('pp-theme') || 'system';
    },

    updateButtons(theme) {
        document.querySelectorAll('.theme-switcher button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    },

    createSwitcher() {
        const div = document.createElement('div');
        div.className = 'theme-switcher';
        div.innerHTML = `
            <button data-theme="light" onclick="ThemeManager.apply('light')" title="日间模式">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </button>
            <button data-theme="dark" onclick="ThemeManager.apply('dark')" title="夜间模式">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <button data-theme="system" onclick="ThemeManager.apply('system')" title="跟随系统">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </button>
        `;
        this.updateButtons(this.current());
        return div;
    }
};

// Toast 提示
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
