// Render Management Module
// Handles all UI rendering functionality

const RenderManager = {
    // Render everything
    renderAll() {
        this.renderDailies();
        this.renderTasks();
        this.updateCounts();
        this.updateMotivationalMessage();
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
            
            if (isCompletedToday) {
                completedDailies.push(task);
            } else if (!scheduledToday) {
                scheduledDailies.push(task);
            } else {
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
        
        const allTasks = FiltersManager.getFilteredTasks('todo');
        
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
        
        card.innerHTML = `
            <div class="task-header">
                <input type="checkbox" class="task-checkbox" ${task.status === 'done' ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title">${Utils.linkify(task.title)}</div>
                    <div class="task-info-row">
                        ${task.task_type === 'daily' ? `
                            <div class="task-info-left">
                                ${formattedDays ? `<span class="task-days-of-week" data-field="days_of_week" data-task-id="${task.id}">📅 ${formattedDays}</span>` : `<span class="task-days-of-week add-days" data-field="days_of_week" data-task-id="${task.id}">+ ${t('daysOfWeek')}</span>`}
                                <span class="streak-badge">🔥 ${task.streak_count || 0} ${t('days')}</span>
                                ${task.max_streak > 0 ? `<span class="streak-badge">⭐ ${task.max_streak} ${t('maxStreak')}</span>` : ''}
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
                        <div class="task-actions">
                            <button class="task-btn pomodoro" data-task-id="${task.id}">🍅 ${t('pomodoro')}</button>
                            <button class="task-btn edit" data-task-id="${task.id}">${t('edit')}</button>
                            <button class="task-btn delete" data-task-id="${task.id}">${t('delete')}</button>
                        </div>
                    </div>
                    ${task.subtasks?.length > 0 ? this.createSubtasksHTML(task, progress) : ''}
                </div>
            </div>
        `;
        
        // Event listeners
        card.querySelector('.task-checkbox').addEventListener('change', () => {
            TasksManager.toggleTaskStatus(task.id);
            this.renderAll();
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
                InlineEditManager.editDaysOfWeekInline(card, task);
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
        
        card.querySelector('.pomodoro').addEventListener('click', () => {
            PomodoroManager.openModal(task);
        });
        
        card.querySelector('.edit').addEventListener('click', (e) => {
            e.stopPropagation();
            InlineEditManager.startEditing(task.id, 'full');
        });
        
        // Make task title clickable to edit (if not done)
        const titleEl = card.querySelector('.task-title');
        if (titleEl && task.status !== 'done') {
            titleEl.style.cursor = 'pointer';
            titleEl.title = t('edit');
            titleEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!InlineEditManager.isEditing(task.id)) {
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
