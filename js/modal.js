// Modal Management Module
// Handles task/daily modal functionality

const ModalManager = {
    currentEditingTask: null,

    // Open task modal (options: { prefillDueDate, prefillDueTime, prefillDailyDay })
    openTaskModal(task = null, taskType = 'todo', options = {}) {
        options = options || {};
        this.currentEditingTask = task;
        const modal = document.getElementById('task-modal');
        const titleInput = document.getElementById('task-title-input');
        const statusSelect = document.getElementById('task-status-select');
        const prioritySelect = document.getElementById('task-priority-select');
        const dueDateInput = document.getElementById('task-due-date-input');
        const dueTimeInput = document.getElementById('task-due-time-input');
        const tagsInput = document.getElementById('task-tags-input');
        const daysOfWeekGroup = document.getElementById('task-days-of-week-group');
        const priorityGroup = document.getElementById('task-priority-group');
        const dueDateGroup = document.getElementById('task-due-date-group');
        const subtasksList = document.getElementById('subtasks-list');

        if (!modal || !titleInput || !statusSelect || !daysOfWeekGroup || !prioritySelect || !dueDateInput || !tagsInput || !priorityGroup || !dueDateGroup) {
            console.error('openTaskModal: missing required DOM elements');
            return;
        }
        
        // Update labels
        document.getElementById('task-title-label').textContent = `${t('title')} *`;
        document.getElementById('task-status-label').textContent = t('status');
        document.getElementById('task-priority-label').textContent = t('priority');
        document.getElementById('task-due-date-label').textContent = t('dueDate');
        document.getElementById('task-due-time-label').textContent = t('dueTimeOptional');
        const durationLabel = document.getElementById('task-duration-label');
        const durationInput = document.getElementById('task-duration-input');
        if (durationLabel) durationLabel.textContent = t('taskDurationLabel');
        document.getElementById('task-days-label').textContent = t('daysOfWeek');
        document.getElementById('task-tags-label').textContent = t('tags');
        document.getElementById('task-subtasks-label').textContent = t('subtasks');
        document.getElementById('add-subtask-btn').textContent = `+ ${t('addSubtask')}`;
        document.getElementById('cancel-task-btn').textContent = t('cancel');
        document.getElementById('save-task-btn').textContent = t('save');
        
        // Update status options
        statusSelect.innerHTML = `
            <option value="pending">${t('pending')}</option>
            <option value="in_progress">${t('inProgress')}</option>
            <option value="done">${t('done')}</option>
        `;
        
        // Update priority options
        prioritySelect.innerHTML = `
            <option value="">${t('none')}</option>
            <option value="low">${t('low')}</option>
            <option value="medium">${t('medium')}</option>
            <option value="high">${t('high')}</option>
        `;
        
        // Update days of week labels
        const dayLabels = {
            monday: t('monday'),
            tuesday: t('tuesday'),
            wednesday: t('wednesday'),
            thursday: t('thursday'),
            friday: t('friday'),
            saturday: t('saturday'),
            sunday: t('sunday')
        };
        
        if (daysOfWeekGroup) {
            daysOfWeekGroup.querySelectorAll('label').forEach((label) => {
                const checkbox = label.querySelector('.day-checkbox');
                if (checkbox) {
                    const dayValue = checkbox.value;
                    label.innerHTML = `<input type="checkbox" value="${dayValue}" class="day-checkbox"> ${dayLabels[dayValue]}`;
                }
            });
        }
        
        document.getElementById('task-modal-title').textContent = 
            task ? (task.task_type === 'daily' ? t('editDaily') : t('editTask')) : 
            (taskType === 'daily' ? t('newDaily') : t('newTask'));
        
        const dueTimeGroup = document.getElementById('task-due-time-group');

        if (task) {
            titleInput.value = task.title;
            statusSelect.value = task.status;
            prioritySelect.value = task.priority || '';
            dueDateInput.value = task.due_date || '';
            if (dueTimeInput) dueTimeInput.value = task.due_time || '';
            if (durationInput) durationInput.value = String(Utils.getTaskDurationMinutes(task));
            tagsInput.value = (task.meta?.tags || []).join(', ');
            
            if (task.task_type === 'daily') {
                daysOfWeekGroup.style.display = 'block';
                priorityGroup.style.display = 'none';
                dueDateGroup.style.display = 'none';
                const checkboxes = daysOfWeekGroup.querySelectorAll('.day-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = (task.meta?.days_of_week || []).includes(cb.value);
                });
            } else {
                daysOfWeekGroup.style.display = 'none';
                priorityGroup.style.display = 'block';
                dueDateGroup.style.display = 'block';
            }
            
            this.renderSubtasksInModal(task);
        } else {
            titleInput.value = '';
            statusSelect.value = 'pending';
            prioritySelect.value = '';
            dueDateInput.value = options.prefillDueDate && taskType === 'todo' ? options.prefillDueDate : '';
            if (dueTimeInput) {
                dueTimeInput.value =
                    taskType === 'todo' && options.prefillDueTime
                        ? options.prefillDueTime
                        : '';
            }
            tagsInput.value = '';
            if (durationInput) durationInput.value = String(Utils.DURATION_MINUTES_DEFAULT);
            titleInput.placeholder = t('title');
            tagsInput.placeholder = 'tag1, tag2, tag3';
            
            if (taskType === 'daily') {
                daysOfWeekGroup.style.display = 'block';
                priorityGroup.style.display = 'none';
                dueDateGroup.style.display = 'none';
                daysOfWeekGroup.querySelectorAll('.day-checkbox').forEach(cb => {
                    cb.checked = options.prefillDailyDay ? cb.value === options.prefillDailyDay : true;
                });
            } else {
                daysOfWeekGroup.style.display = 'none';
                priorityGroup.style.display = 'block';
                dueDateGroup.style.display = 'block';
            }
            
            if (subtasksList) subtasksList.innerHTML = '';
        }

        const isDailyModal = task ? task.task_type === 'daily' : taskType === 'daily';
        if (dueTimeGroup) dueTimeGroup.style.display = isDailyModal ? 'none' : 'block';
        
        modal.style.display = 'flex';
    },
    
    // Close task modal
    closeTaskModal() {
        document.getElementById('task-modal').style.display = 'none';
        this.currentEditingTask = null;
    },
    
    // Save task from modal
    saveTaskFromModal() {
        const titleInput = document.getElementById('task-title-input');
        const statusSelect = document.getElementById('task-status-select');
        const prioritySelect = document.getElementById('task-priority-select');
        const dueDateInput = document.getElementById('task-due-date-input');
        const dueTimeInput = document.getElementById('task-due-time-input');
        const tagsInput = document.getElementById('task-tags-input');
        const daysOfWeekGroup = document.getElementById('task-days-of-week-group');
        const durationInputEl = document.getElementById('task-duration-input');

        if (!titleInput || !statusSelect || !daysOfWeekGroup) {
            console.error('Task modal: missing required fields');
            return;
        }
        
        const title = titleInput.value.trim();
        if (!title) {
            Utils.showToast(t('titleRequired'), 'error');
            return;
        }
        
        const tags = tagsInput ? tagsInput.value.split(',').map((x) => x.trim()).filter((x) => x) : [];
        const daysOfWeek = Array.from(daysOfWeekGroup.querySelectorAll('.day-checkbox:checked'))
            .map(cb => cb.value);
        
        const taskType = this.currentEditingTask ? this.currentEditingTask.task_type : 
            (daysOfWeekGroup.style.display === 'none' ? 'todo' : 'daily');

        const taskData = {
            title,
            status: statusSelect.value,
            priority: taskType === 'todo' && prioritySelect ? (prioritySelect.value || null) : null,
            due_date: taskType === 'todo' && dueDateInput ? (dueDateInput.value || null) : null,
            tags,
            days_of_week: taskType === 'daily' ? daysOfWeek : [],
            duration_minutes: durationInputEl
                ? Utils.normalizeDurationMinutes(durationInputEl.value)
                : Utils.DURATION_MINUTES_DEFAULT
        };
        if (taskType === 'todo') {
            taskData.due_time =
                dueTimeInput && dueTimeInput.value
                    ? Utils.normalizeDueTime(dueTimeInput.value)
                    : null;
        }
        
        if (this.currentEditingTask) {
            TasksManager.updateTask(this.currentEditingTask.id, taskData);
        } else {
            TasksManager.addTask(taskType, taskData);
        }
        
        this.closeTaskModal();
        if (typeof RenderManager !== 'undefined') {
            RenderManager.renderAll();
        }
    },
    
    // Render subtasks in modal
    renderSubtasksInModal(task) {
        const subtasksList = document.getElementById('subtasks-list');
        if (!subtasksList) return;
        subtasksList.innerHTML = '';
        
        // Get fresh task data
        const freshTask = DataManager.findTask(task.id);
        if (!freshTask) return;
        
        (freshTask.subtasks || []).forEach(subtask => {
            const item = document.createElement('div');
            item.className = `subtask-item ${subtask.status === 'done' ? 'completed' : ''}`;
            item.innerHTML = `
                <input type="checkbox" class="subtask-checkbox" ${subtask.status === 'done' ? 'checked' : ''} data-subtask-id="${subtask.id}">
                <input type="text" class="subtask-title-input" value="${subtask.title}" data-subtask-id="${subtask.id}" style="background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; color: var(--text-primary); font-size: 13px; flex: 1;">
                <button class="subtask-delete" data-subtask-id="${subtask.id}">×</button>
            `;
            
            item.querySelector('.subtask-checkbox').addEventListener('change', (e) => {
                const subtaskId = parseFloat(e.target.dataset.subtaskId);
                SubtasksManager.toggleSubtaskStatus(freshTask.id, subtaskId);
                this.renderSubtasksInModal(freshTask);
            });
            
            item.querySelector('.subtask-title-input').addEventListener('blur', (e) => {
                const subtaskId = parseFloat(e.target.dataset.subtaskId);
                const title = e.target.value.trim();
                if (title) {
                    SubtasksManager.updateSubtask(freshTask.id, subtaskId, { title });
                    this.renderSubtasksInModal(freshTask);
                }
            });
            
            item.querySelector('.subtask-title-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
            
            item.querySelector('.subtask-delete').addEventListener('click', (e) => {
                const subtaskId = parseFloat(e.target.dataset.subtaskId);
                SubtasksManager.deleteSubtask(freshTask.id, subtaskId);
                this.renderSubtasksInModal(freshTask);
            });
            
            subtasksList.appendChild(item);
        });
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Task modal buttons
        document.getElementById('save-task-btn').addEventListener('click', () => this.saveTaskFromModal());
        document.getElementById('cancel-task-btn').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('close-task-modal').addEventListener('click', () => this.closeTaskModal());
        
        // Add subtask button
        document.getElementById('add-subtask-btn').addEventListener('click', () => {
            if (!this.currentEditingTask) return;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = t('addSubtask');
            input.className = 'subtask-title-input';
            input.style.width = '100%';
            input.style.marginTop = '8px';
            input.style.background = 'rgba(0, 0, 0, 0.2)';
            input.style.border = '1px solid var(--border-color)';
            input.style.borderRadius = '6px';
            input.style.padding = '6px 8px';
            input.style.color = 'var(--text-primary)';
            input.style.fontSize = '13px';
            
            const handleBlur = () => {
                const title = input.value.trim();
                if (title) {
                    SubtasksManager.addSubtask(this.currentEditingTask.id, title);
                    this.renderSubtasksInModal(this.currentEditingTask);
                } else {
                    input.remove();
                }
            };
            
            input.addEventListener('blur', handleBlur);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
            
            const subtasksList = document.getElementById('subtasks-list');
            subtasksList.appendChild(input);
            input.focus();
        });
        
        // Close modal on overlay click
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                this.closeTaskModal();
            }
        });
    }
};
