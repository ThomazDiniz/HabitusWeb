// Week calendar (Mon–Sun): todos by due_date, dailies by weekday; time grid drop sets due_time; untimed zone clears time

const WeekCalendarManager = {
    weekStart: null,
    START_HOUR: 5,
    END_HOUR: 22,
    SNAP_MINUTES: 15,

    ensureWeekStart() {
        if (
            !this.weekStart ||
            !(this.weekStart instanceof Date) ||
            isNaN(this.weekStart.getTime())
        ) {
            this.weekStart = Utils.getMondayOfWeek(new Date());
        }
    },

    init() {
        this.ensureWeekStart();
        const prev = document.getElementById('week-cal-prev');
        const next = document.getElementById('week-cal-next');
        const todayBtn = document.getElementById('week-cal-today');
        if (prev) prev.addEventListener('click', () => this.shiftWeek(-7));
        if (next) next.addEventListener('click', () => this.shiftWeek(7));
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.weekStart = Utils.getMondayOfWeek(new Date());
                this.render();
            });
        }
        this.startLiveClock();
    },

    /** Minutes from midnight (local), fractional for sub-minute line position */
    nowLocalMinutesFloat() {
        const n = new Date();
        return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60 + n.getMilliseconds() / 60000;
    },

    /** Vertical position 0–100 within timeline (START_HOUR–END_HOUR); clamped */
    nowLineTopPct() {
        const startM = this.START_HOUR * 60;
        const endM = this.END_HOUR * 60;
        const total = endM - startM;
        const now = this.nowLocalMinutesFloat();
        if (now <= startM) return 0;
        if (now >= endM) return 100;
        return ((now - startM) / total) * 100;
    },

    isTodayVisibleInWeek() {
        const todayYmd = Utils.getTodayDate();
        return this.getWeekDates().some((d) => Utils.dateToYMD(d) === todayYmd);
    },

    updateNowClockDisplay() {
        const clockEl = document.getElementById('header-today-clock');
        const dateEl = document.getElementById('header-today-date');
        const n = new Date();
        if (clockEl) {
            const h = String(n.getHours()).padStart(2, '0');
            const mi = String(n.getMinutes()).padStart(2, '0');
            const s = String(n.getSeconds()).padStart(2, '0');
            clockEl.textContent = `${h}:${mi}:${s}`;
            clockEl.setAttribute('datetime', n.toISOString());
        }
        if (dateEl) {
            const lang = typeof currentLanguage !== 'undefined' ? currentLanguage.replace('_', '-') : 'pt-BR';
            dateEl.textContent = n.toLocaleDateString(lang, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
    },

    updateNowLine() {
        const root = document.getElementById('week-calendar-root');
        if (!root) return;
        root.querySelectorAll('.week-cal-now-line, .week-cal-now-line-gutter').forEach((n) => n.remove());
        const gutter = root.querySelector('.week-cal-time-gutter');
        const top = this.nowLineTopPct();
        const n = new Date();
        const hhmm = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
        const tip = typeof t === 'function' ? `${t('weekCalendarNowLine')} (${hhmm})` : hhmm;

        if (gutter && this.isTodayVisibleInWeek()) {
            const g = document.createElement('div');
            g.className = 'week-cal-now-line-gutter';
            g.style.top = `${top}%`;
            g.title = tip;
            gutter.appendChild(g);
        }

        if (!this.isTodayVisibleInWeek()) return;
        const todayYmd = Utils.getTodayDate();
        const tl = root.querySelector(`.week-cal-timeline.is-today[data-date="${todayYmd}"]`);
        if (!tl) return;
        const line = document.createElement('div');
        line.className = 'week-cal-now-line';
        line.title = tip;
        line.style.top = `${top}%`;
        tl.appendChild(line);
    },

    startLiveClock() {
        if (this._nowTimerId) {
            clearInterval(this._nowTimerId);
            this._nowTimerId = null;
        }
        const tick = () => {
            this.updateNowClockDisplay();
            this.updateNowLine();
        };
        tick();
        this._nowTimerId = setInterval(tick, 1000);
    },

    shiftWeek(deltaDays) {
        this.ensureWeekStart();
        const d = new Date(this.weekStart.getFullYear(), this.weekStart.getMonth(), this.weekStart.getDate());
        d.setDate(d.getDate() + deltaDays);
        this.weekStart = d;
        this.render();
    },

    getWeekDates() {
        this.ensureWeekStart();
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(this.weekStart.getFullYear(), this.weekStart.getMonth(), this.weekStart.getDate());
            d.setDate(d.getDate() + i);
            dates.push(d);
        }
        return dates;
    },

    totalMinutes() {
        return (this.END_HOUR - this.START_HOUR) * 60;
    },

    /** Y position (client) → HH:MM snapped, same scale as positionTimedEvent */
    timeFromTimelineClientY(timelineEl, clientY) {
        const rect = timelineEl.getBoundingClientRect();
        let ratio = (clientY - rect.top) / rect.height;
        ratio = Math.max(0, Math.min(1, ratio));
        const startM = this.START_HOUR * 60;
        const endM = this.END_HOUR * 60;
        const total = endM - startM;
        let minuteOfDay = startM + ratio * total;
        const snap = this.SNAP_MINUTES;
        minuteOfDay = Math.round((minuteOfDay - startM) / snap) * snap + startM;
        const lastStart = endM - snap;
        minuteOfDay = Math.max(startM, Math.min(lastStart, minuteOfDay));
        const h = Math.floor(minuteOfDay / 60);
        const mi = minuteOfDay % 60;
        return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
    },

    positionTimedEvent(task) {
        const mins = Utils.dueTimeToMinutes(task.due_time);
        if (mins == null) return null;
        const startM = this.START_HOUR * 60;
        const endM = this.END_HOUR * 60;
        let m = mins;
        if (m < startM) m = startM;
        if (m >= endM) m = endM - 30;
        const rel = m - startM;
        const total = this.totalMinutes();
        const topPct = (rel / total) * 100;
        const slotPct = (30 / total) * 100;
        const heightPct = Math.max(slotPct, 7.5);
        return { topPct, heightPct };
    },

    itemsForDay(ymd) {
        const items = [];
        const all = DataManager.appData.tasks;
        if (!Array.isArray(all)) return items;
        all.forEach((t) => {
            if (t.is_deleted) return;
            if (t.task_type === 'todo' && t.due_date === ymd) {
                items.push(t);
            } else if (t.task_type === 'daily' && TasksManager.isDailyScheduledOnDate(t, ymd)) {
                items.push(t);
            }
        });
        return items;
    },

    /** Diárias concluídas na semana visível (uma entrada por tarefa, primeiro dia encontrado). Todos concluídas ficam nas colunas. */
    completedItemsForWeek(dates) {
        const out = [];
        const seen = new Set();
        dates.forEach((d) => {
            const ymd = Utils.dateToYMD(d);
            this.itemsForDay(ymd).forEach((task) => {
                if (task.task_type !== 'daily' || task.status !== 'done') return;
                if (seen.has(task.id)) return;
                seen.add(task.id);
                out.push({ task, ymd });
            });
        });
        return out;
    },

    renderCompletedAside(dates) {
        const entries = this.completedItemsForWeek(dates);
        if (entries.length === 0) return '';
        const title = this.escapeHtml(t('weekCalendarCompletedTitle'));
        const aria = this.escapeAttr(t('weekCalendarCompletedTitle'));
        let h = `<aside class="week-cal-completed-aside" aria-label="${aria}">`;
        h += `<h3 class="week-cal-completed-heading">${title}</h3>`;
        h += '<div class="week-cal-completed-list">';
        entries.forEach(({ task, ymd }) => {
            const dateStr = Utils.formatDate(ymd);
            h += `<div class="week-cal-completed-item" data-date="${ymd}">`;
            h += `<span class="week-cal-completed-date">${this.escapeHtml(dateStr)}</span>`;
            h += `<div class="week-cal-completed-chip-wrap">${this.renderChipHtml(task)}</div>`;
            h += '</div>';
        });
        h += '</div></aside>';
        return h;
    },

    hasCalendarDrag(types) {
        if (!types) return false;
        const t = Array.from(types);
        return t.includes('application/x-habitus-task-id');
    },

    /**
     * Assign task to target day; optional due_time (null = no time / untimed zone).
     * sourceYmd: when dragging from another calendar column (chip/block), weekday may move for dailies.
     */
    applyDrop(taskId, targetYmd, dueTime, sourceYmd) {
        const task = DataManager.findTask(parseFloat(taskId, 10));
        if (!task || task.is_deleted) return;

        const targetDow = Utils.ymdToDayOfWeek(targetYmd);
        const sourceDow = sourceYmd ? Utils.ymdToDayOfWeek(sourceYmd) : null;
        const crossDay = sourceYmd && sourceYmd !== targetYmd;

        if (task.task_type === 'todo') {
            TasksManager.updateTask(task.id, {
                due_date: targetYmd,
                due_time: dueTime
            });
        } else {
            let days = [...(task.meta?.days_of_week || [])];
            if (crossDay && sourceDow) {
                days = days.filter((d) => d !== sourceDow);
            }
            if (!days.includes(targetDow)) {
                days.push(targetDow);
                const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                days.sort((a, b) => order.indexOf(a) - order.indexOf(b));
            }
            if (days.length === 0) {
                days = [targetDow];
            }
            TasksManager.updateTask(task.id, {
                days_of_week: days,
                due_time: dueTime
            });
        }

        if (typeof RenderManager !== 'undefined') {
            RenderManager.renderAll();
        }
    },

    bindCalendarItemDrag(handleEl, sourceYmd) {
        handleEl.setAttribute('draggable', 'true');
        handleEl.addEventListener('dragstart', (e) => {
            const card = handleEl.closest('.week-cal-chip, .week-cal-block');
            const id = card && card.getAttribute('data-task-id');
            if (!id) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData('application/x-habitus-task-id', String(id));
            e.dataTransfer.setData('application/x-habitus-source-ymd', sourceYmd || '');
            e.dataTransfer.effectAllowed = 'move';
            if (card) card.classList.add('week-cal-dragging');
        });
        handleEl.addEventListener('dragend', () => {
            const card = handleEl.closest('.week-cal-chip, .week-cal-block');
            if (card) card.classList.remove('week-cal-dragging');
            document.querySelectorAll('.week-cal-timeline.week-cal-drop-hover, .week-cal-untimed.week-cal-drop-hover').forEach((x) => {
                x.classList.remove('week-cal-drop-hover');
            });
        });
    },

    readSourceYmd(e) {
        try {
            return e.dataTransfer.getData('application/x-habitus-source-ymd') || '';
        } catch (err) {
            return '';
        }
    },

    bindUntimedDrop(el, ymd) {
        el.addEventListener('dragover', (e) => {
            if (!this.hasCalendarDrag(e.dataTransfer.types)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            el.classList.add('week-cal-drop-hover');
        });
        el.addEventListener('dragleave', (e) => {
            if (!el.contains(e.relatedTarget)) {
                el.classList.remove('week-cal-drop-hover');
            }
        });
        el.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.remove('week-cal-drop-hover');
            const id = e.dataTransfer.getData('application/x-habitus-task-id');
            if (!id) return;
            const sourceYmd = this.readSourceYmd(e);
            this.applyDrop(id, ymd, null, sourceYmd || null);
        });
    },

    bindTimelineDrop(timelineEl, ymd) {
        const onDragOver = (e) => {
            if (!this.hasCalendarDrag(e.dataTransfer.types)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            timelineEl.classList.add('week-cal-drop-hover');
        };

        const onDragLeave = (e) => {
            if (!timelineEl.contains(e.relatedTarget)) {
                timelineEl.classList.remove('week-cal-drop-hover');
            }
        };

        const onDrop = (e) => {
            if (!this.hasCalendarDrag(e.dataTransfer.types)) return;
            e.preventDefault();
            e.stopPropagation();
            timelineEl.classList.remove('week-cal-drop-hover');
            const id = e.dataTransfer.getData('application/x-habitus-task-id');
            if (!id) return;
            const sourceYmd = this.readSourceYmd(e);
            const hhmm = this.timeFromTimelineClientY(timelineEl, e.clientY);
            this.applyDrop(id, ymd, hhmm, sourceYmd || null);
        };

        timelineEl.addEventListener('dragover', onDragOver);
        timelineEl.addEventListener('dragleave', onDragLeave);
        timelineEl.addEventListener('drop', onDrop);

        timelineEl.addEventListener('dblclick', (e) => {
            if (e.target.closest('.week-cal-block, .week-cal-edit-btn, .week-cal-done-btn')) return;
            e.preventDefault();
            const hhmm = this.timeFromTimelineClientY(timelineEl, e.clientY);
            if (typeof ModalManager !== 'undefined') {
                ModalManager.openTaskModal(null, 'todo', {
                    prefillDueDate: ymd,
                    prefillDueTime: hhmm
                });
            }
        });

        timelineEl.querySelectorAll('.week-cal-block').forEach((block) => {
            block.addEventListener('dragover', onDragOver);
            block.addEventListener('dragleave', onDragLeave);
            block.addEventListener('drop', (e) => {
                if (!this.hasCalendarDrag(e.dataTransfer.types)) return;
                e.preventDefault();
                e.stopPropagation();
                timelineEl.classList.remove('week-cal-drop-hover');
                const id = e.dataTransfer.getData('application/x-habitus-task-id');
                if (!id) return;
                const sourceYmd = this.readSourceYmd(e);
                const hhmm = this.timeFromTimelineClientY(timelineEl, e.clientY);
                this.applyDrop(id, ymd, hhmm, sourceYmd || null);
            });
        });
    },

    pencilIcon() {
        return '<svg class="week-cal-edit-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    },

    checkIcon() {
        return '<svg class="week-cal-done-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
    },

    escapeAttr(s) {
        return this.escapeHtml(s || '').replace(/"/g, '&quot;');
    },

    renderChipHtml(task) {
        const done = task.status === 'done';
        const typeClass = task.task_type === 'daily' ? 'is-daily' : 'is-todo';
        const dragHint = this.escapeAttr(t('weekCalendarDragHandle'));
        const editLabel = this.escapeAttr(t('edit'));
        const completeLabel = this.escapeAttr(t('complete'));
        return `<div class="week-cal-chip ${typeClass} ${done ? 'is-done' : ''}" data-task-id="${task.id}">
            <span class="week-cal-drag-handle" draggable="true" title="${dragHint}">⋮</span>
            <span class="week-cal-chip-title">${this.escapeHtml(task.title)}</span>
            <button type="button" class="week-cal-done-btn${done ? ' is-active' : ''}" data-task-id="${task.id}" draggable="false" aria-label="${completeLabel}">${this.checkIcon()}</button>
            <button type="button" class="week-cal-edit-btn" data-task-id="${task.id}" draggable="false" aria-label="${editLabel}">${this.pencilIcon()}</button>
        </div>`;
    },

    renderBlockHtml(task) {
        const pos = this.positionTimedEvent(task);
        if (!pos) return '';
        const done = task.status === 'done';
        const typeClass = task.task_type === 'daily' ? 'is-daily' : 'is-todo';
        const dragHint = this.escapeAttr(t('weekCalendarDragHandle'));
        const editLabel = this.escapeAttr(t('edit'));
        const completeLabel = this.escapeAttr(t('complete'));
        return `<div class="week-cal-block ${typeClass} ${done ? 'is-done' : ''}" style="top:${pos.topPct}%;height:${pos.heightPct}%" data-task-id="${task.id}">
            <span class="week-cal-drag-handle" draggable="true" title="${dragHint}">⋮</span>
            <span class="week-cal-block-title">${this.escapeHtml(task.title)}</span>
            <button type="button" class="week-cal-done-btn${done ? ' is-active' : ''}" data-task-id="${task.id}" draggable="false" aria-label="${completeLabel}">${this.checkIcon()}</button>
            <button type="button" class="week-cal-edit-btn" data-task-id="${task.id}" draggable="false" aria-label="${editLabel}">${this.pencilIcon()}</button>
        </div>`;
    },

    bindInlineTitle(titleEl, taskIdStr) {
        const startEdit = (e) => {
            if (e) e.stopPropagation();
            if (titleEl.getAttribute('contenteditable') === 'true') return;
            titleEl.contentEditable = 'true';
            titleEl.focus();
            const range = document.createRange();
            range.selectNodeContents(titleEl);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        };

        titleEl.addEventListener('click', (e) => {
            e.stopPropagation();
            startEdit(e);
        });

        titleEl.addEventListener('blur', () => {
            titleEl.contentEditable = 'false';
            const id = parseFloat(taskIdStr, 10);
            const text = titleEl.textContent.trim();
            const task = DataManager.findTask(id);
            if (task && text !== (task.title || '')) {
                TasksManager.updateTask(id, { title: text });
                if (typeof RenderManager !== 'undefined') {
                    RenderManager.renderAll();
                }
            } else if (task) {
                titleEl.textContent = task.title || '';
            }
        });

        titleEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleEl.blur();
            }
        });
    },

    bindCalendarCardUI(root) {
        root.querySelectorAll('.week-cal-drag-handle').forEach((handle) => {
            const host = handle.closest('[data-date]');
            const ymd = host && host.getAttribute('data-date');
            if (ymd) this.bindCalendarItemDrag(handle, ymd);
        });

        root.querySelectorAll('.week-cal-chip-title').forEach((el) => {
            const row = el.closest('[data-task-id]');
            const id = row && row.getAttribute('data-task-id');
            if (id) this.bindInlineTitle(el, id);
        });

        root.querySelectorAll('.week-cal-block-title').forEach((el) => {
            const row = el.closest('[data-task-id]');
            const id = row && row.getAttribute('data-task-id');
            if (id) this.bindInlineTitle(el, id);
        });

        root.querySelectorAll('.week-cal-edit-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const id = parseFloat(btn.getAttribute('data-task-id'), 10);
                const task = DataManager.findTask(id);
                if (task && typeof ModalManager !== 'undefined') {
                    ModalManager.openTaskModal(task);
                }
            });
        });

        root.querySelectorAll('.week-cal-done-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const id = parseFloat(btn.getAttribute('data-task-id'), 10);
                if (!id) return;
                TasksManager.toggleTaskStatus(id);
                if (typeof RenderManager !== 'undefined') {
                    RenderManager.renderAll();
                }
            });
        });
    },

    render() {
        this.ensureWeekStart();
        const root = document.getElementById('week-calendar-root');
        if (!root) return;

        const dates = this.getWeekDates();
        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage.replace('_', '-') : 'pt-BR';
        const rangeSpan = document.getElementById('week-calendar-range');
        if (rangeSpan) {
            rangeSpan.textContent = `${Utils.formatDate(Utils.dateToYMD(dates[0]))} – ${Utils.formatDate(Utils.dateToYMD(dates[6]))}`;
        }

        const hours = [];
        for (let h = this.START_HOUR; h < this.END_HOUR; h++) {
            hours.push(h);
        }

        let html = '<div class="week-cal-outer">';
        html += '<div class="week-cal-layout">';
        html += '<div class="week-cal-corner"></div>';
        html += '<div class="week-cal-day-headers">';
        dates.forEach((d) => {
            const ymd = Utils.dateToYMD(d);
            const isToday = Utils.isToday(ymd);
            const weekday = d.toLocaleDateString(lang, { weekday: 'short' });
            const fullDate = d.toLocaleDateString(lang, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const dow = Utils.ymdToDayOfWeek(ymd);
            html += `<div class="week-cal-day-header ${isToday ? 'is-today' : ''}" data-date="${ymd}">
                <span class="week-cal-dow">${weekday}</span>
                <span class="week-cal-date-full">${fullDate}</span>
                ${isToday ? `<span class="week-cal-today-pill">${this.escapeHtml(t('weekCalendarToday'))}</span>` : ''}
                <div class="week-cal-header-actions">
                    <button type="button" class="week-cal-mini-btn week-cal-add-task-btn" data-date="${ymd}" title="${this.escapeAttr(t('weekCalendarAddTask'))}">+</button>
                    <button type="button" class="week-cal-mini-btn week-cal-add-daily-btn" data-dow="${dow}" title="${this.escapeAttr(t('weekCalendarAddDaily'))}">☀</button>
                </div>
            </div>`;
        });
        html += '</div>';

        html += '<div class="week-cal-untimed-spacer"></div>';

        dates.forEach((d, i) => {
            const ymd = Utils.dateToYMD(d);
            const isToday = Utils.isToday(ymd);
            const items = this.itemsForDay(ymd);
            const timed = [];
            const untimed = [];
            items.forEach((task) => {
                if (task.status === 'done' && task.task_type === 'daily') return;
                const nt = task.due_time ? Utils.normalizeDueTime(task.due_time) : null;
                if (nt) timed.push(task);
                else untimed.push(task);
            });
            timed.sort((a, b) => {
                const ma = Utils.dueTimeToMinutes(a.due_time) || 0;
                const mb = Utils.dueTimeToMinutes(b.due_time) || 0;
                return ma - mb;
            });

            const edge = i === dates.length - 1 ? ' week-cal-col-edge' : '';
            const col = 2 + i;
            html += `<div class="week-cal-untimed${isToday ? ' is-today' : ''}${edge}" data-date="${ymd}" style="grid-column:${col};grid-row:2">`;
            untimed.forEach((task) => {
                html += this.renderChipHtml(task);
            });
            html += '</div>';
        });

        html += '<div class="week-cal-time-gutter">';
        hours.forEach((h) => {
            html += `<div class="week-cal-hour-label">${String(h).padStart(2, '0')}:00</div>`;
        });
        html += '</div>';

        dates.forEach((d, i) => {
            const ymd = Utils.dateToYMD(d);
            const isToday = Utils.isToday(ymd);
            const items = this.itemsForDay(ymd);
            const timed = [];
            items.forEach((task) => {
                if (task.status === 'done' && task.task_type === 'daily') return;
                const nt = task.due_time ? Utils.normalizeDueTime(task.due_time) : null;
                if (nt) timed.push(task);
            });
            timed.sort((a, b) => {
                const ma = Utils.dueTimeToMinutes(a.due_time) || 0;
                const mb = Utils.dueTimeToMinutes(b.due_time) || 0;
                return ma - mb;
            });

            const edge = i === dates.length - 1 ? ' week-cal-col-edge' : '';
            const col = 2 + i;
            html += `<div class="week-cal-timeline${isToday ? ' is-today' : ''}${edge}" data-date="${ymd}" style="grid-column:${col};grid-row:3;--week-cal-hours:${hours.length}">`;
            timed.forEach((task) => {
                html += this.renderBlockHtml(task);
            });
            html += '</div>';
        });

        html += '</div>';
        html += this.renderCompletedAside(dates);
        html += '</div>';

        root.innerHTML = html;

        root.querySelectorAll('.week-cal-add-task-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ymd = btn.getAttribute('data-date');
                if (typeof ModalManager !== 'undefined') {
                    ModalManager.openTaskModal(null, 'todo', { prefillDueDate: ymd });
                }
            });
        });

        root.querySelectorAll('.week-cal-add-daily-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dow = btn.getAttribute('data-dow');
                if (typeof ModalManager !== 'undefined') {
                    ModalManager.openTaskModal(null, 'daily', { prefillDailyDay: dow });
                }
            });
        });

        root.querySelectorAll('.week-cal-timeline[data-date]').forEach((timeline) => {
            const ymd = timeline.getAttribute('data-date');
            const untimed = root.querySelector(`.week-cal-untimed[data-date="${ymd}"]`);
            if (untimed) this.bindUntimedDrop(untimed, ymd);
            this.bindTimelineDrop(timeline, ymd);
        });

        this.bindCalendarCardUI(root);
        this.updateNowClockDisplay();
        this.updateNowLine();
    },

    escapeHtml(s) {
        if (!s) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }
};
