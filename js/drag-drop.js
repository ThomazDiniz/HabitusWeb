// Drag and Drop Module
// Handles drag and drop functionality for reordering tasks

const DragDropManager = {
    draggedElement: null,
    draggedTaskId: null,
    
    // Setup drag and drop for a container
    /**
     * Liga o drag and drop por DELEGACAO, uma unica vez por container: antes eram
     * 6 listeners por cartao, recriados a cada render.
     */
    setup(containerId) {
        const container = document.getElementById(containerId);
        if (!container || container.dataset.dndBound === '1') return;
        container.dataset.dndBound = '1';

        // Largar na lista um item vindo do CALENDARIO = desagendar
        container.addEventListener('dragover', (e) => {
            if (!this.isCalendarDrag(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('unschedule-hover');
        });
        container.addEventListener('dragleave', (e) => {
            if (!container.contains(e.relatedTarget)) container.classList.remove('unschedule-hover');
        });
        container.addEventListener('drop', (e) => {
            container.classList.remove('unschedule-hover');
            if (!this.isCalendarDrag(e)) return;
            e.preventDefault();
            e.stopPropagation();
            const id = e.dataTransfer.getData('application/x-habitus-task-id');
            if (id) this.unschedule(id);
        });

        ['dragstart', 'dragend', 'dragover', 'drop', 'dragenter', 'dragleave'].forEach((type) => {
            container.addEventListener(type, (e) => {
                const card = e.target.closest('.task-card');
                if (!card || !container.contains(card)) return;
                const handler = {
                    dragstart: this.handleDragStart,
                    dragend: this.handleDragEnd,
                    dragover: this.handleDragOver,
                    drop: this.handleDrop,
                    dragenter: this.handleDragEnter,
                    dragleave: this.handleDragLeave
                }[type];
                handler.call(this, e, card);
            });
        });
    },
    
    /** O arrasto vem do calendario? (so de la e enviado o dia de origem) */
    isCalendarDrag(e) {
        const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
        return (
            types.includes('application/x-habitus-source-ymd') &&
            types.includes('application/x-habitus-task-id')
        );
    },

    /** Tira a tarefa do calendario: atividade perde data e hora; habito perde a hora */
    unschedule(taskId) {
        const task = DataManager.findTask(taskId);
        if (!task) return;

        const before =
            task.task_type === 'todo'
                ? { due_date: task.due_date, due_time: task.due_time }
                : { due_time: task.due_time };

        TasksManager.updateTask(
            task.id,
            task.task_type === 'todo' ? { due_date: null, due_time: null } : { due_time: null }
        );
        RenderManager.renderAll();

        Utils.showActionToast({
            message: `${t('unscheduled')}: ${task.title || ''}`.trim(),
            actionLabel: t('undo'),
            timeoutMs: 5000,
            onAction: () => {
                TasksManager.updateTask(task.id, before);
                RenderManager.renderAll();
            }
        });
    },

    handleDragStart(e, card) {
        this.draggedElement = card;
        this.draggedTaskId = card.dataset.taskId;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', card.innerHTML);
        e.dataTransfer.setData('application/x-habitus-task-id', String(this.draggedTaskId));
        if (typeof WeekCalendarManager !== 'undefined') {
            WeekCalendarManager._calendarDragTaskId = String(this.draggedTaskId);
        }
    },
    
    handleDragEnd(e, card) {
        card.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (typeof WeekCalendarManager !== 'undefined') {
            WeekCalendarManager._calendarDragTaskId = null;
            if (typeof WeekCalendarManager.clearAllTimelineDropPreviews === 'function') {
                WeekCalendarManager.clearAllTimelineDropPreviews();
            }
        }
    },
    
    handleDragOver(e, card) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    },
    
    handleDragEnter(e, card) {
        if (card !== this.draggedElement) {
            card.classList.add('drag-over');
        }
    },
    
    handleDragLeave(e, card) {
        card.classList.remove('drag-over');
    },
    
    handleDrop(e, card) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        if (this.draggedElement !== card) {
            const taskId = card.dataset.taskId;
            const draggedTask = DataManager.findTask(this.draggedTaskId);
            const targetTask = DataManager.findTask(taskId);
            
            if (draggedTask && targetTask && draggedTask.task_type === targetTask.task_type) {
                const draggedIndex = draggedTask.order_index;
                const targetIndex = targetTask.order_index;
                
                draggedTask.order_index = targetIndex;
                targetTask.order_index = draggedIndex;
                
                draggedTask.updated_at = new Date().toISOString();
                targetTask.updated_at = new Date().toISOString();
                
                DataManager.saveData();
                
                // Trigger re-render
                if (typeof RenderManager !== 'undefined') {
                    RenderManager.renderAll();
                }
            }
        }
        
        card.classList.remove('drag-over');
        return false;
    }
};
