// Subtasks Management Module
// Handles CRUD operations for subtasks

const SubtasksManager = {
    // Add subtask to a task
    addSubtask(taskId, title) {
        const task = DataManager.findTask(taskId);
        if (task) {
            const subtask = {
                id: DataManager.generateId(),
                task_id: taskId,
                title: title,
                status: 'pending',
                order_index: task.subtasks.length,
                completed_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            task.subtasks.push(subtask);
            task.updated_at = new Date().toISOString();
            DataManager.saveData();
            return subtask;
        }
        return null;
    },
    
    // Update subtask
    updateSubtask(taskId, subtaskId, updates) {
        const task = DataManager.findTask(taskId);
        if (task) {
            const subtask = task.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                Object.assign(subtask, updates, {
                    updated_at: new Date().toISOString()
                });
                task.updated_at = new Date().toISOString();
                DataManager.saveData();
                return subtask;
            }
        }
        return null;
    },
    
    // Delete subtask
    deleteSubtask(taskId, subtaskId) {
        const task = DataManager.findTask(taskId);
        if (task) {
            const index = task.subtasks.findIndex(s => s.id === subtaskId);
            if (index !== -1) {
                task.subtasks.splice(index, 1);
                task.updated_at = new Date().toISOString();
                DataManager.saveData();
                return true;
            }
        }
        return false;
    },
    
    // Toggle subtask status
    toggleSubtaskStatus(taskId, subtaskId) {
        const task = DataManager.findTask(taskId);
        if (task) {
            const subtask = task.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.status = subtask.status === 'done' ? 'pending' : 'done';
                subtask.completed_at = subtask.status === 'done' ? new Date().toISOString() : null;
                subtask.updated_at = new Date().toISOString();
                task.updated_at = new Date().toISOString();
                DataManager.saveData();
                return subtask;
            }
        }
        return null;
    },
    
    // Get subtasks progress
    getSubtasksProgress(task) {
        const completed = task.subtasks.filter(s => s.status === 'done').length;
        const total = task.subtasks.length;
        return { completed, total };
    }
};
