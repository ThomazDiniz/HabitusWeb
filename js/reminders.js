// Reminders — Notification API when due_time matches today (todos + hábitos)

const RemindersManager = {
    INTERVAL_MS: 30000,
    STORAGE_FIRED: 'habitus_reminder_fired_v1',
    _timer: null,

    init() {
        if (typeof Notification === 'undefined') return;
        this._timer = setInterval(() => this.tick(), this.INTERVAL_MS);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.tick();
        });
        setTimeout(() => this.tick(), 1500);
    },

    isSupported() {
        return typeof Notification !== 'undefined';
    },

    isEnabled() {
        return !!(DataManager.appData.settings && DataManager.appData.settings.remindersEnabled);
    },

    setEnabled(on) {
        if (!DataManager.appData.settings) DataManager.appData.settings = {};
        DataManager.appData.settings.remindersEnabled = !!on;
        DataManager.saveData();
        this.syncToggleButton();
    },

    toggle() {
        if (!this.isSupported()) {
            Utils.showToast(t('remindersNotSupported'), 'error');
            return;
        }
        if (this.isEnabled()) {
            this.setEnabled(false);
            Utils.showToast(t('remindersDisabledToast'), 'success');
            return;
        }
        if (Notification.permission === 'denied') {
            Utils.showToast(t('remindersPermissionDenied'), 'error');
            return;
        }
        const apply = () => {
            this.setEnabled(true);
            Utils.showToast(t('remindersEnabledToast'), 'success');
        };
        if (Notification.permission === 'granted') {
            apply();
            return;
        }
        Notification.requestPermission().then((perm) => {
            if (perm === 'granted') apply();
            else Utils.showToast(t('remindersPermissionDenied'), 'error');
        });
    },

    tick() {
        if (!this.isEnabled() || Notification.permission !== 'granted') return;
        const today = Utils.dateToYMD(new Date());
        const nowHHMM = this._currentHHMM();
        this._pruneFired(today);
        const tasks = DataManager.getAllTasks().filter((x) => !x.is_deleted);
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (!task.due_time) continue;
            const tnorm = Utils.normalizeDueTime(task.due_time);
            if (!tnorm || tnorm !== nowHHMM) continue;
            if (!this._taskEligible(task, today)) continue;
            const key = this._firedKey(task, today, tnorm);
            if (this._wasFired(key)) continue;
            this._markFired(key, today);
            try {
                new Notification(t('reminderNotificationTitle'), {
                    body: task.title || t('title'),
                    tag: `habitus-reminder-${task.id}-${today}`,
                    silent: false
                });
            } catch (err) {
                console.warn('Reminder notification failed', err);
            }
        }
    },

    _taskEligible(task, todayYmd) {
        if (task.task_type === 'todo') {
            if (task.status === 'done') return false;
            if (task.due_date !== todayYmd) return false;
            return true;
        }
        if (task.task_type === 'daily') {
            if (!TasksManager.isDailyScheduledForToday(task)) return false;
            if (task.status === 'done' && Utils.isToday(task.last_completed_date)) return false;
            return true;
        }
        return false;
    },

    _currentHHMM() {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },

    _firedKey(task, today, hhmm) {
        return `${task.id}|${today}|${hhmm}`;
    },

    _wasFired(key) {
        const s = this._readStorage();
        return Object.prototype.hasOwnProperty.call(s, key);
    },

    _markFired(key, today) {
        const s = this._readStorage();
        s[key] = today;
        this._writeStorage(s);
    },

    _pruneFired(today) {
        const s = this._readStorage();
        let changed = false;
        Object.keys(s).forEach((k) => {
            if (s[k] !== today) {
                delete s[k];
                changed = true;
            }
        });
        if (changed) this._writeStorage(s);
    },

    _readStorage() {
        try {
            const raw = localStorage.getItem(this.STORAGE_FIRED);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    },

    _writeStorage(obj) {
        try {
            localStorage.setItem(this.STORAGE_FIRED, JSON.stringify(obj));
        } catch (e) {
            console.warn('reminder fired storage', e);
        }
    },

    setupToggleButton() {
        const btn = document.getElementById('reminders-toggle-btn');
        if (!btn) return;
        btn.addEventListener('click', () => this.toggle());
        this.syncToggleButton();
    },

    syncToggleButton() {
        const btn = document.getElementById('reminders-toggle-btn');
        if (!btn) return;
        const on = this.isEnabled() && this.isSupported() && Notification.permission === 'granted';
        btn.classList.toggle('is-active', on);
        btn.textContent = on ? '🔔' : '🔕';
        const title = on ? t('remindersDisableTitle') : t('remindersEnableTitle');
        btn.title = title;
        btn.setAttribute('aria-label', title);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
};
