// Habitus Task Manager - Main Application
// Orchestrates all modules and initializes the application

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n first
    initI18n();
    
    // Initialize data manager
    DataManager.init();
    
    if (typeof WeekCalendarManager !== 'undefined') {
        try {
            WeekCalendarManager.init();
        } catch (err) {
            console.error('WeekCalendarManager.init failed:', err);
        }
    }

    if (typeof MobileViewsManager !== 'undefined') {
        try {
            MobileViewsManager.init();
        } catch (err) {
            console.error('MobileViewsManager.init failed:', err);
        }
    }
    
    // Check daily resets
    TasksManager.checkDailyResets();
    
    // Setup all event listeners
    setupEventListeners();
    
    // Initial render
    RenderManager.renderAll();

    if (typeof RemindersManager !== 'undefined') {
        RemindersManager.init();
    }
    if (typeof RenderManager !== 'undefined' && RenderManager.setupGlobalImagePaste) {
        RenderManager.setupGlobalImagePaste();
    }

    setupFocusMode();
});

// Focus mode: compact view showing only the task lists
function setupFocusMode() {
    const FOCUS_STORAGE_KEY = 'habitus-focus-mode';
    const btn = document.getElementById('focus-toggle-btn');

    const applyFocusMode = (on) => {
        document.body.classList.toggle('focus-mode', on);
        if (btn) {
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.title = on ? 'Sair do modo foco' : 'Modo foco';
        }
        try {
            localStorage.setItem(FOCUS_STORAGE_KEY, on ? '1' : '0');
        } catch (e) {
            /* ignore */
        }
    };

    if (btn) {
        btn.addEventListener('click', () => {
            applyFocusMode(!document.body.classList.contains('focus-mode'));
        });
    }

    // Atalho de teclado: "F" alterna o modo foco (fora de campos de texto)
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'f' && e.key !== 'F') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const el = e.target;
        if (
            el &&
            (el.tagName === 'INPUT' ||
                el.tagName === 'TEXTAREA' ||
                el.tagName === 'SELECT' ||
                el.isContentEditable)
        ) {
            return;
        }
        e.preventDefault();
        applyFocusMode(!document.body.classList.contains('focus-mode'));
    });

    try {
        if (localStorage.getItem(FOCUS_STORAGE_KEY) === '1') {
            applyFocusMode(true);
        }
    } catch (e) {
        /* ignore */
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Add task/daily - create with title from input (Enter or click +)
    const addTaskInput = document.getElementById('add-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const addDailyInput = document.getElementById('add-daily-input');
    const addDailyBtn = document.getElementById('add-daily-btn');
    
    const handleAddTask = () => {
        const title = addTaskInput.value.trim();
        InlineEditManager.createTaskDirectly('todo', title);
        addTaskInput.value = '';
    };
    
    const handleAddDaily = () => {
        const title = addDailyInput.value.trim();
        InlineEditManager.createTaskDirectly('daily', title);
        addDailyInput.value = '';
    };
    
    addTaskBtn.addEventListener('click', handleAddTask);
    addTaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTask();
        }
    });
    
    addDailyBtn.addEventListener('click', handleAddDaily);
    addDailyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddDaily();
        }
    });
    
    // Delete completed buttons
    document.getElementById('delete-tasks-completed').addEventListener('click', () => {
        if (confirm(t('confirmDeleteCompleted'))) {
            TasksManager.deleteCompletedTasks('todo');
            RenderManager.renderAll();
        }
    });
    
    document.getElementById('delete-dailies-completed').addEventListener('click', () => {
        if (confirm(t('confirmDeleteCompleted'))) {
            TasksManager.deleteCompletedTasks('daily');
            RenderManager.renderAll();
        }
    });
    
    // Toggle completed sections
    document.getElementById('toggle-tasks-completed').addEventListener('click', () => {
        toggleCompletedSection('todo');
    });
    
    document.getElementById('toggle-dailies-completed').addEventListener('click', () => {
        toggleCompletedSection('daily');
    });
    
    document.getElementById('toggle-dailies-scheduled').addEventListener('click', () => {
        toggleScheduledSection();
    });
    
    // Setup module event listeners
    ModalManager.setupEventListeners();
    PomodoroManager.setupEventListeners();
    ExportImportManager.setupEventListeners();
    KeyboardNavManager.init();
    setupViewToggle();

    if (typeof RemindersManager !== 'undefined') {
        RemindersManager.setupToggleButton();
    }

    const globalSearchInput = document.getElementById('global-search-input');
    let globalSearchDebounce = null;
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', () => {
            clearTimeout(globalSearchDebounce);
            globalSearchDebounce = setTimeout(() => {
                FiltersManager.setGlobalSearchQuery(globalSearchInput.value);
                RenderManager.renderAll();
            }, 200);
        });
    }
}

/** Next header toggle scroll target: true → week calendar, false → lists */
let viewToggleNextToCalendar = true;

function updateViewToggleButton() {
    const btn = document.getElementById('view-toggle-btn');
    if (!btn) return;
    if (viewToggleNextToCalendar) {
        btn.textContent = t('viewToggleWeek');
        const hint = t('viewToggleWeekTitle');
        btn.title = hint;
        btn.setAttribute('aria-label', hint);
    } else {
        btn.textContent = t('viewToggleLists');
        const hint = t('viewToggleListsTitle');
        btn.title = hint;
        btn.setAttribute('aria-label', hint);
    }
}

function setupViewToggle() {
    const btn = document.getElementById('view-toggle-btn');
    const listsEl = document.getElementById('main-lists-view');
    const calEl = document.getElementById('week-calendar-section');
    if (!btn || !listsEl || !calEl) return;
    updateViewToggleButton();
    btn.addEventListener('click', () => {
        if (viewToggleNextToCalendar) {
            calEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            listsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        viewToggleNextToCalendar = !viewToggleNextToCalendar;
        updateViewToggleButton();
    });
}

// Toggle completed section
function toggleCompletedSection(taskType) {
    const section = document.getElementById(`${taskType === 'todo' ? 'tasks' : 'dailies'}-completed-section`);
    const list = section.querySelector('.completed-list');
    const toggleBtn = section.querySelector('.toggle-completed-btn span');
    const deleteBtn = section.querySelector('.delete-completed-btn');
    const isVisible = list.style.display !== 'none';
    
    list.style.display = isVisible ? 'none' : 'block';
    toggleBtn.textContent = isVisible ? t('showCompleted') : t('hideCompleted');
    if (deleteBtn) {
        deleteBtn.textContent = t('deleteCompleted');
    }
}

// Toggle scheduled section
function toggleScheduledSection() {
    const section = document.getElementById('dailies-scheduled-section');
    const list = section.querySelector('.scheduled-list');
    const toggleBtn = section.querySelector('.toggle-scheduled-btn span');
    const isVisible = list.style.display !== 'none';
    
    list.style.display = isVisible ? 'none' : 'block';
    toggleBtn.textContent = isVisible ? t('showScheduled') : t('hideScheduled');
}

// Update UI when language changes
const originalUpdateUI = updateUI;
window.updateUI = function() {
    originalUpdateUI();
    // Update button titles
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    if (exportBtn) exportBtn.title = t('export');
    if (importBtn) importBtn.title = t('import');

    if (typeof RemindersManager !== 'undefined') {
        RemindersManager.syncToggleButton();
    }
    
    // Update completed section buttons
    const toggleTasksText = document.getElementById('toggle-tasks-text');
    const toggleDailiesText = document.getElementById('toggle-dailies-text');
    const toggleDailiesScheduledText = document.getElementById('toggle-dailies-scheduled-text');
    if (toggleTasksText) toggleTasksText.textContent = t('showCompleted');
    if (toggleDailiesText) toggleDailiesText.textContent = t('showCompleted');
    if (toggleDailiesScheduledText) toggleDailiesScheduledText.textContent = t('showScheduled');
    
    const deleteTasksCompleted = document.getElementById('delete-tasks-completed');
    const deleteDailiesCompleted = document.getElementById('delete-dailies-completed');
    if (deleteTasksCompleted) deleteTasksCompleted.textContent = t('deleteCompleted');
    if (deleteDailiesCompleted) deleteDailiesCompleted.textContent = t('deleteCompleted');
    
    updateViewToggleButton();
    if (typeof MobileViewsManager !== 'undefined') {
        MobileViewsManager.updateTabLabels();
    }
    RenderManager.renderAll();
};
