// Habitus Task Manager - Main Application
// Orchestrates all modules and initializes the application

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // O idioma pode viver em i18n/<lang>.js — arrancar so depois de carregado
    initI18n(startApp);
});

function startApp() {
    // Initialize data manager
    DataManager.init();

    applyDensity(DataManager.appData.settings.density || 'compact');
    
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

    setupWorkspace();
    setupFocusMode();
    setupHeaderMenu();
}

/**
 * Workspace: listas e calendario na mesma tela (>= 1024px), com um divisor
 * arrastavel a definir a proporcao. Substitui a alternancia entre "modos".
 */
function setupWorkspace() {
    const SPLIT_KEY = 'habitus-workspace-split';
    const MIN_PCT = 24;
    const MAX_PCT = 62;

    document.body.classList.add('workspace');

    const container = document.querySelector('.container');
    const divider = document.getElementById('workspace-divider');
    if (!container || !divider) return;

    const apply = (pct, persist = true) => {
        const clamped = Math.max(MIN_PCT, Math.min(MAX_PCT, pct));
        container.style.setProperty('--workspace-split', `${clamped}%`);
        divider.setAttribute('aria-valuenow', String(Math.round(clamped)));
        if (persist) {
            try {
                localStorage.setItem(SPLIT_KEY, String(clamped));
            } catch (e) {
                /* ignore */
            }
        }
        return clamped;
    };

    let current = 42;
    try {
        const saved = parseFloat(localStorage.getItem(SPLIT_KEY));
        if (!Number.isNaN(saved)) current = saved;
    } catch (e) {
        /* ignore */
    }
    current = apply(current, false);

    const pctFromX = (clientX) => {
        const rect = container.getBoundingClientRect();
        const raw = ((clientX - rect.left) / rect.width) * 100;
        return document.body.classList.contains('workspace-swapped') ? 100 - raw : raw;
    };

    divider.addEventListener('mousedown', (e) => {
        e.preventDefault();
        divider.classList.add('is-dragging');
        document.body.style.userSelect = 'none';

        const onMove = (ev) => {
            current = apply(pctFromX(ev.clientX));
        };
        const onUp = () => {
            divider.classList.remove('is-dragging');
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (typeof WeekCalendarManager !== 'undefined') WeekCalendarManager.render();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    // acessivel pelo teclado
    divider.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        current = apply(current + (e.key === 'ArrowLeft' ? -2 : 2));
    });

    divider.addEventListener('dblclick', () => {
        current = apply(42);
    });

    // ao arrancar, mostrar a hora atual
    requestAnimationFrame(() => requestAnimationFrame(scrollCalendarToNow));
}

/** Densidade da visao padrao: 'compact' (predefinicao) ou 'comfortable' */
function applyDensity(mode) {
    const compact = mode !== 'comfortable';
    document.body.classList.toggle('density-compact', compact);
    document.body.classList.toggle('density-comfortable', !compact);
    document.querySelectorAll('#density-choices .header-menu-choice').forEach((btn) => {
        const on = btn.dataset.density === (compact ? 'compact' : 'comfortable');
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

function setDensity(mode) {
    DataManager.appData.settings.density = mode === 'comfortable' ? 'comfortable' : 'compact';
    DataManager.saveData();
    applyDensity(DataManager.appData.settings.density);
}

/** Menu "⋯" do header: idioma, densidade, lembretes, exportar/importar */
function setupHeaderMenu() {
    const btn = document.getElementById('header-menu-btn');
    const panel = document.getElementById('header-menu-panel');
    if (!btn || !panel) return;

    const close = () => {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    };

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.hidden ? open() : close();
    });

    document.addEventListener('click', (e) => {
        if (panel.hidden) return;
        if (e.target.closest('#header-menu')) return;
        close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panel.hidden) close();
    });

    const choices = document.getElementById('density-choices');
    if (choices) {
        choices.addEventListener('click', (e) => {
            const choice = e.target.closest('.header-menu-choice');
            if (!choice) return;
            setDensity(choice.dataset.density);
        });
    }

    applyDensity(DataManager.appData.settings.density || 'compact');
}

/** Centra a grelha do calendario na hora atual */
function scrollCalendarToNow() {
    const scroller = document.getElementById('week-calendar-root');
    if (!scroller || typeof WeekCalendarManager === 'undefined') return;
    const timeline = scroller.querySelector('.week-cal-timeline');
    if (!timeline) return;
    let pct = 0;
    try {
        pct = WeekCalendarManager.nowLineTopPct();
    } catch (e) {
        return;
    }
    if (typeof pct !== 'number' || isNaN(pct)) return;
    // Posicao do "agora" relativa ao conteudo do scroller
    const scrollerTop = scroller.getBoundingClientRect().top - scroller.scrollTop;
    const tlRect = timeline.getBoundingClientRect();
    const y = tlRect.top - scrollerTop + (tlRect.height * pct) / 100;
    const headers = scroller.querySelector('.week-cal-day-headers');
    const headerH = headers ? headers.getBoundingClientRect().height : 0;
    const usable = Math.max(80, scroller.clientHeight - headerH);
    scroller.scrollTop = Math.max(0, y - headerH - usable / 2);
}

function setupFocusMode() {
    const FOCUS_STORAGE_KEY = 'habitus-focus-mode';
    const LAYOUT_STORAGE_KEY = 'habitus-workspace-side'; // 'lists-left' | 'lists-right'
    const btn = document.getElementById('focus-toggle-btn');
    const layoutBtn = document.getElementById('focus-layout-btn');

    const applyFocusLayout = (mode) => {
        const swapped = mode === 'lists-right';
        document.body.classList.toggle('workspace-swapped', swapped);
        if (layoutBtn) {
            layoutBtn.title = swapped
                ? 'Trocar lados: calendário à direita'
                : 'Trocar lados: calendário à esquerda';
            layoutBtn.setAttribute('aria-pressed', swapped ? 'true' : 'false');
        }
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, swapped ? 'lists-right' : 'lists-left');
        } catch (e) {
            /* ignore */
        }
        requestAnimationFrame(() => requestAnimationFrame(scrollCalendarToNow));
    };

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
        if (on) {
            // Depois do layout do modo foco, centrar a grelha na hora atual
            requestAnimationFrame(() => requestAnimationFrame(scrollCalendarToNow));
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

    if (layoutBtn) {
        layoutBtn.addEventListener('click', () => {
            applyFocusLayout(
                document.body.classList.contains('workspace-swapped') ? 'lists-left' : 'lists-right'
            );
        });
    }

    let storedLayout = 'lists-left';
    try {
        if (localStorage.getItem(LAYOUT_STORAGE_KEY) === 'lists-right') {
            storedLayout = 'lists-right';
        }
    } catch (e) {
        /* ignore */
    }
    applyFocusLayout(storedLayout);

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
    
    // Delete completed buttons — sem dialogo bloqueante: apaga e oferece Desfazer
    document.getElementById('delete-tasks-completed').addEventListener('click', () => {
        deleteCompletedWithUndo('todo');
    });

    document.getElementById('delete-dailies-completed').addEventListener('click', () => {
        deleteCompletedWithUndo('daily');
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

/** Apaga as concluidas de um tipo e oferece Desfazer (restaura os objetos originais) */
function deleteCompletedWithUndo(taskType) {
    const removed = DataManager.appData.tasks.filter(
        (x) => x.task_type === taskType && x.status === 'done' && !x.is_deleted
    );
    if (removed.length === 0) return;

    TasksManager.deleteCompletedTasks(taskType);
    RenderManager.renderAll();

    Utils.showActionToast({
        message: `${t('completedDeleted')} (${removed.length})`,
        actionLabel: t('undo'),
        timeoutMs: 6000,
        tone: 'error',
        onAction: () => {
            removed.forEach((x) => DataManager.appData.tasks.push(x));
            DataManager.saveData();
            RenderManager.renderAll();
        }
    });
}

// Toggle completed section — o estado vive no RenderManager (fechada = sem DOM)
function toggleCompletedSection(taskType) {
    const key = taskType === 'todo' ? 'todoCompleted' : 'dailyCompleted';
    RenderManager.sectionOpen[key] = !RenderManager.sectionOpen[key];
    RenderManager.renderAll();
}

// Toggle scheduled section
function toggleScheduledSection() {
    RenderManager.sectionOpen.dailyScheduled = !RenderManager.sectionOpen.dailyScheduled;
    RenderManager.renderAll();
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
    
    // Os rotulos de "mostrar concluidas/agendadas" (com contagem) vem do renderAll
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
