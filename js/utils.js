// Utilities Module
// Helper functions for dates, formatting, notifications, etc.

const Utils = {
    // Date Helpers
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    },

    /** Hora local atual no formato HH:MM (para due_time). */
    getLocalDueTimeNow(d = new Date()) {
        const x = d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
        const hh = String(x.getHours()).padStart(2, '0');
        const mm = String(x.getMinutes()).padStart(2, '0');
        return this.normalizeDueTime(`${hh}:${mm}`);
    },
    
    isToday(dateString) {
        return dateString === this.getTodayDate();
    },
    
    getDayOfWeek() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[new Date().getDay()];
    },
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + (dateString.length === 10 ? 'T12:00:00' : ''));
        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage.replace('_', '-') : 'pt-BR';
        return date.toLocaleDateString(lang, { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    },

    /** Local calendar date YYYY-MM-DD (no UTC shift) */
    dateToYMD(d) {
        const x =
            d instanceof Date && !isNaN(d.getTime())
                ? d
                : new Date();
        const y = x.getFullYear();
        const m = String(x.getMonth() + 1).padStart(2, '0');
        const day = String(x.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    /** YYYY-MM-DD + delta dias no calendário local (para sequências / semanas). */
    ymdAddDays(ymd, deltaDays) {
        if (!ymd || typeof ymd !== 'string') return this.getTodayDate();
        const d = new Date(ymd + 'T12:00:00');
        if (isNaN(d.getTime())) return this.getTodayDate();
        d.setDate(d.getDate() + deltaDays);
        return this.dateToYMD(d);
    },

    /** Monday 00:00 local of the week containing `date` */
    getMondayOfWeek(date) {
        const base =
            date instanceof Date && !isNaN(date.getTime())
                ? date
                : new Date();
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d;
    },

    /** monday..sunday from YYYY-MM-DD */
    ymdToDayOfWeek(ymd) {
        const d = new Date(ymd + 'T12:00:00');
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[d.getDay()];
    },

    /** Normalize time to HH:MM 24h or null */
    normalizeDueTime(value) {
        if (value == null || value === '') return null;
        const s = String(value).trim();
        const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (!m) return null;
        let h = parseInt(m[1], 10);
        let min = parseInt(m[2], 10);
        if (min < 0 || min > 59) return null;
        if (h === 24 && min === 0) return '24:00';
        if (h < 0 || h > 23) return null;
        return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    },

    formatDueTime(hhmm) {
        if (!hhmm) return '';
        return hhmm;
    },

    dueTimeToMinutes(hhmm) {
        if (!hhmm) return null;
        const n = Utils.normalizeDueTime(hhmm);
        if (!n) return null;
        const m = n.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        const hh = parseInt(m[1], 10);
        const mi = parseInt(m[2], 10);
        if (hh === 24 && mi === 0) return 24 * 60;
        return hh * 60 + mi;
    },

    /** Duração do bloco na grelha (minutos), múltiplos de 15. */
    DURATION_MINUTES_DEFAULT: 30,
    DURATION_MINUTES_MIN: 15,
    DURATION_MINUTES_MAX: 480,

    normalizeDurationMinutes(value) {
        if (value == null || value === '') return this.DURATION_MINUTES_DEFAULT;
        const n = typeof value === 'number' ? value : parseInt(String(value), 10);
        if (Number.isNaN(n)) return this.DURATION_MINUTES_DEFAULT;
        const step = 15;
        const snapped = Math.round(n / step) * step;
        return Math.max(
            this.DURATION_MINUTES_MIN,
            Math.min(this.DURATION_MINUTES_MAX, snapped)
        );
    },

    getTaskDurationMinutes(task) {
        if (!task || !task.meta) return this.DURATION_MINUTES_DEFAULT;
        return this.normalizeDurationMinutes(task.meta.duration_minutes);
    },

    // Linkify URLs in text
    linkify(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    },
    
    // Toast Notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    /**
     * Notificação empilhável (canto superior direito) com ação (ex.: desfazer).
     * Várias notificações empilham para baixo e desaparecem automaticamente.
     */
    showActionToast({ message, actionLabel, onAction, timeoutMs = 2000, tone = 'success' }) {
        const stack = document.getElementById('action-toast-stack');
        if (!stack) return;

        const row = document.createElement('div');
        row.className = `action-toast ${tone}`;

        const msg = document.createElement('div');
        msg.className = 'action-toast-message';
        msg.textContent = message || '';

        row.appendChild(msg);

        let acted = false;
        if (actionLabel && typeof onAction === 'function') {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'action-toast-action';
            btn.textContent = actionLabel;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (acted) return;
                acted = true;
                try {
                    onAction();
                } finally {
                    row.remove();
                }
            });
            row.appendChild(btn);
        }

        stack.appendChild(row);

        const t = setTimeout(() => {
            row.remove();
        }, Math.max(250, timeoutMs || 0));

        // Se o elemento sair antes (ex.: ação), limpar timeout.
        row.addEventListener('DOMNodeRemoved', () => clearTimeout(t), { once: true });
    },
    
    // Play beep sound
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
};
