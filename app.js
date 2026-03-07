// Habitus Task Manager - Main Application
// Orchestrates all modules and initializes the application

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n first
    initI18n();
    
    // Initialize data manager
    DataManager.init();
    
    // Check daily resets
    TasksManager.checkDailyResets();
    
    // Setup all event listeners
    setupEventListeners();
    
    // Initial render
    RenderManager.renderAll();
});

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
    
    // Language selector
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
        languageSelector.addEventListener('change', (e) => {
            saveLanguage(e.target.value);
            updateUI();
            RenderManager.renderAll();
        });
    }
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
    
    RenderManager.renderAll();
};
