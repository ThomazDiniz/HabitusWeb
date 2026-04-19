// Tasks Management Module
// Handles CRUD operations for tasks and dailies

const TasksManager = {
    // Create a new task object
    createTask(taskType = 'todo', data = {}) {
        const now = new Date().toISOString();
        // Default days of week for dailies: all days if not specified
        const defaultDaysOfWeek = taskType === 'daily' && (!data.days_of_week || data.days_of_week.length === 0)
            ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            : (data.days_of_week || []);
        
        const task = {
            id: DataManager.generateId(),
            title: data.title || '',
            status: data.status || 'pending',
            task_type: taskType,
            due_date: data.due_date || null,
            due_time: typeof Utils !== 'undefined'
                ? Utils.normalizeDueTime(data.due_time)
                : (data.due_time || null),
            priority: data.priority || null,
            completed_at: null,
            last_completed_date: null,
            streak_count: 0,
            max_streak: 0,
            order_index: DataManager.appData.tasks.length,
            meta: {
                tags: data.tags || [],
                days_of_week: defaultDaysOfWeek,
                pasted_images: Array.isArray(data.meta?.pasted_images) ? data.meta.pasted_images : [],
                duration_minutes:
                    typeof Utils !== 'undefined'
                        ? Utils.normalizeDurationMinutes(
                              data.duration_minutes !== undefined
                                  ? data.duration_minutes
                                  : data.meta?.duration_minutes
                          )
                        : 30
            },
            is_deleted: false,
            created_at: now,
            updated_at: now,
            subtasks: []
        };
        return task;
    },
    
    // Add a new task
    addTask(taskType, taskData) {
        if (taskType === 'todo' && DataManager.getActiveTasksCount('todo') >= DataManager.MAX_TASKS) {
            Utils.showToast(t('taskLimitReached'), 'error');
            return null;
        }
        if (taskType === 'daily' && DataManager.getActiveTasksCount('daily') >= DataManager.MAX_DAILIES) {
            Utils.showToast(t('dailyLimitReached'), 'error');
            return null;
        }
        
        const task = this.createTask(taskType, taskData);
        // Set high order_index so new tasks appear at top
        const maxOrder = DataManager.appData.tasks.length > 0 
            ? Math.max(...DataManager.appData.tasks.map(t => t.order_index || 0))
            : 0;
        task.order_index = maxOrder + 1;
        return DataManager.addTask(task);
    },
    
    // Update task (merges meta; does not wipe tags/days/pasted_images em atualizações parciais)
    updateTask(id, updates) {
        const task = DataManager.findTask(id);
        if (!task) return null;
        const prevMeta = task.meta || { tags: [], days_of_week: [] };
        const tags = updates.tags !== undefined ? updates.tags : prevMeta.tags;
        const days_of_week = updates.days_of_week !== undefined ? updates.days_of_week : prevMeta.days_of_week;
        const duration_minutes =
            updates.duration_minutes !== undefined
                ? Utils.normalizeDurationMinutes(updates.duration_minutes)
                : Utils.normalizeDurationMinutes(prevMeta.duration_minutes);
        const pasted_images =
            updates.pasted_images !== undefined
                ? updates.pasted_images
                : Array.isArray(prevMeta.pasted_images)
                  ? prevMeta.pasted_images
                  : [];
        const { tags: _tg, days_of_week: _dw, due_time: dueTimeRaw, duration_minutes: _dm, pasted_images: _pi, ...rest } =
            updates;
        const taskData = {
            ...rest,
            meta: { ...prevMeta, tags, days_of_week, duration_minutes, pasted_images }
        };
        if ('due_time' in updates) {
            taskData.due_time =
                dueTimeRaw === '' || dueTimeRaw == null
                    ? null
                    : typeof Utils !== 'undefined'
                      ? Utils.normalizeDueTime(dueTimeRaw)
                      : dueTimeRaw;
        }
        return DataManager.updateTask(id, taskData);
    },
    
    // Delete task
    deleteTask(id) {
        return DataManager.deleteTask(id);
    },
    
    // Toggle task status
    toggleTaskStatus(id) {
        const task = DataManager.findTask(id);
        if (task) {
            if (task.status === 'done') {
                task.status = 'pending';
                task.completed_at = null;
                if (task.task_type === 'daily') {
                    task.last_completed_date = null;
                }
            } else {
                task.status = 'done';
                task.completed_at = new Date().toISOString();
                if (task.task_type === 'daily') {
                    const today = Utils.getTodayDate();
                    const prev = task.last_completed_date;
                    if (!Utils.isToday(prev)) {
                        const prevSlot = this.getPreviousScheduledYmdBefore(task, today);
                        if (prev && prevSlot && prev === prevSlot) {
                            task.streak_count = (task.streak_count || 0) + 1;
                        } else {
                            task.streak_count = 1;
                        }
                        if (task.streak_count > (task.max_streak || 0)) {
                            task.max_streak = task.streak_count;
                        }
                    }
                    task.last_completed_date = today;
                }
            }
            task.updated_at = new Date().toISOString();
            DataManager.saveData();
            return task;
        }
        return null;
    },
    
    // Check if daily is scheduled for today
    isDailyScheduledForToday(task) {
        if (task.task_type !== 'daily') return true;
        const daysOfWeek = task.meta?.days_of_week || [];
        if (daysOfWeek.length === 0) return true;
        const today = Utils.getDayOfWeek();
        return daysOfWeek.includes(today);
    },

    /** All-week dailies: empty days_of_week or explicit all 7 weekdays */
    isDailyEveryDayOfWeek(task) {
        if (task.task_type !== 'daily') return false;
        const days = task.meta?.days_of_week || [];
        if (days.length === 0) return true;
        if (days.length < 7) return false;
        const all = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const set = new Set(days);
        return all.every((d) => set.has(d));
    },

    /** Daily appears on this calendar day (YYYY-MM-DD)? */
    isDailyScheduledOnDate(task, ymd) {
        if (task.task_type !== 'daily') return false;
        if (this.isDailyEveryDayOfWeek(task)) {
            return ymd === Utils.getTodayDate();
        }
        const daysOfWeek = task.meta?.days_of_week || [];
        const dow = Utils.ymdToDayOfWeek(ymd);
        return daysOfWeek.includes(dow);
    },

    /** Se o hábito entra na agenda neste dia civil (para sequência / lógica). */
    isScheduledCalendarDay(task, ymd) {
        if (task.task_type !== 'daily' || !ymd) return false;
        const days = task.meta?.days_of_week || [];
        if (days.length === 0) return true;
        const dow = Utils.ymdToDayOfWeek(ymd);
        return days.includes(dow);
    },

    /** Último dia civil anterior a `todayYmd` em que o hábito estava agendado. */
    getPreviousScheduledYmdBefore(task, todayYmd) {
        for (let i = 1; i <= 400; i++) {
            const d = Utils.ymdAddDays(todayYmd, -i);
            if (this.isScheduledCalendarDay(task, d)) return d;
        }
        return null;
    },
    
    // Check and reset dailies
    checkDailyResets() {
        const today = Utils.getTodayDate();
        const lastCheck = localStorage.getItem('habitus_last_daily_check');
        
        if (lastCheck !== today) {
            DataManager.appData.tasks.forEach(task => {
                if (task.task_type === 'daily' && task.status === 'done') {
                    if (task.last_completed_date && !Utils.isToday(task.last_completed_date)) {
                        task.status = 'pending';
                        task.completed_at = null;
                        task.updated_at = new Date().toISOString();
                    }
                }
            });
            localStorage.setItem('habitus_last_daily_check', today);
            DataManager.saveData();
        }
    },
    
    /** Bucket da lista onde o card da diária aparece (igual a `renderDailies`). */
    dailyListBucket(task) {
        if (task.task_type !== 'daily') return null;
        const isCompletedToday =
            task.status === 'done' && Utils.isToday(task.last_completed_date);
        if (isCompletedToday) return 'completed';
        const scheduledToday = this.isDailyScheduledForToday(task);
        const editing =
            typeof InlineEditManager !== 'undefined' &&
            InlineEditManager.editingDaysOfWeekTaskId === task.id;
        if (!scheduledToday && !editing) return 'scheduled';
        return 'active';
    },

    /** Tarefas do mesmo tipo, mesmo filtro de tags e mesma sublista (ativa / concluídas / agendadas). */
    getOrderedPeersForList(task) {
        const filtered = FiltersManager.getFilteredTasks(task.task_type);
        if (task.task_type === 'todo') {
            const done = task.status === 'done';
            return filtered.filter((t) => (t.status === 'done') === done);
        }
        const b = this.dailyListBucket(task);
        return filtered.filter((t) => this.dailyListBucket(t) === b);
    },

    /** Ordenação: maior `order_index` primeiro (topo). */
    moveTaskToTop(id) {
        const task = DataManager.findTask(id);
        if (!task || task.is_deleted) return;
        const peers = this.getOrderedPeersForList(task);
        if (peers.length === 0) return;
        const maxOrder = Math.max(...peers.map((t) => t.order_index || 0));
        this.updateTask(id, { order_index: maxOrder + 1 });
    },

    moveTaskToBottom(id) {
        const task = DataManager.findTask(id);
        if (!task || task.is_deleted) return;
        const peers = this.getOrderedPeersForList(task);
        if (peers.length === 0) return;
        const minOrder = Math.min(...peers.map((t) => t.order_index || 0));
        this.updateTask(id, { order_index: minOrder - 1 });
    },

    // Delete completed tasks
    deleteCompletedTasks(taskType) {
        const completed = DataManager.appData.tasks.filter(t => 
            t.task_type === taskType && 
            t.status === 'done' && 
            !t.is_deleted
        );
        
        completed.forEach(task => {
            DataManager.deleteTask(task.id);
        });
        
        return completed.length;
    }
};
