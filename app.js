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
    setupWorkspaceSide();
    setupHeaderMenu();
    setupShortcuts();
    setupHints();
}

/**
 * Botoes "?" : a diferenca entre habitos e atividades (ao lado de cada titulo) e a
 * ajuda da escrita rapida (dentro do menu ⋯). Simples toggle de um bloco.
 */
function setupHints() {
    const pairs = [
        ['dailies-hint-btn', 'dailies-hint'],
        ['tasks-hint-btn', 'tasks-hint'],
        ['help-quickadd-btn', 'help-quickadd']
    ];

    const closeAll = (except) => {
        pairs.forEach(([btnId, boxId]) => {
            if (boxId === except) return;
            const box = document.getElementById(boxId);
            const btn = document.getElementById(btnId);
            if (box) box.hidden = true;
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    };

    pairs.forEach(([btnId, boxId]) => {
        const btn = document.getElementById(btnId);
        const box = document.getElementById(boxId);
        if (!btn || !box) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = box.hidden;
            closeAll(open ? boxId : null);
            box.hidden = !open;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    });

    document.addEventListener('click', (e) => {
        if (!document.contains(e.target)) return;
        if (e.target.closest('.hint-popover, .hint-btn, .help-block, .help-toggle')) return;
        closeAll(null);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAll(null);
    });
}

/**
 * Atalhos globais:
 *   /        pesquisar
 *   N        nova atividade      H  novo hábito
 *   Ctrl+Z   desfazer a última ação (a mesma do aviso com "Desfazer")
 *   Esc      limpar a pesquisa
 */
function setupShortcuts() {
    const isTypingIn = (el) =>
        !!el &&
        (el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'SELECT' ||
            el.isContentEditable);

    const modalOpen = () =>
        [...document.querySelectorAll('.modal-overlay')].some((m) => m.style.display === 'flex');

    document.addEventListener('keydown', (e) => {
        const el = e.target;

        // Esc no campo de pesquisa limpa e devolve o foco à lista
        if (e.key === 'Escape' && el && el.id === 'global-search-input') {
            if (el.value) {
                e.preventDefault();
                el.value = '';
                FiltersManager.setGlobalSearchQuery('');
                RenderManager.renderAll();
            }
            el.blur();
            return;
        }

        // Ctrl/Cmd+Z desfaz a última ação (concluir, apagar…)
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
            if (isTypingIn(el)) return;
            if (Utils.lastUndo && typeof Utils.lastUndo.run === 'function') {
                e.preventDefault();
                Utils.lastUndo.run();
            }
            return;
        }

        if (isTypingIn(el) || modalOpen()) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === '/') {
            const search = document.getElementById('global-search-input');
            if (search) {
                e.preventDefault();
                search.focus();
                search.select();
            }
            return;
        }

        if (e.key === 'n' || e.key === 'N') {
            const input = document.getElementById('add-task-input');
            if (input) {
                e.preventDefault();
                input.focus();
            }
            return;
        }

        if (e.key === 'h' || e.key === 'H') {
            const input = document.getElementById('add-daily-input');
            if (input) {
                e.preventDefault();
                input.focus();
            }
        }
    });
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

/** Fecha o painel do menu ⋯ */
function closeHeaderMenu() {
    const panel = document.getElementById('header-menu-panel');
    const btn = document.getElementById('header-menu-btn');
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
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
        // Um clique dentro do menu pode disparar um re-render (tags, filtros) que
        // substitui o proprio elemento clicado: nesse caso ele ja nao esta no
        // documento e o closest() falharia, fechando o painel sem querer.
        if (!document.contains(e.target)) return;
        if (e.target.closest('#header-menu')) return;
        close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panel.hidden) close();
    });

    const completedBtn = document.getElementById('menu-toggle-completed');
    if (completedBtn) {
        completedBtn.addEventListener('click', () => toggleCompletedSections());
    }

    const scheduledBtn = document.getElementById('menu-toggle-scheduled');
    if (scheduledBtn) {
        scheduledBtn.addEventListener('click', () => toggleScheduledSection());
    }

    const deleteBtn = document.getElementById('menu-delete-completed');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteCompletedWithUndo('todo');
            deleteCompletedWithUndo('daily');
        });
    }

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

/** Lado do workspace: listas a esquerda (predefinicao) ou a direita */
function setupWorkspaceSide() {
    const LAYOUT_STORAGE_KEY = 'habitus-workspace-side'; // 'lists-left' | 'lists-right'
    const layoutBtn = document.getElementById('focus-layout-btn');

    const applyWorkspaceSide = (mode) => {
        const swapped = mode === 'lists-right';
        document.body.classList.toggle('workspace-swapped', swapped);
        if (layoutBtn) {
            layoutBtn.textContent = t('swapSidesLabel');
            layoutBtn.classList.toggle('is-active', swapped);
            layoutBtn.setAttribute('aria-pressed', swapped ? 'true' : 'false');
        }
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, swapped ? 'lists-right' : 'lists-left');
        } catch (e) {
            /* ignore */
        }
        requestAnimationFrame(() => requestAnimationFrame(scrollCalendarToNow));
    };

    if (layoutBtn) {
        layoutBtn.addEventListener('click', () => {
            applyWorkspaceSide(
                document.body.classList.contains('workspace-swapped') ? 'lists-left' : 'lists-right'
            );
        });
    }

    let stored = 'lists-left';
    try {
        if (localStorage.getItem(LAYOUT_STORAGE_KEY) === 'lists-right') stored = 'lists-right';
    } catch (e) {
        /* ignore */
    }
    applyWorkspaceSide(stored);
}

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
    
    // Setup module event listeners
    ModalManager.setupEventListeners();
    PomodoroManager.setupEventListeners();
    ExportImportManager.setupEventListeners();
    KeyboardNavManager.init();

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

// As concluidas (e os habitos agendados) alternam-se pelo menu ⋯, nao por
// botoes dentro das colunas — nao e todos os dias que se quer ve-las.
function toggleCompletedSections() {
    const on = !(RenderManager.sectionOpen.todoCompleted && RenderManager.sectionOpen.dailyCompleted);
    RenderManager.sectionOpen.todoCompleted = on;
    RenderManager.sectionOpen.dailyCompleted = on;
    RenderManager.renderAll();
}

function toggleScheduledSection() {
    RenderManager.sectionOpen.dailyScheduled = !RenderManager.sectionOpen.dailyScheduled;
    RenderManager.renderAll();
}

/** Rotulos e contagens dos controlos de vista no menu ⋯ */
function updateMenuViewControls() {
    const tasks = (DataManager.getAllTasks() || []).filter((x) => !x.is_deleted);
    const completed = tasks.filter((x) => x.status === 'done').length;
    const scheduled = tasks.filter(
        (x) =>
            x.task_type === 'daily' &&
            typeof TasksManager !== 'undefined' &&
            TasksManager.dailyListBucket(x) === 'scheduled'
    ).length;

    const hBtn = document.getElementById('help-quickadd-btn');
    if (hBtn) hBtn.textContent = `? ${t('helpQuickAddBtn')}`;
    const aLink = document.getElementById('about-link');
    if (aLink) aLink.textContent = `ⓘ ${t('aboutLabel')}`;

    const lBtn = document.getElementById('focus-layout-btn');
    if (lBtn) lBtn.textContent = t('swapSidesLabel');

    const cBtn = document.getElementById('menu-toggle-completed');
    const sBtn = document.getElementById('menu-toggle-scheduled');
    const dBtn = document.getElementById('menu-delete-completed');

    if (cBtn) {
        const on = !!RenderManager.sectionOpen.todoCompleted;
        cBtn.textContent = `${t('completedLabel')} (${completed})`;
        cBtn.classList.toggle('is-active', on);
        cBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        cBtn.disabled = completed === 0;
    }
    if (sBtn) {
        const on = !!RenderManager.sectionOpen.dailyScheduled;
        sBtn.textContent = `${t('scheduledLabel')} (${scheduled})`;
        sBtn.classList.toggle('is-active', on);
        sBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        sBtn.disabled = scheduled === 0;
    }
    if (dBtn) {
        dBtn.textContent = t('deleteCompleted');
        dBtn.disabled = completed === 0;
    }
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
    
    if (typeof MobileViewsManager !== 'undefined') {
        MobileViewsManager.updateTabLabels();
    }
    RenderManager.renderAll();
};
