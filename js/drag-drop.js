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
