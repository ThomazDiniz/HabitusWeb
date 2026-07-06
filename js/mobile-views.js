// Mobile (narrow viewport): swipe left/right or tab bar to switch habits / activities / calendar

const MobileViewsManager = {
    MOBILE_MAX_WIDTH: 640,
    TAB_STORAGE_KEY: 'habitus-mobile-tab',
    SWIPE_MIN_PX: 56,
    SWIPE_RATIO: 1.35,

    _mq: null,
    _touchStart: null,
    _boundOnResize: null,

    isMobileLayout() {
        if (!this._mq) {
            this._mq = window.matchMedia(`(max-width: ${this.MOBILE_MAX_WIDTH}px)`);
        }
        return this._mq.matches;
    },

    getTab() {
        const v = document.body.getAttribute('data-mobile-tab');
        const n = parseInt(v, 10);
        if (n === 0 || n === 1 || n === 2) return n;
        return 0;
    },

    setTab(index, { scrollIntoView = true } = {}) {
        const i = ((index % 3) + 3) % 3;
        document.body.setAttribute('data-mobile-tab', String(i));
        try {
            sessionStorage.setItem(this.TAB_STORAGE_KEY, String(i));
        } catch (e) {
            /* ignore */
        }
        this.syncTabBar();
        if (scrollIntoView) {
            const bar = document.getElementById('mobile-view-tabs');
            if (bar && !bar.hidden) {
                try {
                    bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } catch (e) {
                    bar.scrollIntoView(true);
                }
            }
        }
    },

    syncTabBar() {
        const bar = document.getElementById('mobile-view-tabs');
        if (!bar) return;
        const tab = this.getTab();
        bar.querySelectorAll('.mobile-view-tab').forEach((btn) => {
            const idx = parseInt(btn.getAttribute('data-mobile-tab'), 10);
            const sel = idx === tab;
            btn.setAttribute('aria-selected', sel ? 'true' : 'false');
            btn.classList.toggle('is-active', sel);
        });
    },

    updateTabLabels() {
        if (typeof t !== 'function') return;
        const d = document.getElementById('mobile-tab-dailies');
        const a = document.getElementById('mobile-tab-tasks');
        const c = document.getElementById('mobile-tab-calendar');
        if (d) d.textContent = t('dailies');
        if (a) a.textContent = t('tasks');
        if (c) c.textContent = t('weekCalendarTitleToday');
        const bar = document.getElementById('mobile-view-tabs');
        if (bar) bar.setAttribute('aria-label', t('mobileTabBarAria'));
    },

    applyLayoutMode() {
        const mobile = this.isMobileLayout();
        document.body.classList.toggle('mobile-swipe-tabs', mobile);
        const bar = document.getElementById('mobile-view-tabs');
        if (bar) bar.hidden = !mobile;

        if (mobile) {
            let stored = 0;
            try {
                const s = sessionStorage.getItem(this.TAB_STORAGE_KEY);
                const n = parseInt(s, 10);
                if (n === 0 || n === 1 || n === 2) stored = n;
            } catch (e) {
                /* ignore */
            }
            document.body.setAttribute('data-mobile-tab', String(stored));
            this.syncTabBar();
        } else {
            document.body.removeAttribute('data-mobile-tab');
        }

        this.updateTabLabels();

        if (typeof WeekCalendarManager !== 'undefined' && WeekCalendarManager.render) {
            try {
                WeekCalendarManager.render();
            } catch (e) {
                /* ignore */
            }
        }
    },

    _shouldIgnoreSwipeTarget(target) {
        if (!target || !target.closest) return true;
        if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
        if (target.closest('#global-search-input')) return true;
        if (target.closest('.mobile-view-tabs')) return true;
        if (target.closest('.week-cal-drag-handle, .week-cal-resize-handle')) return true;
        if (target.closest('.modal-overlay')) {
            const m = target.closest('.modal-overlay');
            if (m && getComputedStyle(m).display === 'flex') return true;
        }
        return false;
    },

    _onTouchStart(e) {
        if (!this.isMobileLayout()) return;
        if (e.touches.length !== 1) return;
        if (this._shouldIgnoreSwipeTarget(e.target)) {
            this._touchStart = null;
            return;
        }
        const t = e.touches[0];
        this._touchStart = { x: t.clientX, y: t.clientY };
    },

    _onTouchEnd(e) {
        if (!this.isMobileLayout()) {
            this._touchStart = null;
            return;
        }
        if (!this._touchStart || e.changedTouches.length !== 1) {
            this._touchStart = null;
            return;
        }
        const start = this._touchStart;
        this._touchStart = null;
        const end = e.changedTouches[0];
        const dx = end.clientX - start.x;
        const dy = end.clientY - start.y;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (ax < this.SWIPE_MIN_PX) return;
        if (ax < ay * this.SWIPE_RATIO) return;

        if (dx < 0) {
            this.setTab(this.getTab() + 1);
        } else {
            this.setTab(this.getTab() - 1);
        }
    },

    /** Clicks on tab bar */
    setupTabBarClicks() {
        const bar = document.getElementById('mobile-view-tabs');
        if (!bar) return;
        bar.addEventListener('click', (e) => {
            const btn = e.target.closest('.mobile-view-tab');
            if (!btn || !bar.contains(btn)) return;
            const idx = parseInt(btn.getAttribute('data-mobile-tab'), 10);
            if (idx === 0 || idx === 1 || idx === 2) this.setTab(idx);
        });
    },

    setupSwipeListeners() {
        document.addEventListener(
            'touchstart',
            (e) => {
                this._onTouchStart(e);
            },
            { passive: true }
        );
        document.addEventListener(
            'touchend',
            (e) => {
                this._onTouchEnd(e);
            },
            { passive: true }
        );
    },

    setupMatchMedia() {
        if (!this._mq) {
            this._mq = window.matchMedia(`(max-width: ${this.MOBILE_MAX_WIDTH}px)`);
        }
        const handler = () => this.applyLayoutMode();
        this._boundOnResize = handler;
        try {
            this._mq.addEventListener('change', handler);
        } catch (err) {
            this._mq.addListener(handler);
        }
    },

    init() {
        this.setupTabBarClicks();
        this.setupSwipeListeners();
        this.setupMatchMedia();
        this.applyLayoutMode();
    }
};
