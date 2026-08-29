// Render Management Module
// Handles all UI rendering functionality

/** Cartao editavel (nao concluido) */
function editableTask(task) {
    return task && task.status !== 'done';
}

const RenderManager = {
    todoDateFilter: 'all', // all | today | overdue | no_date | future

    /** Cartoes com a lista de subtarefas aberta (por defeito ficam colapsadas) */
    expandedSubtasks: new Set(),

    /** Seccoes colapsaveis: fechadas nao geram DOM nenhum */
    sectionOpen: {
        dailyCompleted: false,
        dailyScheduled: false,
        todoCompleted: false
    },
    _tasksDateFilterBound: false,

    bindTasksDateFilterUI() {
        if (this._tasksDateFilterBound) return;
        const row = document.getElementById('tasks-date-filter-row');
        if (!row) return;
        this._tasksDateFilterBound = true;

        row.addEventListener('click', (e) => {
            const btn = e.target.closest('.tasks-date-filter-btn');
            if (!btn) return;
            e.preventDefault();
            const f = btn.getAttribute('data-filter') || 'all';
            this.todoDateFilter = f;
            this.renderAll();
        });
    },

    /** Quantas atividades por fazer ja passaram do prazo */
    overdueCount() {
        const today = Utils.dateToYMD(new Date());
        return DataManager.getTasksByType('todo').filter(
            (task) => task.status !== 'done' && task.due_date && task.due_date < today
        ).length;
    },

    syncTasksDateFilterUI() {
        const allBtn = document.getElementById('tasks-date-filter-all');
        const todayBtn = document.getElementById('tasks-date-filter-today');
        const overdueBtn = document.getElementById('tasks-date-filter-overdue');
        const noDateBtn = document.getElementById('tasks-date-filter-no-date');
        const futureBtn = document.getElementById('tasks-date-filter-future');
        if (!allBtn || !todayBtn || !noDateBtn || !futureBtn) return;

        allBtn.textContent = t('tasksDateFilterAll');
        todayBtn.textContent = t('tasksDateFilterToday');
        noDateBtn.textContent = t('tasksDateFilterNoDate');
        futureBtn.textContent = t('tasksDateFilterFuture');

        const overdue = this.overdueCount();
        if (overdueBtn) {
            overdueBtn.textContent = `${t('tasksDateFilterOverdue')} (${overdue})`;
            overdueBtn.style.display = overdue > 0 ? '' : 'none';
        }

        [allBtn, todayBtn, overdueBtn, noDateBtn, futureBtn].forEach(
            (b) => b && b.classList.remove('is-active')
        );
        if (this.todoDateFilter === 'today') todayBtn.classList.add('is-active');
        else if (this.todoDateFilter === 'overdue' && overdueBtn) overdueBtn.classList.add('is-active');
        else if (this.todoDateFilter === 'no_date') noDateBtn.classList.add('is-active');
        else if (this.todoDateFilter === 'future') futureBtn.classList.add('is-active');
        else allBtn.classList.add('is-active');
    },

    applyTodoDateFilter(list) {
        const f = this.todoDateFilter || 'all';
        if (f === 'all') return list;
        const today = Utils.dateToYMD(new Date());
        return (list || []).filter((task) => {
            const d = task && task.due_date ? String(task.due_date) : '';
            if (!d) return f === 'no_date';
            if (f === 'future') return d > today;
            if (f === 'overdue') return d < today && task.status !== 'done';
            if (f === 'today') return d <= today; // inclui atrasadas + hoje
            return true;
        });
    },

    // Render everything
    renderAll() {
        this.renderDailies();
        this.renderTasks();
        this.updateCounts();
        this.updateDocumentTitle();
        this.updateMotivationalMessage();
        if (typeof KeyboardNavManager !== 'undefined' && KeyboardNavManager.afterRender) {
            try {
                KeyboardNavManager.afterRender();
            } catch (err) {
                console.error('KeyboardNavManager.afterRender failed:', err);
            }
        }
        if (typeof WeekCalendarManager !== 'undefined' && WeekCalendarManager.render) {
            try {
                WeekCalendarManager.render();
            } catch (err) {
                console.error('WeekCalendarManager.render failed:', err);
            }
        }
        this.syncFilterIndicator();
        if (typeof updateMenuViewControls === 'function') {
            try {
                updateMenuViewControls();
            } catch (err) {
                console.error('updateMenuViewControls failed:', err);
            }
        }
        if (typeof StatsManager !== 'undefined' && StatsManager.render) {
            try {
                StatsManager.render();
            } catch (err) {
                console.error('StatsManager.render failed:', err);
            }
        }
    },
    
    /** Titulo da aba: "(3) Habitus" com o que ainda falta hoje */
    updateDocumentTitle() {
        const today = Utils.getTodayDate();
        const tasks = (DataManager.getAllTasks() || []).filter((x) => !x.is_deleted);
        let pending = 0;
        tasks.forEach((task) => {
            if (task.status === 'done') return;
            if (task.task_type === 'todo') {
                if (task.due_date && task.due_date <= today) pending += 1;
            } else if (TasksManager.isDailyScheduledForToday(task)) {
                if (!Utils.isToday(task.last_completed_date)) pending += 1;
            }
        });
        document.title = pending > 0 ? `(${pending}) Habitus` : 'Habitus';
    },

    /** Ponto no botao ⋯ quando ha algum filtro ativo (os filtros vivem la dentro) */
    syncFilterIndicator() {
        const btn = document.getElementById('header-menu-btn');
        if (!btn) return;
        const active =
            this.todoDateFilter !== 'all' ||
            FiltersManager.activeFilters.todos.size > 0 ||
            FiltersManager.activeFilters.dailies.size > 0;
        btn.classList.toggle('has-active-filter', active);
    },

    // Update task counts
    updateCounts() {
        const dailiesCount = DataManager.getActiveTasksCount('daily');
        const tasksCount = DataManager.getActiveTasksCount('todo');
        document.getElementById('dailies-count').textContent = `(${dailiesCount})`;
        document.getElementById('tasks-count').textContent = `(${tasksCount})`;
    },
    
    // Update motivational message
    updateMotivationalMessage() {
        const messageEl = document.getElementById('motivational-message');
        const allTasks = DataManager.getTasksByType('todo');
        const allDailies = DataManager.getTasksByType('daily');
        
        if (allTasks.length === 0 && allDailies.length === 0) {
            messageEl.textContent = t('motivationalMessage');
            return;
        }
        
        const completedTasks = allTasks.filter(t => t.status === 'done').length;
        const completedDailies = allDailies.filter(t => 
            t.status === 'done' && Utils.isToday(t.last_completed_date)
        ).length;
        
        if (allTasks.length > 0 && completedTasks === allTasks.length && 
            allDailies.length > 0 && completedDailies === allDailies.length) {
            messageEl.innerHTML = `🎉 ${t('allTasksComplete')}`;
        } else {
            messageEl.textContent = t('motivationalMessage');
        }
    },
    
    // Render dailies
    renderDailies() {
        const container = document.getElementById('dailies-list');
        container.innerHTML = '';
        
        // Update title
        document.getElementById('dailies-title').innerHTML = `${t('dailies')} <span class="count" id="dailies-count">(0)</span>`;
        
        const allDailies = FiltersManager.getFilteredTasks('daily');
        
        const activeDailies = [];
        const completedDailies = [];
        const scheduledDailies = [];
        
        allDailies.forEach(task => {
            const scheduledToday = TasksManager.isDailyScheduledForToday(task);
            const isCompletedToday = task.status === 'done' && Utils.isToday(task.last_completed_date);
            
            // Check if this task is currently being edited (days of week)
            const isBeingEdited = InlineEditManager.editingDaysOfWeekTaskId === task.id;
            
            if (isCompletedToday) {
                completedDailies.push(task);
            } else if (!scheduledToday && !isBeingEdited) {
                // Only move to scheduled if not being edited
                scheduledDailies.push(task);
            } else {
                // Keep in active if scheduled for today OR being edited
                activeDailies.push(task);
            }
        });
        
        // Sort: not completed first, then by order_index DESC, created_at DESC
        activeDailies.sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'done' ? 1 : -1;
            }
            if (a.order_index !== b.order_index) {
                return b.order_index - a.order_index;
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        if (activeDailies.length === 0 && completedDailies.length === 0 && scheduledDailies.length === 0) {
            container.innerHTML = `<div class="empty-state">${t('noDailies')}</div>`;
        } else {
            activeDailies.forEach(task => {
                container.appendChild(this.createTaskCard(task));
            });
        }
        
        this.renderCollapsibleSection({
            sectionId: 'dailies-completed-section',
            listId: 'dailies-completed-list',
            openKey: 'dailyCompleted',
            tasks: completedDailies
        });

        this.renderCollapsibleSection({
            sectionId: 'dailies-scheduled-section',
            listId: 'dailies-scheduled-list',
            openKey: 'dailyScheduled',
            tasks: scheduledDailies
        });

        this.renderTagFilters('daily');
        this.bindListDelegation('dailies-list');
        DragDropManager.setup('dailies-list');
    },
    
    // Render tasks
    renderTasks() {
        const container = document.getElementById('tasks-list');
        container.innerHTML = '';
        
        // Update title
        document.getElementById('tasks-title').innerHTML = `${t('tasks')} <span class="count" id="tasks-count">(0)</span>`;

        this.bindTasksDateFilterUI();
        this.syncTasksDateFilterUI();
        
        const allTasks = this.applyTodoDateFilter(FiltersManager.getFilteredTasks('todo'));
        
        const activeTasks = allTasks.filter(t => t.status !== 'done');
        const completedTasks = allTasks.filter(t => t.status === 'done');
        
        // Sort: by order_index DESC, created_at DESC
        activeTasks.sort((a, b) => {
            if (a.order_index !== b.order_index) {
                return b.order_index - a.order_index;
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        completedTasks.sort((a, b) => {
            if (a.order_index !== b.order_index) {
                return b.order_index - a.order_index;
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        if (activeTasks.length === 0 && completedTasks.length === 0) {
            container.innerHTML = `<div class="empty-state">${t('noTasks')}</div>`;
        } else {
            activeTasks.forEach(task => {
                container.appendChild(this.createTaskCard(task));
            });
        }
        
        this.renderCollapsibleSection({
            sectionId: 'tasks-completed-section',
            listId: 'tasks-completed-list',
            openKey: 'todoCompleted',
            tasks: completedTasks
        });

        this.renderTagFilters('todo');
        this.bindListDelegation('tasks-list');
        DragDropManager.setup('tasks-list');
    },
    
    /**
     * Seccao colapsavel (concluidas / agendadas). Fechada = zero cartoes no DOM;
     * o rotulo do botao mostra a contagem para nao ser preciso abrir.
     */
    renderCollapsibleSection({ sectionId, listId, openKey, tasks }) {
        const section = document.getElementById(sectionId);
        const list = document.getElementById(listId);
        if (!section || !list) return;

        list.innerHTML = '';

        if (!tasks || tasks.length === 0) {
            section.style.display = 'none';
            this.sectionOpen[openKey] = false;
            return;
        }

        section.style.display = 'block';
        const open = !!this.sectionOpen[openKey];
        section.classList.toggle('is-open', open);
        list.style.display = open ? 'block' : 'none';

        if (!open) return;

        const frag = document.createDocumentFragment();
        tasks.forEach((task) => frag.appendChild(this.createTaskCard(task)));
        list.appendChild(frag);
        this.bindListDelegation(listId);
    },

    // Render tag filters (vivem dentro do menu ⋯)
    renderTagFilters(taskType) {
        const key = taskType === 'todo' ? 'tasks' : 'dailies';
        const container = document.getElementById(`${key}-tag-filters`);
        if (!container) return;
        container.innerHTML = '';

        const allTags = FiltersManager.getAllTags(taskType);

        const block = document.getElementById(`${key}-tag-block`);
        if (block) block.style.display = allTags.length ? 'flex' : 'none';
        const label = document.getElementById(`${key}-tag-label`);
        if (label) label.textContent = t(taskType === 'todo' ? 'tasks' : 'dailies');
        
        allTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `tag-filter ${FiltersManager.isTagActive(taskType, tag) ? 'selected' : ''}`;
            btn.textContent = tag;
            btn.onclick = () => {
                FiltersManager.toggleFilter(taskType, tag);
                this.renderAll();
            };
            container.appendChild(btn);
        });
    },
    
    // ===== Cartao =====

    formatDaysOfWeek(days) {
        if (!days || days.length === 0) return '';
        if (days.length === 7) return t('everyDay');
        const labels = {
            monday: t('monday'),
            tuesday: t('tuesday'),
            wednesday: t('wednesday'),
            thursday: t('thursday'),
            friday: t('friday'),
            saturday: t('saturday'),
            sunday: t('sunday')
        };
        return days.map((d) => labels[d] || d).join(', ');
    },

    /** Tags do cartao (identicas para habitos e atividades) */
    tagsHtml(task) {
        const tags = task.meta?.tags || [];
        const chips = tags
            .map(
                (tag) =>
                    `<span class="task-tag" data-tag="${tag}">${tag}<span class="tag-remove" data-tag="${tag}">×</span></span>`
            )
            .join('');
        return `<div class="task-tags-inline">${chips}<span class="task-tag add-tag is-hint">+ ${t('tags')}</span></div>`;
    },

    /**
     * Linha de info. Habitos e atividades so diferem nos dois primeiros badges;
     * o resto (hora, duracao, tags) e comum — um unico caminho, sem duplicar o template.
     */
    infoRowHtml(task) {
        const chunks = [];

        if (task.task_type === 'daily') {
            const days = this.formatDaysOfWeek(task.meta?.days_of_week || []);
            chunks.push(
                days
                    ? `<span class="task-days-of-week">📅 ${days}</span>`
                    : `<span class="task-days-of-week add-days is-hint">+ ${t('daysOfWeek')}</span>`
            );
        } else {
            chunks.push(
                task.priority
                    ? `<span class="task-priority-badge ${task.priority}">${t(task.priority)}</span>`
                    : `<span class="task-priority-badge add-priority is-hint">+ ${t('priority')}</span>`
            );
            const isOverdue =
                task.due_date && task.due_date < Utils.dateToYMD(new Date()) && task.status !== 'done';
            chunks.push(
                task.due_date
                    ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">${Utils.formatDate(task.due_date)}</span>`
                    : `<span class="task-due-date add-due-date is-hint">+ ${t('dueDate')}</span>`
            );
        }

        if (task.due_time) {
            chunks.push(`<span class="task-due-time-badge">🕐 ${task.due_time}</span>`);
        } else if (task.task_type === 'daily' || task.due_date) {
            chunks.push(
                `<input type="time" class="task-inline-time-input is-hint" step="1800" aria-label="${t('weekCalendarPickTime')}" title="${t('weekCalendarPickTime')}" />`
            );
        }

        chunks.push(this.tagsHtml(task));

        return `<div class="task-info-row"><div class="task-info-left">${chunks.join('')}</div></div>`;
    },

    /**
     * Cria o cartao. NAO liga nenhum listener: os eventos sao tratados por
     * delegacao no container (ver bindListDelegation) — antes eram ~33 listeners
     * por cartao, recriados a cada render.
     */
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.status === 'done' ? 'completed' : ''}`;
        card.draggable = true;
        card.dataset.taskId = task.id;

        const progress = SubtasksManager.getSubtasksProgress(task);
        const editable = task.status !== 'done';
        const subtasksOpen = this.expandedSubtasks.has(task.id);
        const subtasksBadge =
            progress.total > 0
                ? `<button type="button" class="task-subtasks-badge${subtasksOpen ? ' is-open' : ''}" title="${t('subtasks')}" aria-expanded="${subtasksOpen ? 'true' : 'false'}">☰ ${progress.completed}/${progress.total}</button>`
                : '';

        card.innerHTML = `
            <div class="task-header">
                <input type="checkbox" class="task-checkbox" ${task.status === 'done' ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title-row">
                        <div class="task-title"${editable ? ` title="${t('edit')}"` : ''}>${Utils.linkify(task.title)}</div>
                        ${subtasksBadge}
                        <div class="task-actions-inline">
                            ${
                                task.task_type === 'todo' && task.status !== 'done'
                                    ? `<button type="button" class="task-btn task-btn-today" title="${t('setForToday')}" aria-label="${t('setForToday')}">📌</button>`
                                    : ''
                            }
                            <button type="button" class="task-btn task-add-subtask-btn" title="${t('addSubtask')}" aria-label="${t('addSubtask')}">＋☰</button>
                            <button type="button" class="task-btn task-order-top" title="${t('sendToTop')}" aria-label="${t('sendToTop')}">↑</button>
                            <button type="button" class="task-btn task-order-bottom" title="${t('sendToBottom')}" aria-label="${t('sendToBottom')}">↓</button>
                            <button type="button" class="task-btn pomodoro" title="${t('pomodoro')}" aria-label="${t('pomodoro')}">🍅</button>
                            <button type="button" class="task-btn delete" title="${t('delete')}" aria-label="${t('delete')}">🗑</button>
                        </div>
                    </div>
                    ${this.infoRowHtml(task)}
                    ${this.createSubtasksBlock(task, progress, subtasksOpen)}
                </div>
            </div>
        `;

        return card;
    },

    /** Um par de listeners por lista, ligado uma unica vez. */
    bindListDelegation(containerId) {
        const el = document.getElementById(containerId);
        if (!el || el.dataset.delegated === '1') return;
        el.dataset.delegated = '1';
        el.addEventListener('click', (e) => this.onListClick(e));
        el.addEventListener('change', (e) => this.onListChange(e));
    },

    onListClick(e) {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const task = DataManager.findTask(card.dataset.taskId);
        if (!task) return;

        const hit = (sel) => e.target.closest(sel);
        const stop = () => e.stopPropagation();

        // --- acoes explicitas ---
        if (hit('.tag-remove')) {
            stop();
            InlineEditManager.removeTag(task.id, hit('.tag-remove').dataset.tag);
            return this.renderAll();
        }
        if (hit('.task-tag.add-tag')) {
            stop();
            return InlineEditManager.addTagInline(card, task);
        }
        if (hit('.task-tag[data-tag]')) {
            stop();
            FiltersManager.toggleFilter(task.task_type, hit('.task-tag[data-tag]').dataset.tag);
            return this.renderAll();
        }
        if (hit('.task-subtasks-badge')) {
            stop();
            if (this.expandedSubtasks.has(task.id)) this.expandedSubtasks.delete(task.id);
            else this.expandedSubtasks.add(task.id);
            return this.renderAll();
        }
        if (hit('.task-btn-today')) {
            stop();
            TasksManager.updateTask(task.id, {
                due_date: Utils.dateToYMD(new Date()),
                due_time: Utils.getLocalDueTimeNow()
            });
            Utils.showToast(t('setForTodayDone'));
            return this.renderAll();
        }
        if (hit('.task-order-top')) {
            stop();
            TasksManager.moveTaskToTop(task.id);
            return this.renderAll();
        }
        if (hit('.task-order-bottom')) {
            stop();
            TasksManager.moveTaskToBottom(task.id);
            return this.renderAll();
        }
        if (hit('.task-btn.pomodoro')) {
            stop();
            return PomodoroManager.openModal(task);
        }
        if (hit('.task-btn.delete')) {
            stop();
            return this.deleteTaskWithUndo(task);
        }
        if (hit('.subtask-delete')) {
            stop();
            SubtasksManager.deleteSubtask(task.id, hit('.subtask-delete').dataset.subtaskId);
            return this.renderAll();
        }
        if (hit('.task-add-subtask-btn')) {
            stop();
            this.expandedSubtasks.add(task.id);
            return InlineEditManager.addSubtaskInline(card, task);
        }
        if (hit('.task-priority-badge')) {
            stop();
            return InlineEditManager.editPriorityInline(card, task);
        }
        if (hit('.task-due-date')) {
            stop();
            return InlineEditManager.editDueDateInline(card, task);
        }
        if (hit('.task-days-of-week')) {
            stop();
            return InlineEditManager.startEditing(task.id, 'full');
        }
        if (hit('.task-title')) {
            stop();
            if (!editableTask(task) || InlineEditManager.isEditing(task.id)) return;
            return InlineEditManager.startEditing(task.id, task.task_type === 'daily' ? 'full' : 'title');
        }

        // --- clique no fundo do cartao abre o editor completo ---
        if (
            e.target.closest(
                'button, a, input, select, textarea, .task-tags-inline, .task-inline-time-input, .task-subtasks-wrap, .subtasks-container, [contenteditable="true"]'
            )
        ) {
            return;
        }
        InlineEditManager.startEditing(task.id, 'full');
    },

    onListChange(e) {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const taskId = card.dataset.taskId;
        const task = DataManager.findTask(taskId);
        if (!task) return;

        if (e.target.classList.contains('task-checkbox')) {
            return this.toggleWithUndo(task, e.target.checked);
        }
        if (e.target.classList.contains('subtask-checkbox')) {
            SubtasksManager.toggleSubtaskStatus(taskId, e.target.dataset.subtaskId);
            return this.renderAll();
        }
        if (e.target.classList.contains('task-inline-time-input')) {
            const v = e.target.value;
            const normalized = v ? Utils.normalizeDueTime(v) : null;
            if (v && !normalized) return;
            TasksManager.updateTask(taskId, { due_time: normalized || null });
            return this.renderAll();
        }
    },

    /** Concluir com aviso empilhavel + Desfazer (sem dialogos bloqueantes) */
    toggleWithUndo(task, isMarkingDone) {
        const before = DataManager.findTask(task.id);
        const snapshot = before
            ? {
                  status: before.status,
                  completed_at: before.completed_at,
                  last_completed_date: before.last_completed_date,
                  streak_count: before.streak_count,
                  max_streak: before.max_streak
              }
            : null;

        TasksManager.toggleTaskStatus(task.id);
        this.renderAll();

        if (isMarkingDone && snapshot) {
            Utils.showActionToast({
                message: `${t('activityFinished')}: ${task.title || ''}`.trim(),
                actionLabel: t('undo'),
                timeoutMs: 5000,
                tone: 'success',
                onAction: () => {
                    TasksManager.updateTask(task.id, snapshot);
                    this.renderAll();
                }
            });
        }
    },

    /** Eliminar sem confirm(): apaga ja e oferece Desfazer no toast */
    deleteTaskWithUndo(task) {
        const index = DataManager.appData.tasks.findIndex((x) => DataManager.sameId(x.id, task.id));
        const snapshot = DataManager.findTask(task.id);
        if (index === -1 || !snapshot) return;

        TasksManager.deleteTask(task.id);
        this.renderAll();

        Utils.showActionToast({
            message: `${t('taskDeleted')}: ${snapshot.title || ''}`.trim(),
            actionLabel: t('undo'),
            timeoutMs: 6000,
            tone: 'error',
            onAction: () => {
                DataManager.appData.tasks.splice(Math.min(index, DataManager.appData.tasks.length), 0, snapshot);
                DataManager.saveData();
                this.renderAll();
            }
        });
    },

    createSubtasksBlock(task, progress, open) {
        const hasSubtasks = task.subtasks && task.subtasks.length > 0;
        const list = hasSubtasks && open ? this.createSubtasksHTML(task, progress) : '';
        return `<div class="task-subtasks-wrap">${list}</div>`;
    },
    
    // Create subtasks HTML
    createSubtasksHTML(task, progress) {
        return `
            <div class="subtasks-container">
                <div class="subtasks-progress">${progress.completed} / ${progress.total} ${t('subtasks')}</div>
                <div class="subtasks-list">
                    ${task.subtasks.map(subtask => `
                        <div class="subtask-item ${subtask.status === 'done' ? 'completed' : ''}">
                            <input type="checkbox" class="subtask-checkbox" ${subtask.status === 'done' ? 'checked' : ''} data-subtask-id="${subtask.id}">
                            <span class="subtask-title">${Utils.linkify(subtask.title)}</span>
                            <button class="subtask-delete" data-subtask-id="${subtask.id}" data-task-id="${task.id}">×</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};
