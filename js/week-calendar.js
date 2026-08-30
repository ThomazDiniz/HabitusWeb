// Week calendar (Mon–Sun or today-only): time grid 05:00–24:00 local (meia-noite); todos by due_date, dailies by weekday; DnD sets due_time

const WeekCalendarManager = {
    weekStart: null,
    /** When true, the grid shows only today's column (toggle with week view). */
    todayOnlyView: false,
    /**
     * Faixa horaria VISIVEL da grelha. Ja nao e fixa em 05:00–24:00: a cada render
     * ajusta-se ao que existe na semana (ver computeVisibleHourRange), partindo de
     * 07:00–23:00 e alargando so quando ha itens (ou o "agora") fora disso.
     * Resultado: menos horas mortas e mais altura por hora util.
     */
    START_HOUR: 8,
    END_HOUR: 20,
    /** A grelha nunca comeca depois desta hora nem acaba antes desta outra. */
    LATEST_START_HOUR: 9,
    EARLIEST_END_HOUR: 19,
    /** Margem de uma hora antes do primeiro item e depois do ultimo. */
    HOUR_PADDING: 1,
    MIN_HOURS_SPAN: 8,
    /** Snap ao largar / pré-visualização na grelha de tempo (arrastar). */
    SNAP_MINUTES: 30,
    /** Task em arrasto (listas ou calendário); `getData` em dragover nem sempre existe no Chrome. */
    _calendarDragTaskId: null,
    _CAL_VIEW_STORAGE_KEY: 'habitus-week-cal-today-only',

    /** Narrow phone layout: calendar column is today-only (see mobile-views.js breakpoint). */
    isMobileCalendarCompact() {
        return (
            typeof window.matchMedia !== 'undefined' &&
            window.matchMedia('(max-width: 640px)').matches
        );
    },

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
        this.loadCalendarViewMode();
        const prev = document.getElementById('week-cal-prev');
        const next = document.getElementById('week-cal-next');
        const todayBtn = document.getElementById('week-cal-today');
        const viewToggle = document.getElementById('week-cal-view-toggle');
        if (prev) prev.addEventListener('click', () => this.shiftWeek(-7));
        if (next) next.addEventListener('click', () => this.shiftWeek(7));
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.weekStart = Utils.getMondayOfWeek(new Date());
                this.render();
            });
        }
        if (viewToggle) {
            viewToggle.addEventListener('click', () => {
                this.todayOnlyView = !this.todayOnlyView;
                this.saveCalendarViewMode();
                this.render();
            });
        }
        document.addEventListener(
            'dragend',
            () => {
                this._calendarDragTaskId = null;
                this.clearAllTimelineDropPreviews();
            },
            true
        );
        this.startLiveClock();
    },

    clearAllTimelineDropPreviews() {
        document.querySelectorAll('.week-cal-drop-preview').forEach((n) => n.remove());
    },

    updateTimelineDropPreview(timelineEl, clientY) {
        this.clearAllTimelineDropPreviews();
        const id = this._calendarDragTaskId;
        if (!id) return;
        const task = DataManager.findTask(id);
        if (!task || task.is_deleted) return;
        const hhmm = this.timeFromTimelineClientY(timelineEl, clientY);
        const pos = this.positionTimedEvent({ due_time: hhmm, meta: task.meta });
        if (!pos) return;
        const typeClass = task.task_type === 'daily' ? 'is-daily' : 'is-todo';
        const div = document.createElement('div');
        div.className = `week-cal-drop-preview week-cal-block ${typeClass}`;
        div.style.top = `${pos.topPct}%`;
        div.style.height = `${pos.heightPct}%`;
        const title = document.createElement('span');
        title.className = 'week-cal-block-title';
        title.textContent = task.title || '';
        div.appendChild(title);
        timelineEl.appendChild(div);
    },

    loadCalendarViewMode() {
        try {
            const v = localStorage.getItem(this._CAL_VIEW_STORAGE_KEY);
            this.todayOnlyView = v === '1';
        } catch (e) {
            /* ignore */
        }
    },

    saveCalendarViewMode() {
        try {
            localStorage.setItem(this._CAL_VIEW_STORAGE_KEY, this.todayOnlyView ? '1' : '0');
        } catch (e) {
            /* ignore */
        }
    },

    /** Local midnight Date for today (visible day in today-only mode). */
    getTodayOnlyDate() {
        const ymd = Utils.getTodayDate();
        const parts = ymd.split('-').map((x) => parseInt(x, 10));
        if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date();
        return new Date(parts[0], parts[1] - 1, parts[2]);
    },

    /** Dates shown as columns: full Mon–Sun week or single today. */
    getVisibleDates() {
        if (this.isMobileCalendarCompact()) {
            return [this.getTodayOnlyDate()];
        }
        if (this.todayOnlyView) {
            return [this.getTodayOnlyDate()];
        }
        return this.getWeekDates();
    },

    syncToolbar() {
        const titleEl = document.getElementById('week-calendar-title');
        const toggleBtn = document.getElementById('week-cal-view-toggle');
        const prev = document.getElementById('week-cal-prev');
        const next = document.getElementById('week-cal-next');
        if (typeof t !== 'function') return;
        const mobile = this.isMobileCalendarCompact();
        const todayOnly = mobile || this.todayOnlyView;
        if (titleEl) {
            titleEl.textContent = todayOnly ? t('weekCalendarTitleToday') : t('weekCalendar');
        }
        if (toggleBtn) {
            if (mobile) {
                toggleBtn.style.display = 'none';
            } else {
                toggleBtn.style.display = '';
                toggleBtn.setAttribute('aria-pressed', this.todayOnlyView ? 'true' : 'false');
                toggleBtn.textContent = this.todayOnlyView ? t('weekCalendarShowWeek') : t('weekCalendarShowTodayOnly');
                toggleBtn.title = this.todayOnlyView ? t('weekCalendarShowWeekTitle') : t('weekCalendarShowTodayOnlyTitle');
                toggleBtn.classList.toggle('is-active', this.todayOnlyView);
            }
        }
        if (prev) prev.disabled = todayOnly;
        if (next) next.disabled = todayOnly;
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

    isTodayInVisibleGrid() {
        const todayYmd = Utils.getTodayDate();
        return this.getVisibleDates().some((d) => Utils.dateToYMD(d) === todayYmd);
    },

    updateNowClockDisplay() {
        const clockEl = document.getElementById('header-today-clock');
        const dateEl = document.getElementById('header-today-date');
        const n = new Date();
        if (clockEl) {
            const h = String(n.getHours()).padStart(2, '0');
            const mi = String(n.getMinutes()).padStart(2, '0');
            // HH:MM — os segundos forcavam um repaint do header a cada segundo
            const next = `${h}:${mi}`;
            if (clockEl.textContent !== next) {
                clockEl.textContent = next;
                clockEl.setAttribute('datetime', n.toISOString());
            }
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
        const roots = [document.getElementById('week-calendar-root')].filter(Boolean);
        if (roots.length === 0) return;

        const top = this.nowLineTopPct();
        const n = new Date();
        const hhmm = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
        const tip = typeof t === 'function' ? `${t('weekCalendarNowLine')} (${hhmm})` : hhmm;

        const todayYmd = Utils.getTodayDate();
        roots.forEach((root) => {
            root.querySelectorAll('.week-cal-now-line, .week-cal-now-line-gutter').forEach((x) => x.remove());
            const gutter = root.querySelector('.week-cal-time-gutter');
            if (gutter) {
                const g = document.createElement('div');
                g.className = 'week-cal-now-line-gutter';
                g.style.top = `${top}%`;
                g.title = tip;
                gutter.appendChild(g);
            }
            const tl = root.querySelector(`.week-cal-timeline.is-today[data-date="${todayYmd}"]`);
            if (!tl) return;
            const line = document.createElement('div');
            line.className = 'week-cal-now-line';
            line.title = tip;
            line.style.top = `${top}%`;
            tl.appendChild(line);
        });
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
        // 15s chega para o relogio (HH:MM) e para a linha do agora — a 1s
        // reconstruia-se a linha e repintava-se o header 60x por minuto
        this._nowTimerId = setInterval(tick, 15000);
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
        if (m >= endM) m = endM - this.SNAP_MINUTES;
        const rel = m - startM;
        const total = this.totalMinutes();
        const topPct = (rel / total) * 100;

        let durationM = Utils.getTaskDurationMinutes(task);
        const maxDuration = Math.max(Utils.DURATION_MINUTES_MIN, endM - m);
        durationM = Math.min(durationM, maxDuration);
        durationM = Math.max(durationM, Utils.DURATION_MINUTES_MIN);

        let heightPct = (durationM / total) * 100;
        const minVis = (Utils.DURATION_MINUTES_MIN / total) * 100;
        heightPct = Math.max(heightPct, minVis, 2.5);
        return { topPct, heightPct };
    },

    /**
     * Calcula a faixa de horas a mostrar: 07:00–23:00 por defeito, alargada para
     * caber o item mais cedo, o mais tarde (inicio + duracao) e a hora atual.
     */
    computeVisibleHourRange(dates) {
        let firstItem = null;
        let lastItem = null;

        dates.forEach((d) => {
            const ymd = Utils.dateToYMD(d);
            this.itemsForDayCached(ymd).forEach((task) => {
                if (task.status === 'done' && task.task_type === 'daily') return;
                const startM = Utils.dueTimeToMinutes(task.due_time);
                if (startM == null) return;
                const endM = startM + Utils.getTaskDurationMinutes(task);
                const sh = Math.floor(startM / 60);
                const eh = Math.ceil(endM / 60);
                firstItem = firstItem == null ? sh : Math.min(firstItem, sh);
                lastItem = lastItem == null ? eh : Math.max(lastItem, eh);
            });
        });

        // Sem itens: fica a janela util do dia. Com itens: uma hora de folga de cada lado.
        let earliest =
            firstItem == null
                ? this.LATEST_START_HOUR
                : Math.min(this.LATEST_START_HOUR, firstItem - this.HOUR_PADDING);
        let latest =
            lastItem == null
                ? this.EARLIEST_END_HOUR
                : Math.max(this.EARLIEST_END_HOUR, lastItem + this.HOUR_PADDING);

        // a linha do "agora" tem de caber na grelha
        if (this.isTodayInVisibleGrid()) {
            const nowH = new Date().getHours();
            earliest = Math.min(earliest, nowH);
            latest = Math.max(latest, nowH + 1);
        }

        earliest = Math.max(0, earliest);
        latest = Math.min(24, latest);
        if (latest - earliest < this.MIN_HOURS_SPAN) {
            latest = Math.min(24, earliest + this.MIN_HOURS_SPAN);
            earliest = Math.max(0, latest - this.MIN_HOURS_SPAN);
        }

        this.START_HOUR = earliest;
        this.END_HOUR = latest;
    },

    /** Minutos agendados num dia (itens com hora), para a carga do dia */
    dayLoadMinutes(ymd) {
        let total = 0;
        this.itemsForDayCached(ymd).forEach((task) => {
            if (task.status === 'done' && task.task_type === 'daily') return;
            if (!Utils.dueTimeToMinutes(task.due_time)) return;
            total += Utils.getTaskDurationMinutes(task);
        });
        return total;
    },

    formatLoad(minutes) {
        if (!minutes) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
        if (h) return `${h}h`;
        return `${m}min`;
    },

    /**
     * Cache dos itens por dia, valido dentro de um render. Sem ele, cada dia era
     * recalculado 4x (faixa horaria, carga do dia, itens sem hora, itens com hora)
     * — com 200 tarefas isso levava o render de ~12ms para ~125ms.
     */
    _itemsCache: null,

    itemsForDayCached(ymd) {
        if (!this._itemsCache) return this.itemsForDay(ymd);
        if (!(ymd in this._itemsCache)) {
            this._itemsCache[ymd] = this.itemsForDay(ymd);
        }
        return this._itemsCache[ymd];
    },

    itemsForDay(ymd) {
        const items = [];
        const all = DataManager.appData.tasks;
        if (!Array.isArray(all)) return items;
        all.forEach((t) => {
            if (t.is_deleted) return;
            if (typeof FiltersManager !== 'undefined' && !FiltersManager.matchesGlobalSearch(t)) return;
            if (t.task_type === 'todo' && t.due_date === ymd) {
                items.push(t);
            } else if (t.task_type === 'daily' && TasksManager.isDailyScheduledOnDate(t, ymd)) {
                items.push(t);
            }
        });
        return items;
    },

    /** Diárias concluídas na semana visível (uma entrada por tarefa, primeiro dia encontrado). */
    completedDailiesForWeek(dates) {
        const out = [];
        const seen = new Set();
        dates.forEach((d) => {
            const ymd = Utils.dateToYMD(d);
            this.itemsForDayCached(ymd).forEach((task) => {
                if (task.task_type !== 'daily' || task.status !== 'done') return;
                if (seen.has(task.id)) return;
                seen.add(task.id);
                out.push({ task, ymd });
            });
        });
        return out;
    },

    /** Todos (atividades) concluídos com due_date nos dias visíveis; uma entrada por tarefa. */
    completedTodosForWeek(dates) {
        const out = [];
        const seen = new Set();
        dates.forEach((d) => {
            const ymd = Utils.dateToYMD(d);
            this.itemsForDayCached(ymd).forEach((task) => {
                if (task.task_type !== 'todo' || task.status !== 'done') return;
                if (seen.has(task.id)) return;
                seen.add(task.id);
                out.push({ task, ymd });
            });
        });
        return out;
    },

    renderCompletedDailiesAside(dates) {
        const entries = this.completedDailiesForWeek(dates);
        if (entries.length === 0) return '';
        const titleKey = dates.length === 1 ? 'weekCalendarCompletedTitleToday' : 'weekCalendarCompletedTitle';
        return this.renderCompletedListAside(entries, titleKey, 'week-cal-completed-aside week-cal-completed-dailies-aside');
    },

    renderCompletedTodosAside(dates) {
        const entries = this.completedTodosForWeek(dates);
        if (entries.length === 0) return '';
        const titleKey =
            dates.length === 1 ? 'weekCalendarCompletedTodosTitleToday' : 'weekCalendarCompletedTodosTitle';
        return this.renderCompletedListAside(entries, titleKey, 'week-cal-completed-aside week-cal-completed-todos-aside');
    },

    renderCompletedListAside(entries, titleKey, asideClass) {
        const title = this.escapeHtml(t(titleKey));
        const aria = this.escapeAttr(t(titleKey));
        let h = `<aside class="${asideClass}" aria-label="${aria}">`;
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

    renderCompletedPanels(dates) {
        const d = this.renderCompletedDailiesAside(dates);
        const td = this.renderCompletedTodosAside(dates);
        if (!d && !td) return '';
        return `<div class="week-cal-completed-stack">${d}${td}</div>`;
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
        const task = DataManager.findTask(taskId);
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

    /** Inicio do arrasto a partir do identificador ⋮ (via delegacao) */
    onCalendarDragStart(e, handle) {
        const card = handle.closest('.week-cal-chip, .week-cal-block');
        const host = handle.closest('[data-date]');
        const sourceYmd = host ? host.getAttribute('data-date') : '';
        const id = card && card.getAttribute('data-task-id');
        if (!id) {
            e.preventDefault();
            return;
        }
        this._calendarDragTaskId = String(id);
        e.dataTransfer.setData('application/x-habitus-task-id', String(id));
        e.dataTransfer.setData('application/x-habitus-source-ymd', sourceYmd || '');
        e.dataTransfer.effectAllowed = 'move';

        card.classList.add('week-cal-dragging');
        try {
            const ghost = card.cloneNode(true);
            ghost.classList.remove('week-cal-dragging');
            ghost.style.cssText =
                'position:fixed;left:-9999px;top:0;width:' +
                Math.min(card.offsetWidth, 280) +
                'px;opacity:0.42;pointer-events:none;z-index:10000;';
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, Math.min(24, ghost.offsetWidth / 4), 12);
            document.addEventListener('dragend', () => ghost.remove(), { once: true });
        } catch (err) {
            /* setDragImage opcional */
        }
    },

    onCalendarDragEnd(e, handle) {
        const card = handle.closest('.week-cal-chip, .week-cal-block');
        if (card) card.classList.remove('week-cal-dragging');
        this._calendarDragTaskId = null;
        this.clearAllTimelineDropPreviews();
        document
            .querySelectorAll('.week-cal-timeline.week-cal-drop-hover, .week-cal-untimed.week-cal-drop-hover')
            .forEach((x) => x.classList.remove('week-cal-drop-hover'));
    },

    readSourceYmd(e) {
        try {
            return e.dataTransfer.getData('application/x-habitus-source-ymd') || '';
        } catch (err) {
            return '';
        }
    },

    /** Redimensionar um bloco pela aresta inferior (delegado) */
    startBlockResize(e, handle) {
        e.stopPropagation();
        e.preventDefault();
        const block = handle.closest('.week-cal-block');
        const timelineEl = handle.closest('.week-cal-timeline');
        if (!block || !timelineEl) return;
        const id = block.getAttribute('data-task-id');
        const task = DataManager.findTask(id);
        if (!task) return;

        const rect = timelineEl.getBoundingClientRect();
        const totalMin = this.totalMinutes();
        const pxPerMin = rect.height / totalMin;
        const startY = e.clientY;
        const startDur = Utils.getTaskDurationMinutes(task);
        const startDueM = Utils.dueTimeToMinutes(task.due_time);
        if (startDueM == null) return;
        const endDayM = this.END_HOUR * 60;
        const maxDur = Math.max(Utils.DURATION_MINUTES_MIN, endDayM - startDueM);

        let workingDur = startDur;
        block.classList.add('week-cal-resizing');

        const onMove = (ev) => {
            const deltaMin = Math.round((ev.clientY - startY) / pxPerMin / 15) * 15;
            workingDur = Utils.normalizeDurationMinutes(startDur + deltaMin);
            workingDur = Math.min(workingDur, maxDur);
            workingDur = Math.max(workingDur, Utils.DURATION_MINUTES_MIN);
            const hPct = Math.max(
                (workingDur / totalMin) * 100,
                (Utils.DURATION_MINUTES_MIN / totalMin) * 100,
                2.5
            );
            block.style.height = `${hPct}%`;
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            block.classList.remove('week-cal-resizing');
            if (workingDur !== startDur) {
                TasksManager.updateTask(id, { duration_minutes: workingDur });
            }
            if (typeof RenderManager !== 'undefined') {
                RenderManager.renderAll();
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },

    /** Edicao inline do titulo no calendario (delegada por focusout/keydown) */
    startInlineTitleEdit(titleEl) {
        if (titleEl.getAttribute('contenteditable') === 'true') return;
        titleEl.contentEditable = 'true';
        titleEl.focus();
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    },

    commitInlineTitle(titleEl) {
        titleEl.contentEditable = 'false';
        const row = titleEl.closest('[data-task-id]');
        const id = row && row.getAttribute('data-task-id');
        if (!id) return;
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
    },

    /**
     * TODOS os eventos do calendario vivem aqui, ligados UMA vez ao #week-calendar-root.
     * Antes eram ~12 listeners por item, recriados a cada render (com 200 itens
     * davam ~2.500 listeners por render).
     */
    bindRootDelegation(root) {
        if (!root || root.dataset.delegated === '1') return;
        root.dataset.delegated = '1';

        const zoneOf = (e) => e.target.closest('.week-cal-timeline, .week-cal-untimed');

        // ---- arrastar ----
        root.addEventListener('dragstart', (e) => {
            const handle = e.target.closest('.week-cal-drag-handle');
            if (handle) this.onCalendarDragStart(e, handle);
        });

        root.addEventListener('dragend', (e) => {
            const handle = e.target.closest('.week-cal-drag-handle');
            if (handle) this.onCalendarDragEnd(e, handle);
        });

        root.addEventListener('dragover', (e) => {
            const zone = zoneOf(e);
            if (!zone) return;
            if (!this.hasCalendarDrag(e.dataTransfer.types)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            zone.classList.add('week-cal-drop-hover');
            if (zone.classList.contains('week-cal-timeline')) {
                this.updateTimelineDropPreview(zone, e.clientY);
            }
        });

        root.addEventListener('dragleave', (e) => {
            const zone = zoneOf(e);
            if (!zone) return;
            if (zone.contains(e.relatedTarget)) return;
            zone.classList.remove('week-cal-drop-hover');
            if (zone.classList.contains('week-cal-timeline')) {
                this.clearAllTimelineDropPreviews();
            }
        });

        root.addEventListener('drop', (e) => {
            const zone = zoneOf(e);
            if (!zone) return;
            if (!this.hasCalendarDrag(e.dataTransfer.types)) return;
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('week-cal-drop-hover');
            this.clearAllTimelineDropPreviews();

            const id = e.dataTransfer.getData('application/x-habitus-task-id');
            if (!id) return;
            const ymd = zone.getAttribute('data-date');
            const sourceYmd = this.readSourceYmd(e);
            const isTimeline = zone.classList.contains('week-cal-timeline');
            const hhmm = isTimeline ? this.timeFromTimelineClientY(zone, e.clientY) : null;
            this.applyDrop(id, ymd, hhmm, sourceYmd || null);
        });

        // ---- redimensionar ----
        root.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.week-cal-resize-handle');
            if (handle) this.startBlockResize(e, handle);
        });

        // ---- duplo clique em espaco vazio: nova tarefa com data e hora ----
        root.addEventListener('dblclick', (e) => {
            const timeline = e.target.closest('.week-cal-timeline');
            if (!timeline) return;
            if (e.target.closest('.week-cal-block, .week-cal-done-btn')) return;
            e.preventDefault();
            const ymd = timeline.getAttribute('data-date');
            const hhmm = this.timeFromTimelineClientY(timeline, e.clientY);
            if (typeof ModalManager !== 'undefined') {
                ModalManager.openTaskModal(null, 'todo', { prefillDueDate: ymd, prefillDueTime: hhmm });
            }
        });

        // ---- cliques ----
        root.addEventListener('click', (e) => {
            const doneBtn = e.target.closest('.week-cal-done-btn');
            if (doneBtn) {
                e.stopPropagation();
                e.preventDefault();
                const id = doneBtn.getAttribute('data-task-id');
                if (!id) return;
                TasksManager.toggleTaskStatus(id);
                if (typeof RenderManager !== 'undefined') RenderManager.renderAll();
                return;
            }

            const addTask = e.target.closest('.week-cal-add-task-btn');
            if (addTask) {
                e.stopPropagation();
                if (typeof ModalManager !== 'undefined') {
                    ModalManager.openTaskModal(null, 'todo', { prefillDueDate: addTask.getAttribute('data-date') });
                }
                return;
            }

            const addDaily = e.target.closest('.week-cal-add-daily-btn');
            if (addDaily) {
                e.stopPropagation();
                if (typeof ModalManager !== 'undefined') {
                    ModalManager.openTaskModal(null, 'daily', { prefillDailyDay: addDaily.getAttribute('data-dow') });
                }
                return;
            }

            const title = e.target.closest('.week-cal-chip-title, .week-cal-block-title');
            if (title) {
                e.stopPropagation();
                this.startInlineTitleEdit(title);
                return;
            }

            const card = e.target.closest('.week-cal-chip, .week-cal-block');
            if (!card) return;
            if (e.target.closest('.week-cal-drag-handle, .week-cal-resize-handle')) return;
            const id = card.getAttribute('data-task-id');
            if (!id) return;
            const task = DataManager.findTask(id);
            if (task && typeof ModalManager !== 'undefined') {
                ModalManager.openTaskModal(task);
            }
        });

        // ---- gravar o titulo inline (blur nao borbulha; focusout sim) ----
        root.addEventListener('focusout', (e) => {
            const title = e.target.closest && e.target.closest('.week-cal-chip-title, .week-cal-block-title');
            if (title && title.getAttribute('contenteditable') === 'true') {
                this.commitInlineTitle(title);
            }
        });

        root.addEventListener('keydown', (e) => {
            const title = e.target.closest && e.target.closest('.week-cal-chip-title, .week-cal-block-title');
            if (!title || title.getAttribute('contenteditable') !== 'true') return;
            if (e.key === 'Enter') {
                e.preventDefault();
                title.blur();
            }
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
        const completeLabel = this.escapeAttr(t('complete'));
        const tipTitle = this.escapeAttr(task.title || '');
        return `<div class="week-cal-chip ${typeClass} ${done ? 'is-done' : ''}" data-task-id="${task.id}" title="${tipTitle}">
            <span class="week-cal-drag-handle" draggable="true" title="${dragHint}">⋮</span>
            <span class="week-cal-chip-title">${this.escapeHtml(task.title)}</span>
            <button type="button" class="week-cal-done-btn${done ? ' is-active' : ''}" data-task-id="${task.id}" draggable="false" aria-label="${completeLabel}">${this.checkIcon()}</button>
        </div>`;
    },

    renderBlockHtml(task) {
        const pos = this.positionTimedEvent(task);
        if (!pos) return '';
        const done = task.status === 'done';
        const typeClass = task.task_type === 'daily' ? 'is-daily' : 'is-todo';
        const dragHint = this.escapeAttr(t('weekCalendarDragHandle'));
        const completeLabel = this.escapeAttr(t('complete'));
        const tipTitle = this.escapeAttr(task.title || '');
        const resizeTip = this.escapeAttr(t('weekCalendarResizeDuration'));
        return `<div class="week-cal-block ${typeClass} ${done ? 'is-done' : ''}" style="top:${pos.topPct}%;height:${pos.heightPct}%" data-task-id="${task.id}" title="${tipTitle}">
            <div class="week-cal-block-main">
                <span class="week-cal-drag-handle" draggable="true" title="${dragHint}">⋮</span>
                <span class="week-cal-block-title" title="${tipTitle}">${this.escapeHtml(task.title)}</span>
                <button type="button" class="week-cal-done-btn${done ? ' is-active' : ''}" data-task-id="${task.id}" draggable="false" aria-label="${completeLabel}">${this.checkIcon()}</button>
            </div>
            <div class="week-cal-resize-handle" title="${resizeTip}" aria-label="${resizeTip}" role="separator" aria-orientation="horizontal"></div>
        </div>`;
    },

    render() {
        this.ensureWeekStart();
        const root = document.getElementById('week-calendar-root');
        if (!root) return;

        const dates = this.getVisibleDates();
        this._itemsCache = {};
        this.computeVisibleHourRange(dates);
        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage.replace('_', '-') : 'pt-BR';
        const rangeSpan = document.getElementById('week-calendar-range');
        if (rangeSpan) {
            if (dates.length === 1) {
                rangeSpan.textContent = Utils.formatDate(Utils.dateToYMD(dates[0]));
            } else {
                rangeSpan.textContent = `${Utils.formatDate(Utils.dateToYMD(dates[0]))} – ${Utils.formatDate(Utils.dateToYMD(dates[dates.length - 1]))}`;
            }
        }
        this.syncToolbar();

        const hours = [];
        for (let h = this.START_HOUR; h < this.END_HOUR; h++) {
            hours.push(h);
        }

        const todayOnlyClass = dates.length === 1 ? ' is-today-only' : '';
        let html = '<div class="week-cal-outer">';
        html += `<div class="week-cal-layout${todayOnlyClass}">`;
        html += '<div class="week-cal-corner"></div>';
        html += '<div class="week-cal-day-headers">';
        dates.forEach((d) => {
            const ymd = Utils.dateToYMD(d);
            const isToday = Utils.isToday(ymd);
            const weekday = d.toLocaleDateString(lang, { weekday: 'short' });
            // dia/mes chega: o ano esta no intervalo da barra e o cabecalho cabe numa linha
            const fullDate = d.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' });
            const dow = Utils.ymdToDayOfWeek(ymd);
            html += `<div class="week-cal-day-header ${isToday ? 'is-today' : ''}" data-date="${ymd}">
                <span class="week-cal-dow">${weekday}</span>
                <span class="week-cal-date-full">${fullDate}</span>
                ${isToday ? `<span class="week-cal-today-pill">${this.escapeHtml(t('weekCalendarToday'))}</span>` : ''}
                ${(() => {
                    const load = this.formatLoad(this.dayLoadMinutes(ymd));
                    return load
                        ? `<span class="week-cal-day-load" title="${this.escapeAttr(t('scheduledTimeLabel'))}">${load}</span>`
                        : '';
                })()}
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
            const items = this.itemsForDayCached(ymd);
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
        hours.forEach((h, idx) => {
            const hh = String(h).padStart(2, '0');
            const isLast = idx === hours.length - 1;
            if (isLast) {
                const endHh = String(this.END_HOUR).padStart(2, '0');
                html += `<div class="week-cal-hour-label week-cal-hour-label-split"><span class="week-cal-hour-start">${hh}:00</span><span class="week-cal-hour-end-mark">${endHh}:00</span></div>`;
            } else {
                html += `<div class="week-cal-hour-label">${hh}:00</div>`;
            }
        });
        html += '</div>';

        dates.forEach((d, i) => {
            const ymd = Utils.dateToYMD(d);
            const isToday = Utils.isToday(ymd);
            const items = this.itemsForDayCached(ymd);
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
        html += this.renderCompletedPanels(dates);
        html += '</div>';

        root.innerHTML = html;

        this._itemsCache = null;

        // Um unico conjunto de listeners, ligado a primeira vez (ver bindRootDelegation)
        this.bindRootDelegation(root);
        this.syncStickyOffsets(root);
        this.updateNowClockDisplay();
        this.updateNowLine();
    },

    /**
     * A faixa de itens sem hora fica fixa por baixo dos cabecalhos ao percorrer as
     * horas — antes desaparecia no scroll e perdiam-se os itens do dia sem horario.
     * O CSS precisa de saber a altura dos cabecalhos, que depende do idioma.
     */
    syncStickyOffsets(root) {
        const apply = () => {
            const layout = root.querySelector('.week-cal-layout');
            const headers = root.querySelector('.week-cal-day-headers');
            if (!layout || !headers) return;
            // offsetHeight depois do layout estar resolvido (o valor logo a seguir ao
            // innerHTML fica desatualizado e a faixa grudava demasiado abaixo)
            const h = headers.offsetHeight;
            if (h > 0) layout.style.setProperty('--week-cal-header-h', `${h}px`);
        };
        // Só no frame seguinte: ler offsetHeight logo a seguir ao innerHTML forcava
        // um reflow sincrono da pagina toda (~40ms com 200 tarefas).
        requestAnimationFrame(apply);
    },

    escapeHtml(s) {
        if (!s) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }
};
