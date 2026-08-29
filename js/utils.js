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

    // ===== Criacao rapida com linguagem natural =====

    QUICK_ADD_WEEKDAYS: {
        domingo: 'sunday', dom: 'sunday',
        segunda: 'monday', seg: 'monday', 'segunda-feira': 'monday',
        terca: 'tuesday', 'terça': 'tuesday', ter: 'tuesday',
        quarta: 'wednesday', qua: 'wednesday',
        quinta: 'thursday', qui: 'thursday',
        sexta: 'friday', sex: 'friday',
        sabado: 'saturday', 'sábado': 'saturday', sab: 'saturday', 'sáb': 'saturday',
        sunday: 'sunday', monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday',
        thursday: 'thursday', friday: 'friday', saturday: 'saturday'
    },

    QUICK_ADD_PRIORITIES: {
        alta: 'high', high: 'high', urgente: 'high',
        media: 'medium', 'média': 'medium', medium: 'medium', normal: 'medium',
        baixa: 'low', low: 'low'
    },

    /** Proxima data (YYYY-MM-DD) para um dia da semana em ingles minusculo */
    nextDateForWeekday(dow, from = new Date()) {
        const order = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const target = order.indexOf(dow);
        if (target === -1) return null;
        const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        let delta = (target - d.getDay() + 7) % 7;
        if (delta === 0) delta = 7; // "quinta" numa quinta = a proxima
        d.setDate(d.getDate() + delta);
        return this.dateToYMD(d);
    },

    /**
     * Interpreta o texto da criacao rapida e devolve
     * { title, due_date, due_time, priority, tags, days_of_week }.
     *
     * Reconhece: #tag  !alta/!media/!baixa  hoje  amanha  "depois de amanha"
     * dias da semana (seg, segunda, monday…)  dd/mm[/aaaa]  14h  14h30  14:30  "as 9"
     * Tudo o que e reconhecido sai do titulo.
     */
    parseQuickAdd(raw) {
        const out = { title: '', due_date: null, due_time: null, priority: null, tags: [], days_of_week: [] };
        let text = ` ${String(raw || '').trim()} `;
        if (!text.trim()) return out;

        const strip = (re) => {
            text = text.replace(re, ' ');
        };

        // #tags
        const tagRe = /(^|\s)#([\p{L}\p{N}_-]{1,24})(?=\s)/gu;
        let m;
        while ((m = tagRe.exec(text)) !== null) {
            out.tags.push(m[2]);
        }
        strip(tagRe);

        // !prioridade
        const prioRe = /(^|\s)!([\p{L}]{3,8})(?=\s)/giu;
        text = text.replace(prioRe, (full, pre, word) => {
            const key = word.toLowerCase();
            const p = this.QUICK_ADD_PRIORITIES[key];
            if (!p) return full;
            out.priority = p;
            return ' ';
        });

        // hora: "as 9" / "às 9h30" (numero sozinho so vale depois de "as")
        //       14h / 14h30 / 14:30
        const timePatterns = [
            /(^|\s)[àa]s\s+(\d{1,2})\s*(?:[:h]\s*(\d{2})?)?(?=\s|$)/i,
            /(^|\s)(\d{1,2})\s*[:h]\s*(\d{2})?(?=\s|$)/i
        ];
        for (const re of timePatterns) {
            const tm = text.match(re);
            if (!tm) continue;
            const hh = parseInt(tm[2], 10);
            const mi = tm[3] ? parseInt(tm[3], 10) : 0;
            if (hh >= 0 && hh <= 23 && mi >= 0 && mi <= 59) {
                out.due_time = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
                text = text.replace(re, ' ');
                break;
            }
        }

        // data explicita dd/mm[/aaaa]
        const dateRe = /(^|\s)(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/i;
        const dm = text.match(dateRe);
        if (dm) {
            const day = parseInt(dm[2], 10);
            const month = parseInt(dm[3], 10);
            let year = dm[4] ? parseInt(dm[4], 10) : new Date().getFullYear();
            if (year < 100) year += 2000;
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                out.due_date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                text = text.replace(dateRe, ' ');
            }
        }

        // hoje / amanha / depois de amanha
        if (!out.due_date) {
            if (/(^|\s)depois de amanh[ãa](?=\s|$)/i.test(text)) {
                out.due_date = this.ymdAddDays(this.getTodayDate(), 2);
                text = text.replace(/(^|\s)depois de amanh[ãa](?=\s|$)/i, ' ');
            } else if (/(^|\s)amanh[ãa](?=\s|$)/i.test(text) || /(^|\s)tomorrow(?=\s|$)/i.test(text)) {
                out.due_date = this.ymdAddDays(this.getTodayDate(), 1);
                text = text.replace(/(^|\s)(amanh[ãa]|tomorrow)(?=\s|$)/i, ' ');
            } else if (/(^|\s)hoje(?=\s|$)/i.test(text) || /(^|\s)today(?=\s|$)/i.test(text)) {
                out.due_date = this.getTodayDate();
                text = text.replace(/(^|\s)(hoje|today)(?=\s|$)/i, ' ');
            }
        }

        // intervalo de dias: "seg a sex", "segunda a sexta"
        const rangeRe = /(^|\s)([\p{L}-]{3,14})\s+(?:a|at[ée]|to)\s+([\p{L}-]{3,14})(?=\s|$)/iu;
        const rm = text.match(rangeRe);
        if (rm) {
            const from = this.QUICK_ADD_WEEKDAYS[rm[2].toLowerCase()];
            const to = this.QUICK_ADD_WEEKDAYS[rm[3].toLowerCase()];
            if (from && to) {
                const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                let i = order.indexOf(from);
                const end = order.indexOf(to);
                for (let guard = 0; guard < 7; guard++) {
                    out.days_of_week.push(order[i]);
                    if (i === end) break;
                    i = (i + 1) % 7;
                }
                text = text.replace(rangeRe, ' ');
            }
        }

        // dias da semana soltos (podem ser varios: "seg qua sex")
        const wdRe = /(^|\s)([\p{L}-]{3,14})(?=\s|$)/giu;
        text = text.replace(wdRe, (full, pre, word) => {
            const key = word.toLowerCase();
            const dow = this.QUICK_ADD_WEEKDAYS[key];
            if (!dow) return full;
            if (!out.days_of_week.includes(dow)) out.days_of_week.push(dow);
            return ' ';
        });

        if (out.days_of_week.length && !out.due_date) {
            out.due_date = this.nextDateForWeekday(out.days_of_week[0]);
        }

        out.title = text.replace(/\s+/g, ' ').trim();
        return out;
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
            // guardado para o Ctrl+Z global
            this.lastUndo = {
                run: () => {
                    if (acted) return false;
                    acted = true;
                    try {
                        onAction();
                    } finally {
                        if (typeof row._dismiss === 'function') row._dismiss();
                        else row.remove();
                        this.lastUndo = null;
                    }
                    return true;
                }
            };
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
                    if (typeof row._dismiss === 'function') row._dismiss();
                    else row.remove();
                }
            });
            row.appendChild(btn);
        }

        stack.appendChild(row);

        // Remocao unica: o timeout e cancelado por quem remover primeiro.
        // (Antes usava-se DOMNodeRemoved, um mutation event ja removido das specs
        // que nunca chegava a disparar — o timer ficava pendurado.)
        const dismiss = () => {
            clearTimeout(timer);
            row.remove();
        };
        const timer = setTimeout(dismiss, Math.max(250, timeoutMs || 0));
        row._dismiss = dismiss;
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
