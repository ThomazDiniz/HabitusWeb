// Filters Management Module
// Handles tag filtering system

const FiltersManager = {
    activeFilters: {
        todos: new Set(),
        dailies: new Set()
    },

    /** Texto da pesquisa global (título e tags); vazio = sem filtro extra */
    globalSearchQuery: '',

    setGlobalSearchQuery(q) {
        this.globalSearchQuery = (q || '').trim();
    },

    getGlobalSearchNormalized() {
        return String(this.globalSearchQuery || '').toLowerCase();
    },

    /** Inclui tarefa na pesquisa global (título ou qualquer tag contém o texto) */
    matchesGlobalSearch(task) {
        const q = this.getGlobalSearchNormalized();
        if (!q) return true;
        const title = (task.title || '').toLowerCase();
        if (title.includes(q)) return true;
        const tags = task.meta?.tags || [];
        for (let i = 0; i < tags.length; i++) {
            if (String(tags[i]).toLowerCase().includes(q)) return true;
        }
        return false;
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

        tasks = tasks.filter((task) => this.matchesGlobalSearch(task));

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
