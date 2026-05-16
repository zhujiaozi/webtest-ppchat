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
            <button data-theme="light" onclick="ThemeManager.apply('light')" title="日间模式">☀️</button>
            <button data-theme="dark" onclick="ThemeManager.apply('dark')" title="夜间模式">🌙</button>
            <button data-theme="system" onclick="ThemeManager.apply('system')" title="跟随系统">💻</button>
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
