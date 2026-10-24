/* Keyboard parity for existing custom controls and current navigation state. */
(() => {
    'use strict';
    document.querySelectorAll('[data-open-tab]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelector(`.nav-item[data-tab="${button.dataset.openTab}"]`)?.click();
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const control = event.target.closest('[role="button"]');
        if (!control || control.matches('button, input, a[href]') || event.repeat) return;
        event.preventDefault();
        control.click();
    });
    document.querySelectorAll('[role="button"]').forEach(control => {
        if (!control.hasAttribute('tabindex')) control.tabIndex = 0;
    });
    const items = [...document.querySelectorAll('.nav-bar .nav-item')];
    const updateNavigation = () => items.forEach(item => {
        if (item.classList.contains('active')) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });
    items.forEach(item => new MutationObserver(updateNavigation)
        .observe(item, { attributes: true, attributeFilter: ['class'] }));
    updateNavigation();
    document.querySelectorAll('.gate-error-tip').forEach(element => {
        element.setAttribute('role', 'status');
        element.setAttribute('aria-live', 'polite');
    });
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        let previousFocus;
        new MutationObserver(() => {
            if (lightbox.classList.contains('active')) {
                previousFocus = document.activeElement;
                lightbox.querySelector('.lightbox-close')?.focus();
            } else if (previousFocus?.isConnected) previousFocus.focus();
        }).observe(lightbox, { attributes: true, attributeFilter: ['class'] });
        lightbox.addEventListener('keydown', event => {
            if (event.key === 'Escape') lightbox.querySelector('.lightbox-close')?.click();
            if (event.key === 'Tab') {
                event.preventDefault();
                lightbox.querySelector('.lightbox-close')?.focus();
            }
        });
    }
    const labels = { 'wall-textarea': '写给对方的悄悄话', 'wall-author-input': '留言签名', 'gate-unlock-pwd-input': '解禁密令', 'gate-drawer-pwd-input': '专属密令' };
    Object.entries(labels).forEach(([id, label]) => document.getElementById(id)?.setAttribute('aria-label', label));
})();
