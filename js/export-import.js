// Export/Import Module
// Handles JSON export and import functionality

const ExportImportManager = {
    // Export tasks to JSON
    exportTasks() {
        const activeTasks = DataManager.appData.tasks.filter(t => !t.is_deleted);
        const exportData = {
            summary: {
                total_tasks: activeTasks.length,
                todos: activeTasks.filter(t => t.task_type === 'todo').length,
                dailies: activeTasks.filter(t => t.task_type === 'daily').length,
                export_date: new Date().toISOString()
            },
            tasks: activeTasks
        };
        
        const json = JSON.stringify(exportData, null, 2);
        
        navigator.clipboard.writeText(json).then(() => {
            Utils.showToast(t('exportSuccess'), 'success');
        }).catch(() => {
            // Fallback: create download
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `habitus-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            Utils.showToast(t('exportSuccess'), 'success');
        });
    },
    
    // Import tasks from JSON
    importTasks() {
        document.getElementById('import-file').click();
    },
    
    // Handle file import
    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                
                if (imported.tasks && Array.isArray(imported.tasks)) {
                    // Merge with existing tasks, avoiding duplicates
                    imported.tasks.forEach(task => {
                        const exists = DataManager.appData.tasks.find(t => t.id === task.id);
                        if (!exists) {
                            DataManager.appData.tasks.push(task);
                        }
                    });
                    
                    DataManager.saveData();
                    
                    // Trigger re-render
                    if (typeof RenderManager !== 'undefined') {
                        RenderManager.renderAll();
                    }
                    
                    Utils.showToast(t('importSuccess'), 'success');
                } else {
                    Utils.showToast(t('importError'), 'error');
                }
            } catch (e) {
                Utils.showToast(t('importError'), 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    },
    
    // Setup event listeners
    setupEventListeners() {
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTasks());
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importTasks());
        }
        
        if (importFile) {
            importFile.addEventListener('change', (e) => this.handleFileImport(e));
        }
    }
};
