/**
 * YardFlow GitHub Primer Theme Management (theme.js)
 * Supports Dark & Light mode toggle, system preference detection, and persistence.
 */

(function(global) {
    const THEME_STORAGE_KEY = 'yardflow_theme';

    function getPreferredTheme() {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') return stored;
        } catch (e) {}
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    function applyTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') theme = 'dark';
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.setAttribute('color-scheme', theme);
        }
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (e) {}

        updateThemeUI(theme);
    }

    function toggleTheme() {
        const current = (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        return next;
    }

    function updateThemeUI(theme) {
        if (typeof document === 'undefined') return;
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            const iconEl = btn.querySelector('.theme-toggle-icon');
            const textEl = btn.querySelector('.theme-toggle-text');
            if (theme === 'dark') {
                if (iconEl) iconEl.textContent = '☀️';
                else btn.innerHTML = '<span class="theme-toggle-icon">☀️</span><span class="theme-toggle-text" style="display:none;">Vaalea</span>';
                if (textEl) textEl.textContent = 'Vaalea';
                btn.setAttribute('title', 'Vaihda vaaleaan teemaan (GitHub Light)');
                btn.setAttribute('aria-label', 'Vaihda vaaleaan teemaan');
            } else {
                if (iconEl) iconEl.textContent = '🌙';
                else btn.innerHTML = '<span class="theme-toggle-icon">🌙</span><span class="theme-toggle-text" style="display:none;">Tumma</span>';
                if (textEl) textEl.textContent = 'Tumma';
                btn.setAttribute('title', 'Vaihda tummaan teemaan (GitHub Dark)');
                btn.setAttribute('aria-label', 'Vaihda tummaan teemaan');
            }
        }

        const meta = document.getElementById('metaThemeColor');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#0d1117' : '#ffffff');
        }
    }

    function initTheme() {
        const initial = getPreferredTheme();
        applyTheme(initial);
    }

    if (typeof window !== 'undefined') {
        window.getPreferredTheme = getPreferredTheme;
        window.applyTheme = applyTheme;
        window.toggleTheme = toggleTheme;
        window.updateThemeUI = updateThemeUI;
        window.initTheme = initTheme;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.getPreferredTheme = getPreferredTheme;
        globalThis.applyTheme = applyTheme;
        globalThis.toggleTheme = toggleTheme;
        globalThis.updateThemeUI = updateThemeUI;
        globalThis.initTheme = initTheme;
    }
    global.getPreferredTheme = getPreferredTheme;
    global.applyTheme = applyTheme;
    global.toggleTheme = toggleTheme;
    global.updateThemeUI = updateThemeUI;
    global.initTheme = initTheme;

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initTheme);
        } else {
            initTheme();
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
