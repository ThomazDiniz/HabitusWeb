// Render Management Module
// Handles all UI rendering functionality

/** Último cartão com mousedown (para colar imagem com Ctrl+V). */
const TaskCardPasteState = {
    lastCard: null
};

const RenderManager = {
    todoDateFilter: 'all', // all | today | no_date | future
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

    syncTasksDateFilterUI() {
        const allBtn = document.getElementById('tasks-date-filter-all');
        const todayBtn = document.getElementById('tasks-date-filter-today');
        const noDateBtn = document.getElementById('tasks-date-filter-no-date');
        const futureBtn = document.getElementById('tasks-date-filter-future');
        if (!allBtn || !todayBtn || !noDateBtn || !futureBtn) return;

        allBtn.textContent = t('tasksDateFilterAll');
        todayBtn.textContent = t('tasksDateFilterToday');
        noDateBtn.textContent = t('tasksDateFilterNoDate');
        futureBtn.textContent = t('tasksDateFilterFuture');

        [allBtn, todayBtn, noDateBtn, futureBtn].forEach((b) => b.classList.remove('is-active'));
        if (this.todoDateFilter === 'today') todayBtn.classList.add('is-active');
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
            if (f === 'today') return d <= today; // inclui atrasadas + hoje
            return true;
        });
    },

    // Render everything
    renderAll() {
        this.renderDailies();
        this.renderTasks();
        this.updateCounts();
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
        if (typeof StatsManager !== 'undefined' && StatsManager.render) {
            try {
                StatsManager.render();
            } catch (err) {
                console.error('StatsManager.render failed:', err);
            }
        }
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
        const completedContainer = document.getElementById('dailies-completed-list');
        const scheduledContainer = document.getElementById('dailies-scheduled-list');
        
        container.innerHTML = '';
        completedContainer.innerHTML = '';
        scheduledContainer.innerHTML = '';
        
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
        
        if (completedDailies.length > 0) {
            const section = document.getElementById('dailies-completed-section');
            section.style.display = 'block';
            const list = section.querySelector('.completed-list');
            list.style.display = 'none'; // Hidden by default
            completedDailies.forEach(task => {
                completedContainer.appendChild(this.createTaskCard(task));
            });
        } else {
            document.getElementById('dailies-completed-section').style.display = 'none';
        }
        
        if (scheduledDailies.length > 0) {
            const section = document.getElementById('dailies-scheduled-section');
            section.style.display = 'block';
            const list = section.querySelector('.scheduled-list');
            list.style.display = 'none'; // Hidden by default
            scheduledDailies.forEach(task => {
                scheduledContainer.appendChild(this.createTaskCard(task));
            });
        } else {
            document.getElementById('dailies-scheduled-section').style.display = 'none';
        }
        
        this.renderTagFilters('daily');
        DragDropManager.setup('dailies-list');
    },
    
    // Render tasks
    renderTasks() {
        const container = document.getElementById('tasks-list');
        const completedContainer = document.getElementById('tasks-completed-list');
        
        container.innerHTML = '';
        completedContainer.innerHTML = '';
        
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
        
        if (completedTasks.length > 0) {
            const section = document.getElementById('tasks-completed-section');
            section.style.display = 'block';
            const list = section.querySelector('.completed-list');
            list.style.display = 'none'; // Hidden by default
            completedTasks.forEach(task => {
                completedContainer.appendChild(this.createTaskCard(task));
            });
        } else {
            document.getElementById('tasks-completed-section').style.display = 'none';
        }
        
        this.renderTagFilters('todo');
        DragDropManager.setup('tasks-list');
    },
    
    // Render tag filters
    renderTagFilters(taskType) {
        const container = document.getElementById(`${taskType === 'todo' ? 'tasks' : 'dailies'}-tag-filters`);
        container.innerHTML = '';
        
        const allTags = FiltersManager.getAllTags(taskType);
        
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
    
    // Create task card
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card ${task.status === 'done' ? 'completed' : ''}`;
        card.draggable = true;
        card.dataset.taskId = task.id;

        // Click no card abre o editor completo (exceto em controles/edições inline)
        card.addEventListener('mousedown', () => {
            TaskCardPasteState.lastCard = card;
        });

        card.addEventListener('click', (e) => {
            const interactive = e.target.closest(
                'button, a, input, select, textarea, .task-tags-inline, .task-tag, .tag-remove, .task-inline-time-input, .task-duration-stepper, .task-pasted-images, .task-pasted-remove, .task-add-subtask-btn, .task-subtasks-wrap, .subtasks-container, .subtask-item, [contenteditable="true"]'
            );
            if (interactive) return;
            InlineEditManager.startEditing(task.id, 'full');
        });
        
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
        const progress = SubtasksManager.getSubtasksProgress(task);
        
        // Format days of week for dailies
        const formatDaysOfWeek = (days) => {
            if (!days || days.length === 0) return '';
            const dayLabels = {
                monday: t('monday'),
                tuesday: t('tuesday'),
                wednesday: t('wednesday'),
                thursday: t('thursday'),
                friday: t('friday'),
                saturday: t('saturday'),
                sunday: t('sunday')
            };
            const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            if (days.length === 7) return t('everyDay');
            return days.map(d => dayLabels[d] || d).join(', ');
        };
        
        const daysOfWeek = task.meta?.days_of_week || [];
        const formattedDays = formatDaysOfWeek(daysOfWeek);

        const inlineTimePicker =
            !task.due_time &&
            (task.task_type === 'daily' || (task.task_type === 'todo' && task.due_date))
                ? `<input type="time" class="task-inline-time-input" data-task-id="${task.id}" step="1800" aria-label="${t('weekCalendarPickTime')}" title="${t('weekCalendarPickTime')}" />`
                : '';
        const dueTimeDisplay = task.due_time
            ? `<span class="task-due-time-badge">🕐 ${task.due_time}</span>`
            : inlineTimePicker;

        const durM = Utils.getTaskDurationMinutes(task);
        const durationStepper = `
            <div class="task-duration-stepper" data-task-id="${task.id}" title="${t('taskDurationLabel')}">
                <button type="button" class="task-duration-btn task-duration-minus" aria-label="${t('taskDurationDecrease')}">−</button>
                <span class="task-duration-value">${durM}</span>
                <button type="button" class="task-duration-btn task-duration-plus" aria-label="${t('taskDurationIncrease')}">+</button>
            </div>`;

        card.innerHTML = `
            <div class="task-header">
                <input type="checkbox" class="task-checkbox" ${task.status === 'done' ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title-row">
                        <div class="task-title">${Utils.linkify(task.title)}</div>
                        <div class="task-actions-inline">
                            ${task.task_type === 'todo' && task.status !== 'done'
                                ? `<button type="button" class="task-btn task-btn-today" data-task-id="${task.id}">${t('setForToday')}</button>`
                                : ''}
                            <button type="button" class="task-btn task-order-top" data-task-id="${task.id}" title="${t('sendToTop')}" aria-label="${t('sendToTop')}">↑</button>
                            <button type="button" class="task-btn task-order-bottom" data-task-id="${task.id}" title="${t('sendToBottom')}" aria-label="${t('sendToBottom')}">↓</button>
                            <button class="task-btn pomodoro" data-task-id="${task.id}" title="${t('pomodoro')}" aria-label="${t('pomodoro')}">🍅</button>
                            <button class="task-btn delete" data-task-id="${task.id}" title="${t('delete')}" aria-label="${t('delete')}">🗑</button>
                        </div>
                    </div>
                    <div class="task-info-row">
                        ${task.task_type === 'daily' ? `
                            <div class="task-info-left">
                                ${formattedDays ? `<span class="task-days-of-week" data-field="days_of_week" data-task-id="${task.id}">📅 ${formattedDays}</span>` : `<span class="task-days-of-week add-days" data-field="days_of_week" data-task-id="${task.id}">+ ${t('daysOfWeek')}</span>`}
                                <span class="streak-badge">🔥 ${task.streak_count || 0} ${t('days')}</span>
                                ${task.max_streak > 0 ? `<span class="streak-badge">⭐ ${task.max_streak} ${t('maxStreak')}</span>` : ''}
                                ${dueTimeDisplay}
                                ${durationStepper}
                                <div class="task-tags-inline" data-field="tags" data-task-id="${task.id}">
                                    ${task.meta?.tags?.length > 0 ? task.meta.tags.map(tag => `
                                        <span class="task-tag" data-tag="${tag}">
                                            ${tag}
                                            <span class="tag-remove" data-tag="${tag}">×</span>
                                        </span>
                                    `).join('') : ''}
                                    <span class="task-tag add-tag">+ ${t('tags')}</span>
                                </div>
                            </div>
                        ` : `
                            <div class="task-info-left">
                                ${task.priority ? `<span class="task-priority-badge ${task.priority}" data-field="priority" data-task-id="${task.id}">${t(task.priority)}</span>` : ''}
                                ${!task.priority ? `<span class="task-priority-badge add-priority" data-field="priority" data-task-id="${task.id}">+ ${t('priority')}</span>` : ''}
                                ${task.due_date ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}" data-field="due_date" data-task-id="${task.id}">${Utils.formatDate(task.due_date)}</span>` : ''}
                                ${!task.due_date ? `<span class="task-due-date add-due-date" data-field="due_date" data-task-id="${task.id}">+ ${t('dueDate')}</span>` : ''}
                                ${dueTimeDisplay}
                                ${durationStepper}
                                <div class="task-tags-inline" data-field="tags" data-task-id="${task.id}">
                                    ${task.meta?.tags?.length > 0 ? task.meta.tags.map(tag => `
                                        <span class="task-tag" data-tag="${tag}">
                                            ${tag}
                                            <span class="tag-remove" data-tag="${tag}">×</span>
                                        </span>
                                    `).join('') : ''}
                                    <span class="task-tag add-tag">+ ${t('tags')}</span>
                                </div>
                            </div>
                        `}
                    </div>
                    ${this.createPastedImagesHTML(task)}
                    ${this.createSubtasksBlock(task, progress)}
                </div>
            </div>
        `;
        
        // Event listeners
        card.querySelector('.task-checkbox').addEventListener('change', (e) => {
            const isMarkingDone = e.target.checked;
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
                        if (typeof RenderManager !== 'undefined') {
                            RenderManager.renderAll();
                        }
                    }
                });
            }
        });
        
        // Tags - click to filter, or add new tag, or remove tag
        card.querySelectorAll('.task-tag').forEach(tagEl => {
            tagEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const tag = tagEl.dataset.tag;
                if (tag) {
                    // Check if clicked on remove button
                    if (e.target.classList.contains('tag-remove')) {
                        e.stopPropagation();
                        InlineEditManager.removeTag(task.id, tag);
                        this.renderAll();
                    } else {
                        // Existing tag - filter
                        FiltersManager.toggleFilter(task.task_type, tag);
                        this.renderAll();
                    }
                } else if (tagEl.classList.contains('add-tag')) {
                    // Add tag button
                    InlineEditManager.addTagInline(card, task);
                }
            });
        });
        
        // Days of week for dailies - click to edit
        const daysOfWeekEl = card.querySelector('.task-days-of-week');
        if (daysOfWeekEl && task.task_type === 'daily') {
            daysOfWeekEl.style.cursor = 'pointer';
            daysOfWeekEl.addEventListener('click', (e) => {
                e.stopPropagation();
                InlineEditManager.startEditing(task.id, 'full');
            });
        }
        
        // Priority - click to edit or add
        const priorityEl = card.querySelector('.task-priority-badge');
        if (priorityEl) {
            priorityEl.style.cursor = 'pointer';
            priorityEl.addEventListener('click', (e) => {
                e.stopPropagation();
                InlineEditManager.editPriorityInline(card, task);
            });
        }
        
        // Due date - click to edit
        const dueDateEl = card.querySelector('.task-due-date');
        if (dueDateEl) {
            dueDateEl.style.cursor = 'pointer';
            dueDateEl.addEventListener('click', (e) => {
                e.stopPropagation();
                InlineEditManager.editDueDateInline(card, task);
            });
        }

        const inlineTimeEl = card.querySelector('.task-inline-time-input');
        if (inlineTimeEl) {
            inlineTimeEl.addEventListener('click', (e) => e.stopPropagation());
            inlineTimeEl.addEventListener('keydown', (e) => e.stopPropagation());
            inlineTimeEl.addEventListener('change', () => {
                const v = inlineTimeEl.value;
                const normalized = v ? Utils.normalizeDueTime(v) : null;
                if (v && !normalized) return;
                TasksManager.updateTask(task.id, { due_time: normalized || null });
                if (typeof RenderManager !== 'undefined') {
                    RenderManager.renderAll();
                }
            });
        }

        const durationStepperEl = card.querySelector('.task-duration-stepper');
        if (durationStepperEl) {
            durationStepperEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.task-duration-btn');
                if (!btn) return;
                e.stopPropagation();
                const fresh = DataManager.findTask(task.id);
                if (!fresh) return;
                const cur = Utils.getTaskDurationMinutes(fresh);
                const delta = btn.classList.contains('task-duration-minus') ? -15 : 15;
                const next = Utils.normalizeDurationMinutes(cur + delta);
                TasksManager.updateTask(task.id, { duration_minutes: next });
                this.renderAll();
            });
        }

        card.querySelectorAll('.task-pasted-remove').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-img-index'), 10);
                const fresh = DataManager.findTask(task.id);
                if (!fresh || Number.isNaN(idx)) return;
                const arr = [...(fresh.meta?.pasted_images || [])];
                arr.splice(idx, 1);
                TasksManager.updateTask(task.id, { pasted_images: arr });
                this.renderAll();
            });
        });

        const addSubBtn = card.querySelector('.task-add-subtask-btn');
        if (addSubBtn) {
            addSubBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                InlineEditManager.addSubtaskInline(card, task);
            });
        }

        // Subtask event listeners
        card.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const subtaskId = parseFloat(e.target.dataset.subtaskId);
                SubtasksManager.toggleSubtaskStatus(task.id, subtaskId);
                this.renderAll();
            });
        });
        
        card.querySelectorAll('.subtask-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subtaskId = parseFloat(e.target.dataset.subtaskId);
                SubtasksManager.deleteSubtask(task.id, subtaskId);
                this.renderAll();
            });
        });
        
        card.querySelector('.task-order-top').addEventListener('click', (e) => {
            e.stopPropagation();
            TasksManager.moveTaskToTop(task.id);
            this.renderAll();
        });
        card.querySelector('.task-order-bottom').addEventListener('click', (e) => {
            e.stopPropagation();
            TasksManager.moveTaskToBottom(task.id);
            this.renderAll();
        });

        card.querySelector('.pomodoro').addEventListener('click', () => {
            PomodoroManager.openModal(task);
        });

        const todayBtn = card.querySelector('.task-btn-today');
        if (todayBtn) {
            todayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hhmm = Utils.getLocalDueTimeNow();
                TasksManager.updateTask(task.id, {
                    due_date: Utils.dateToYMD(new Date()),
                    due_time: hhmm
                });
                Utils.showToast(t('setForTodayDone'));
                this.renderAll();
            });
        }
        
        // Make task title clickable to edit (if not done)
        const titleEl = card.querySelector('.task-title');
        if (titleEl && task.status !== 'done') {
            titleEl.style.cursor = 'pointer';
            titleEl.title = t('edit');
            titleEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (InlineEditManager.isEditing(task.id)) return;
                if (task.task_type === 'daily') {
                    InlineEditManager.startEditing(task.id, 'full');
                } else {
                    InlineEditManager.startEditing(task.id, 'title');
                }
            });
        }
        
        card.querySelector('.delete').addEventListener('click', () => {
            if (confirm(t('confirmDelete'))) {
                TasksManager.deleteTask(task.id);
                this.renderAll();
            }
        });
        
        return card;
    },

    setupGlobalImagePaste() {
        if (this._globalImagePasteBound) return;
        this._globalImagePasteBound = true;
        document.addEventListener('paste', (e) => {
            const el = e.target;
            if (el && el.closest && el.closest('input, textarea, [contenteditable="true"]')) return;
            if (el && el.id === 'global-search-input') return;
            let modalOpen = false;
            document.querySelectorAll('.modal-overlay').forEach((m) => {
                if (m.style.display === 'flex') modalOpen = true;
            });
            if (modalOpen) return;

            const items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            let imageBlob = null;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageBlob = items[i].getAsFile();
                    break;
                }
            }
            if (!imageBlob) return;

            const card = TaskCardPasteState.lastCard;
            if (!card || !document.body.contains(card)) {
                Utils.showToast(t('pasteImageNoCard'), 'error');
                return;
            }

            e.preventDefault();
            const taskId = parseFloat(card.dataset.taskId, 10);
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const fresh = DataManager.findTask(taskId);
                if (!fresh) return;
                const arr = [...(fresh.meta?.pasted_images || [])];
                if (arr.length >= 8) {
                    Utils.showToast(t('pasteImageTooMany'), 'error');
                    return;
                }
                if (String(dataUrl).length > 1500000) {
                    Utils.showToast(t('pasteImageTooLarge'), 'error');
                    return;
                }
                arr.push(dataUrl);
                TasksManager.updateTask(taskId, { pasted_images: arr });
                this.renderAll();
            };
            reader.readAsDataURL(imageBlob);
        });
    },

    createPastedImagesHTML(task) {
        const imgs = task.meta?.pasted_images || [];
        if (!imgs.length) {
            return `<div class="task-pasted-images" data-task-id="${task.id}" aria-hidden="true"></div>`;
        }
        const removeLabel = String(t('removeImageAria')).replace(/"/g, '&quot;');
        return `
            <div class="task-pasted-images" data-task-id="${task.id}">
                ${imgs
                    .map(
                        (url, i) => `
                    <div class="task-pasted-thumb-wrap">
                        <img src="${url}" alt="" class="task-pasted-thumb" loading="lazy" />
                        <button type="button" class="task-pasted-remove" data-img-index="${i}" aria-label="${removeLabel}">×</button>
                    </div>`
                    )
                    .join('')}
            </div>`;
    },

    createSubtasksBlock(task, progress) {
        const list =
            task.subtasks && task.subtasks.length > 0 ? this.createSubtasksHTML(task, progress) : '';
        return `
            <div class="task-subtasks-wrap">
                ${list}
                <button type="button" class="task-add-subtask-btn">+ ${t('addSubtask')}</button>
            </div>
        `;
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
