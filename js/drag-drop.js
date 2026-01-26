// Drag and Drop Module
// Handles drag and drop functionality for reordering tasks

const DragDropManager = {
    draggedElement: null,
    draggedTaskId: null,
    
    // Setup drag and drop for a container
    setup(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('dragover', this.handleDragOver.bind(this));
            card.addEventListener('drop', this.handleDrop.bind(this));
            card.addEventListener('dragenter', this.handleDragEnter.bind(this));
            card.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    },
    
    handleDragStart(e) {
        this.draggedElement = e.currentTarget;
        this.draggedTaskId = parseFloat(e.currentTarget.dataset.taskId);
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    },
    
    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    },
    
    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    },
    
    handleDragEnter(e) {
        if (e.currentTarget !== this.draggedElement) {
            e.currentTarget.classList.add('drag-over');
        }
    },
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    },
    
    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        if (this.draggedElement !== e.currentTarget) {
            const taskId = parseFloat(e.currentTarget.dataset.taskId);
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
        
        e.currentTarget.classList.remove('drag-over');
        return false;
    }
};
