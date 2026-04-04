// Data Management Module
// Handles localStorage persistence and data structure

const DataManager = {
    STORAGE_KEY: 'habitus_data',
    MAX_TASKS: 200,
    MAX_DAILIES: 20,
    
    appData: {
        tasks: [],
        settings: {
            language: 'pt_BR'
        }
    },
    
    // Initialize data structure
    init() {
        this.loadData();
    },
    
    // Save data to localStorage
    saveData() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.appData));
        } catch (e) {
            if (typeof Utils !== 'undefined') {
                Utils.showToast(t('importError'), 'error');
            }
        }
    },
    
    // Load data from localStorage
    loadData() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const rawTasks = parsed.tasks;
                const taskList = Array.isArray(rawTasks) ? rawTasks : [];
                this.appData = {
                    ...this.appData,
                    ...parsed,
                    tasks: taskList
                };
                // Migrate old data structure if needed
                this.appData.tasks = this.appData.tasks.map(task => ({
                    ...task,
                    due_time: task.due_time != null ? task.due_time : null,
                    meta: task.meta || { tags: [], days_of_week: [] },
                    subtasks: task.subtasks || []
                }));
            }
            if (!Array.isArray(this.appData.tasks)) {
                this.appData.tasks = [];
            }
        } catch (e) {
            console.error('Error loading data:', e);
            this.appData.tasks = [];
        }
    },
    
    // Generate unique ID
    generateId() {
        return Date.now() + Math.random();
    },
    
    // Get all tasks
    getAllTasks() {
        return this.appData.tasks;
    },
    
    // Get tasks by type
    getTasksByType(taskType) {
        const list = this.appData.tasks;
        if (!Array.isArray(list)) return [];
        return list.filter(t => t.task_type === taskType && !t.is_deleted);
    },
    
    // Get active tasks count
    getActiveTasksCount(taskType) {
        const list = this.appData.tasks;
        if (!Array.isArray(list)) return 0;
        return list.filter(t => 
            t.task_type === taskType && 
            !t.is_deleted && 
            t.status !== 'done'
        ).length;
    },
    
    // Find task by ID
    findTask(id) {
        return this.appData.tasks.find(t => t.id === id);
    },
    
    // Add task
    addTask(task) {
        this.appData.tasks.push(task);
        this.saveData();
        return task;
    },
    
    // Update task
    updateTask(id, updates) {
        const task = this.findTask(id);
        if (task) {
            Object.assign(task, updates, {
                updated_at: new Date().toISOString()
            });
            this.saveData();
            return task;
        }
        return null;
    },
    
    // Delete task
    deleteTask(id) {
        const index = this.appData.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.appData.tasks.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }
};
