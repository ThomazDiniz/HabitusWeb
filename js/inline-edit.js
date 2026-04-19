// Inline Edit Module
// Handles inline editing of tasks directly in the card

const InlineEditManager = {
    editingTaskId: null,
    editingDaysOfWeekTaskId: null,
    
    // Create a new task directly (no modal)
    // title: optional - if provided, creates task with that title; otherwise creates empty and focuses for editing
    createTaskDirectly(taskType, title = '') {
        const task = TasksManager.addTask(taskType, {
            title: (title || '').trim(),
            status: 'pending'
        });
        
        if (task) {
            if (!task.title) {
                // Mark as new/editing - focus on title
                task._isNew = true;
            }
            RenderManager.renderAll();
            
            if (!task.title) {
                // Focus on the new task title after render
                setTimeout(() => {
                    this.startEditing(task.id, 'title');
                }, 100);
            }
        }
    },
    
    // Start editing a task field
    startEditing(taskId, field = 'title') {
        const task = DataManager.findTask(taskId);
        if (!task) return;
        
        this.editingTaskId = taskId;
        const card = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!card) return;
        
        if (field === 'title') {
            this.editTitle(card, task);
        } else if (field === 'full') {
            this.editFull(card, task);
        }
    },
    
    // Edit title inline
    editTitle(card, task) {
        const titleEl = card.querySelector('.task-title');
        if (!titleEl) return;
        
        const currentText = task.title || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-title-input';
        input.value = currentText;
        input.placeholder = task._isNew ? t('title') + ' *' : t('title');
        input.style.width = '100%';
        input.style.background = 'rgba(0, 0, 0, 0.3)';
        input.style.border = '1px solid var(--blue-primary)';
        input.style.borderRadius = '6px';
        input.style.padding = '6px 10px';
        input.style.color = 'var(--text-primary)';
        input.style.fontSize = '15px';
        input.style.fontWeight = '500';
        
        // Store reference to original element
        const parent = titleEl.parentElement;
        titleEl.replaceWith(input);
        input.focus();
        if (currentText) {
            input.select();
        }
        
        let saved = false;
        
        const save = () => {
            if (saved) return;
            saved = true;
            
            const newTitle = input.value.trim();
            if (newTitle) {
                TasksManager.updateTask(task.id, { title: newTitle });
                if (task._isNew) {
                    delete task._isNew;
                }
            } else if (task._isNew) {
                // If new task with empty title, delete it
                TasksManager.deleteTask(task.id);
            }
            this.editingTaskId = null;
            RenderManager.renderAll();
        };
        
        const cancel = () => {
            if (saved) return;
            saved = true;
            
            if (task._isNew && !task.title) {
                TasksManager.deleteTask(task.id);
            }
            this.editingTaskId = null;
            if (task._isNew) {
                delete task._isNew;
            }
            RenderManager.renderAll();
        };
        
        input.addEventListener('blur', () => {
            setTimeout(save, 200); // Delay to allow button clicks
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });
    },
    
    // Edit full task (expand card for full editing)
    editFull(card, task) {
        if (this.editingTaskId === task.id && card.classList.contains('editing-full')) {
            return; // Already editing
        }

        if (this._fullEditOutsideCleanup) {
            this._fullEditOutsideCleanup();
            this._fullEditOutsideCleanup = null;
        }
        
        this.editingTaskId = task.id;
        card.classList.add('editing-full');
        card.draggable = false;
        
        const taskContent = card.querySelector('.task-content');
        const currentHTML = taskContent.innerHTML;
        
        // Create edit form
        const editForm = document.createElement('div');
        editForm.className = 'task-edit-form';
        
        const isDaily = task.task_type === 'daily';
        
        editForm.innerHTML = `
            <div class="edit-form-row">
                <label>${t('title')} *</label>
                <input type="text" class="edit-title-input" value="${task.title || ''}" placeholder="${t('title')}">
            </div>
            ${!isDaily ? `
                <div class="edit-form-row">
                    <label>${t('priority')}</label>
                    <select class="edit-priority-select">
                        <option value="">${t('none')}</option>
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>${t('low')}</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>${t('medium')}</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>${t('high')}</option>
                    </select>
                </div>
                <div class="edit-form-row">
                    <label>${t('dueDate')}</label>
                    <input type="date" class="edit-due-date-input" value="${task.due_date || ''}">
                </div>
            ` : `
                <div class="edit-form-row">
                    <label>${t('daysOfWeek')}</label>
                    <div class="edit-days-checkboxes">
                        <label><input type="checkbox" value="monday" class="edit-day-checkbox" ${(task.meta?.days_of_week || []).includes('monday') ? 'checked' : ''}> ${t('monday')}</label>
                        <label><input type="checkbox" value="tuesday" class="edit-day-checkbox" ${(task.meta?.days_of_week || []).includes('tuesday') ? 'checked' : ''}> ${t('tuesday')}</label>
                        <label><input type="checkbox" value="wednesday" class="edit-day-checkbox" ${(task.meta?.days_of_week || []).includes('wednesday') ? 'checked' : ''}> ${t('wednesday')}</label>
                        <label><input type="checkbox" value="thursday" class="edit-day-checkbox" ${(task.meta?.days_of_week || []).includes('thursday') ? 'checked' : ''}> ${t('thursday')}</label>
                        <label><input type="checkbox" value="friday" class="edit-day-checkbox" ${(task.meta?.days_of_week || []).includes('friday') ? 'checked' : ''}> ${t('friday')}</label>
                        <label><input type="checkbox" value="saturday" class="edit-day-checkbox" ${(task.meta?.days_of_week || []).includes('saturday') ? 'checked' : ''}> ${t('saturday')}</label>
                        <label><input type="checkbox" value="sunday" class="edit-day-checkbox" ${(task.meta?.days_of_week || []).includes('sunday') ? 'checked' : ''}> ${t('sunday')}</label>
                    </div>
                </div>
            `}
            <div class="edit-form-row">
                <label>${t('dueTimeOptional')}</label>
                <input type="time" class="edit-due-time-input" step="60" value="${task.due_time || ''}">
            </div>
            <div class="edit-form-row">
                <label>${t('taskDurationLabel')}</label>
                <input type="number" class="edit-duration-input" min="15" max="480" step="15" value="${Utils.getTaskDurationMinutes(task)}">
            </div>
            <div class="edit-form-row">
                <label>${t('tags')}</label>
                <input type="text" class="edit-tags-input" value="${(task.meta?.tags || []).join(', ')}" placeholder="tag1, tag2, tag3">
            </div>
            <div class="edit-form-actions">
                <button class="edit-save-btn">${t('save')}</button>
                <button class="edit-cancel-btn">${t('cancel')}</button>
                <button class="edit-delete-btn">${t('delete')}</button>
            </div>
        `;
        
        // Hide original content
        taskContent.style.display = 'none';
        card.appendChild(editForm);
        
        // Focus title input
        const titleInput = editForm.querySelector('.edit-title-input');
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }
        
        // Mesmo fluxo para atividades (todo) e hábitos (daily): clique fora do cartão grava.
        const outsideClickHandler = (e) => {
            if (card.contains(e.target)) return;
            this.saveFullEdit(card, task, editForm);
        };

        const cleanupFullEditOutside = () => {
            document.removeEventListener('click', outsideClickHandler, true);
            this._fullEditOutsideCleanup = null;
        };

        this._fullEditOutsideCleanup = cleanupFullEditOutside;

        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler, true);
        }, 100);

        // Save handler
        const saveBtn = editForm.querySelector('.edit-save-btn');
        saveBtn.addEventListener('click', () => {
            this.saveFullEdit(card, task, editForm);
        });
        
        // Cancel handler
        const cancelBtn = editForm.querySelector('.edit-cancel-btn');
        cancelBtn.addEventListener('click', () => {
            this.cancelFullEdit(card, taskContent, currentHTML);
        });

        const deleteBtn = editForm.querySelector('.edit-delete-btn');
        deleteBtn.addEventListener('click', () => {
            if (confirm(t('confirmDelete'))) {
                cleanupFullEditOutside();
                TasksManager.deleteTask(task.id);
                this.editingTaskId = null;
                RenderManager.renderAll();
            }
        });
        
        // Enter key on title saves
        if (titleInput) {
            titleInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveBtn.click();
                }
            });
        }
    },
    
    // Save full edit (returns true if saved and UI closed)
    saveFullEdit(card, task, editForm) {
        const titleInput = editForm.querySelector('.edit-title-input');
        const statusSelect = editForm.querySelector('.edit-status-select');
        const prioritySelect = editForm.querySelector('.edit-priority-select');
        const dueDateInput = editForm.querySelector('.edit-due-date-input');
        const tagsInput = editForm.querySelector('.edit-tags-input');
        const daysCheckboxes = editForm.querySelectorAll('.edit-day-checkbox');
        
        const title = titleInput.value.trim();
        if (!title) {
            Utils.showToast(t('titleRequired'), 'error');
            titleInput.focus();
            return false;
        }
        
        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        const daysOfWeek = Array.from(daysCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const updates = {
            title,
            tags,
            days_of_week: task.task_type === 'daily' ? daysOfWeek : []
        };
        
        if (task.task_type === 'todo') {
            updates.priority = prioritySelect.value || null;
            updates.due_date = dueDateInput.value || null;
        }

        const dueTimeInput = editForm.querySelector('.edit-due-time-input');
        if (dueTimeInput) {
            updates.due_time = dueTimeInput.value ? Utils.normalizeDueTime(dueTimeInput.value) : null;
        }

        const durationInput = editForm.querySelector('.edit-duration-input');
        if (durationInput) {
            updates.duration_minutes = Utils.normalizeDurationMinutes(durationInput.value);
        }
        
        TasksManager.updateTask(task.id, updates);
        this.editingTaskId = null;
        if (this._fullEditOutsideCleanup) {
            this._fullEditOutsideCleanup();
        }
        RenderManager.renderAll();
        return true;
    },
    
    // Cancel full edit
    cancelFullEdit(card, taskContent, originalHTML) {
        if (this._fullEditOutsideCleanup) {
            this._fullEditOutsideCleanup();
        }
        card.classList.remove('editing-full');
        card.draggable = true;
        const editForm = card.querySelector('.task-edit-form');
        if (editForm) {
            editForm.remove();
        }
        taskContent.style.display = '';
        this.editingTaskId = null;
    },
    
    // Check if task is being edited
    isEditing(taskId) {
        return this.editingTaskId === taskId;
    },
    
    // Edit priority inline
    editPriorityInline(card, task) {
        if (task.task_type !== 'todo') return;
        
        const priorityEl = card.querySelector('.task-priority-badge');
        if (!priorityEl) return;
        
        const select = document.createElement('select');
        select.className = 'inline-priority-select';
        select.innerHTML = `
            <option value="">${t('none')}</option>
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>${t('low')}</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>${t('medium')}</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>${t('high')}</option>
        `;
        select.style.background = 'rgba(0, 0, 0, 0.3)';
        select.style.border = '1px solid var(--blue-primary)';
        select.style.borderRadius = '6px';
        select.style.padding = '2px 8px';
        select.style.color = 'var(--text-primary)';
        select.style.fontSize = '11px';
        select.style.fontWeight = '500';
        select.style.cursor = 'pointer';
        
        priorityEl.replaceWith(select);
        select.focus();
        
        const save = () => {
            const priority = select.value || null;
            TasksManager.updateTask(task.id, { priority });
            RenderManager.renderAll();
        };
        
        select.addEventListener('change', save);
        select.addEventListener('blur', () => {
            setTimeout(save, 200);
        });
    },
    
    // Edit due date inline
    editDueDateInline(card, task) {
        if (task.task_type !== 'todo') return;
        
        const dueDateEl = card.querySelector('.task-due-date');
        if (!dueDateEl) return;
        
        const input = document.createElement('input');
        input.type = 'date';
        input.className = 'inline-due-date-input';
        input.value = task.due_date || '';
        input.style.background = 'rgba(0, 0, 0, 0.3)';
        input.style.border = '1px solid var(--blue-primary)';
        input.style.borderRadius = '6px';
        input.style.padding = '2px 8px';
        input.style.color = 'var(--text-primary)';
        input.style.fontSize = '11px';
        input.style.position = 'relative';
        input.style.zIndex = '1000';
        
        // Replace element
        const parent = dueDateEl.parentElement;
        dueDateEl.replaceWith(input);
        
        // Focus and show picker - use click event for better browser support
        setTimeout(() => {
            input.focus();
            // Trigger click to open picker in better position
            input.click();
            if (input.showPicker) {
                try {
                    input.showPicker();
                } catch (e) {
                    // Fallback to click
                    input.click();
                }
            }
        }, 50);
        
        const save = () => {
            const dueDate = input.value || null;
            TasksManager.updateTask(task.id, { due_date: dueDate });
            RenderManager.renderAll();
        };
        
        input.addEventListener('change', save);
        input.addEventListener('blur', () => {
            setTimeout(save, 200);
        });
        
        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                save();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    },
    
    // Add tag inline
    addTagInline(card, task) {
        const tagsContainer = card.querySelector('.task-tags-inline, .task-tags');
        if (!tagsContainer) return;
        
        const addTagBtn = tagsContainer.querySelector('.add-tag');
        if (!addTagBtn) return;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-tag-input';
        input.placeholder = t('tags');
        input.style.minWidth = '80px';
        input.style.width = '80px';
        input.style.background = 'rgba(0, 0, 0, 0.3)';
        input.style.border = '1px solid var(--blue-primary)';
        input.style.borderRadius = '6px';
        input.style.padding = '2px 6px';
        input.style.color = 'var(--text-primary)';
        input.style.fontSize = '11px';
        input.style.marginLeft = '4px';
        
        addTagBtn.replaceWith(input);
        input.focus();
        
        const save = () => {
            const newTag = input.value.trim();
            if (newTag) {
                const currentTags = task.meta?.tags || [];
                if (!currentTags.includes(newTag)) {
                    const updatedTags = [...currentTags, newTag];
                    TasksManager.updateTask(task.id, { tags: updatedTags });
                }
            }
            RenderManager.renderAll();
        };
        
        const cancel = () => {
            RenderManager.renderAll();
        };
        
        input.addEventListener('blur', () => {
            setTimeout(save, 200);
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });
    },

    addSubtaskInline(card, task) {
        const wrap = card.querySelector('.task-subtasks-wrap');
        if (!wrap) return;
        const btn = wrap.querySelector('.task-add-subtask-btn');
        if (!btn) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-subtask-input';
        input.placeholder = t('addSubtask');
        input.setAttribute('aria-label', t('addSubtask'));

        btn.replaceWith(input);
        input.focus();

        let finished = false;
        const save = () => {
            if (finished) return;
            finished = true;
            const title = input.value.trim();
            if (title) {
                SubtasksManager.addSubtask(task.id, title);
            }
            RenderManager.renderAll();
        };

        const cancel = () => {
            if (finished) return;
            finished = true;
            RenderManager.renderAll();
        };

        input.addEventListener('blur', () => {
            setTimeout(save, 150);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });
    },
    
    // Remove tag
    removeTag(taskId, tagToRemove) {
        const task = DataManager.findTask(taskId);
        if (!task) return;
        
        const currentTags = task.meta?.tags || [];
        const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
        TasksManager.updateTask(taskId, { tags: updatedTags });
    },
    
    // Edit days of week inline for dailies (multi-select: só grava em OK ou clique fora; Esc descarta)
    editDaysOfWeekInline(card, task) {
        if (task.task_type !== 'daily') return;

        this.editingDaysOfWeekTaskId = task.id;

        const daysEl = card.querySelector('.task-days-of-week');
        if (!daysEl) {
            this.editingDaysOfWeekTaskId = null;
            return;
        }

        const currentDays = task.meta?.days_of_week || [];
        const dayLabels = {
            monday: t('monday'),
            tuesday: t('tuesday'),
            wednesday: t('wednesday'),
            thursday: t('thursday'),
            friday: t('friday'),
            saturday: t('saturday'),
            sunday: t('sunday')
        };

        const container = document.createElement('div');
        container.className = 'inline-days-container';

        const row = document.createElement('div');
        row.className = 'inline-days-row';

        const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        allDays.forEach((day) => {
            const label = document.createElement('label');
            label.className = 'inline-days-label';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = day;
            checkbox.checked = currentDays.includes(day);
            checkbox.className = 'inline-days-checkbox';

            const span = document.createElement('span');
            span.textContent = dayLabels[day];

            label.appendChild(checkbox);
            label.appendChild(span);
            row.appendChild(label);
        });

        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'inline-days-ok-btn';
        okBtn.textContent = t('daysPickerOk');

        const actions = document.createElement('div');
        actions.className = 'inline-days-actions';
        actions.appendChild(okBtn);

        container.appendChild(row);
        container.appendChild(actions);

        daysEl.replaceWith(container);

        let closed = false;

        const cleanup = () => {
            document.removeEventListener('click', outsideHandler, true);
            document.removeEventListener('keydown', escapeHandler);
        };

        const persistAndClose = () => {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            const selectedDays = Array.from(checkboxes)
                .filter((cb) => cb.checked)
                .map((cb) => cb.value);
            TasksManager.updateTask(task.id, { days_of_week: selectedDays });
            RenderManager.renderAll();
        };

        const finish = (apply) => {
            if (closed) return;
            closed = true;
            this.editingDaysOfWeekTaskId = null;
            cleanup();
            if (apply) {
                persistAndClose();
            } else {
                RenderManager.renderAll();
            }
        };

        okBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            finish(true);
        });

        const outsideHandler = (e) => {
            if (closed) return;
            if (container.contains(e.target)) return;
            finish(true);
        };

        const escapeHandler = (e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            finish(false);
        };

        setTimeout(() => {
            document.addEventListener('click', outsideHandler, true);
            document.addEventListener('keydown', escapeHandler);
        }, 100);
    }
};
