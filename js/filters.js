// Filters Management Module
// Handles tag filtering system

const FiltersManager = {
    activeFilters: {
        todos: new Set(),
        dailies: new Set()
    },
    
    // Toggle filter
    toggleFilter(taskType, tag) {
        const filters = this.activeFilters[taskType === 'todo' ? 'todos' : 'dailies'];
        if (filters.has(tag)) {
            filters.delete(tag);
        } else {
            filters.add(tag);
        }
    },
    
    // Clear filters
    clearFilters(taskType) {
        if (taskType === 'todo') {
            this.activeFilters.todos.clear();
        } else {
            this.activeFilters.dailies.clear();
        }
    },
    
    // Get filtered tasks
    getFilteredTasks(taskType) {
        let tasks = DataManager.getTasksByType(taskType);
        
        const filters = this.activeFilters[taskType === 'todo' ? 'todos' : 'dailies'];
        if (filters.size > 0) {
            tasks = tasks.filter(task => {
                const taskTags = task.meta?.tags || [];
                return Array.from(filters).some(filterTag => taskTags.includes(filterTag));
            });
        }
        
        return tasks;
    },
    
    // Get all unique tags for a task type
    getAllTags(taskType) {
        const tasks = DataManager.getTasksByType(taskType);
        const allTags = new Set();
        tasks.forEach(task => {
            (task.meta?.tags || []).forEach(tag => allTags.add(tag));
        });
        return Array.from(allTags).sort();
    },
    
    // Check if tag is active
    isTagActive(taskType, tag) {
        const filters = this.activeFilters[taskType === 'todo' ? 'todos' : 'dailies'];
        return filters.has(tag);
    }
};
