// Internationalization (i18n) for Habitus Task Manager
//
// Apenas o pt_BR (idioma base e fallback de t()) vem embutido. Os restantes
// idiomas vivem em i18n/<lang>.js e sao carregados a pedido — o utilizador so
// descarrega e interpreta o idioma que usa.

const SUPPORTED_LANGUAGES = ['en', 'es', 'zh', 'ja', 'de', 'it', 'pt_BR', 'pt', 'fr'];

const translations = {
    pt_BR: {
        dailies: "Hábitos",
        tasks: "Atividades",
        addDaily: "Adicionar hábito  ·  “Treino seg qua sex 7h”",
        addTask: "Adicionar atividade  ·  “Reunião amanhã 14h #trabalho !alta”",
        globalSearchPlaceholder: "Pesquisar atividades e hábitos…",
        globalSearchAriaLabel: "Pesquisar atividades e hábitos por título ou tag",
        newDaily: "Novo hábito",
        newTask: "Nova atividade",
        editDaily: "Editar hábito",
        editTask: "Editar atividade",
        title: "Título",
        status: "Status",
        priority: "Prioridade",
        dueDate: "Data de Vencimento",
        daysOfWeek: "Dias da Semana",
        tags: "Tags",
        subtasks: "Subtasks",
        addSubtask: "Adicionar Subtask",
        pending: "Pendente",
        inProgress: "Em Progresso",
        done: "Concluída",
        none: "Nenhuma",
        low: "Baixa",
        medium: "Média",
        high: "Alta",
        monday: "Seg",
        tuesday: "Ter",
        wednesday: "Qua",
        thursday: "Qui",
        friday: "Sex",
        saturday: "Sáb",
        sunday: "Dom",
        save: "Salvar",
        cancel: "Cancelar",
        delete: "Deletar",
        edit: "Editar",
        complete: "Completar",
        pomodoro: "Pomodoro",
        start: "Iniciar",
        pause: "Pausar",
        resume: "Continuar",
        reset: "Reiniciar",
        duration: "Duração (minutos)",
        showCompleted: "Mostrar Concluídas",
        hideCompleted: "Ocultar Concluídas",
        deleteCompleted: "Deletar Concluídas",
        showScheduled: "Mostrar Agendadas",
        hideScheduled: "Ocultar Agendadas",
        export: "Exportar",
        import: "Importar",
        exportSuccess: "Exportado para a área de transferência!",
        importSuccess: "Importado com sucesso!",
        importError: "Erro ao importar. Formato inválido.",
        pomodoroComplete: "Pomodoro completado! 🎉",
        allTasksComplete: "Parabéns! Você concluiu todas as atividades!",
        streak: "Streak",
        days: "dias",
        everyDay: "Todos os Dias",
        today: "Hoje",
        for: "para",
        motivationalMessage: "✨ Você consegue! ✨",
        noTasks: "Ainda não há atividades. Clique em + para adicionar uma!",
        noDailies: "Ainda não há hábitos. Clique em + para adicionar um!",
        taskLimitReached: "Limite de atividades atingido (máximo 200)",
        dailyLimitReached: "Limite de hábitos atingido (máximo 20)",
        titleRequired: "Título é obrigatório",
        dueTimeOptional: "Hora (opcional)",
        weekCalendar: "Semana",
        weekCalendarToday: "Hoje",
        weekCalendarAddTask: "Nova atividade nesta data",
        weekCalendarAddDaily: "Novo hábito neste dia da semana",
        viewToggleWeek: "Semana",
        viewToggleLists: "Listas",
        viewToggleWeekTitle: "Rolar até o calendário da semana",
        viewToggleListsTitle: "Rolar até hábitos e atividades",
        weekCalendarDragHandle: "Arrastar para mover",
        weekCalendarNowLine: "Agora",
        weekCalendarCompletedTitle: "Hábitos concluídos na semana",
        weekCalendarCompletedTitleToday: "Hábitos concluídos hoje",
        weekCalendarTitleToday: "Hoje",
        weekCalendarShowTodayOnly: "Só hoje",
        weekCalendarShowWeek: "Semana inteira",
        weekCalendarShowTodayOnlyTitle: "Mostrar só o dia de hoje no calendário",
        weekCalendarShowWeekTitle: "Mostrar a semana completa (seg–dom)",
        weekCalendarCompletedTodosTitle: "Atividades concluídas na semana",
        weekCalendarCompletedTodosTitleToday: "Atividades concluídas hoje",
        weekCalendarPickTime: "Hora",
        daysPickerOk: "OK",
        taskDurationLabel: "Tempo no calendário (min)",
        taskDurationDecrease: "Menos 15 minutos",
        taskDurationIncrease: "Mais 15 minutos",
        weekCalendarResizeDuration: "Arraste para redimensionar o bloco",
        setForToday: "Definir para hoje",
        setForTodayDone: "Atividade definida para hoje.",
        sendToTop: "Para o topo",
        sendToBottom: "Para o fim",
        activityFinished: "Atividade finalizada",
        undo: "Desfazer",
        viewLabel: "Ver",
        completedLabel: "Concluídas",
        scheduledLabel: "Hábitos agendados",
        menuMore: "Mais opções",
        languageLabel: "Idioma",
        taskDeleted: "Excluída",
        completedDeleted: "Concluídas excluídas",
        tasksDateFilterAll: "Todas",
        tasksDateFilterToday: "Hoje",
        tasksDateFilterNoDate: "Sem data",
        tasksDateFilterFuture: "Futuras",
        remindersEnableTitle: "Ativar lembretes na hora do vencimento (notificações do navegador)",
        remindersDisableTitle: "Desativar lembretes",
        remindersEnabledToast: "Lembretes ativados",
        remindersDisabledToast: "Lembretes desativados",
        remindersPermissionDenied: "Notificações bloqueadas. Ative-as nas definições do navegador.",
        remindersNotSupported: "Notificações não suportadas neste navegador.",
        reminderNotificationTitle: "Lembrete",
        statsSectionTitle: "Estatísticas",
        statsSectionSubtitle: "Esta semana (seg–dom, horário local)",
        statsTodosDoneWeek: "Atividades concluídas (esta semana)",
        statsTodosDoneToday: "Atividades concluídas (hoje)",
        statsHabitsDoneToday: "Hábitos concluídos hoje",
        statsBestStreak: "Maior sequência de hábito (recorde)",
        statsPomodoroMinutes: "Minutos de Pomodoro concluídos",
        statsPomodoroSessions: "Sessões de Pomodoro concluídas",
        mobileTabBarAria: "Alternar entre hábitos, atividades e o calendário de hoje"
    }
};

let currentLanguage = 'pt_BR';

/** Carrega i18n/<lang>.js uma unica vez; resolve sempre (fallback = pt_BR). */
const _langLoads = {};
function loadLanguageAssets(lang) {
    if (lang === 'pt_BR' || translations[lang]) return Promise.resolve();
    if (!SUPPORTED_LANGUAGES.includes(lang)) return Promise.resolve();
    if (_langLoads[lang]) return _langLoads[lang];
    _langLoads[lang] = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'i18n/' + lang + '.js';
        s.onload = () => resolve();
        s.onerror = () => {
            console.warn('i18n: falhou o carregamento de', lang, '— a usar pt_BR');
            resolve();
        };
        document.head.appendChild(s);
    });
    return _langLoads[lang];
}

// Detect system language
function detectLanguage() {
    const browserLang = navigator.language || navigator.userLanguage || 'pt-BR';
    const langMap = {
        en: 'en',
        es: 'es',
        zh: 'zh',
        ja: 'ja',
        de: 'de',
        it: 'it',
        'pt-BR': 'pt_BR',
        pt: 'pt',
        fr: 'fr'
    };

    if (langMap[browserLang]) return langMap[browserLang];

    const langCode = String(browserLang).split('-')[0];
    if (langMap[langCode]) return langMap[langCode];

    return 'pt_BR';
}

// Load language preference from localStorage
function loadLanguage() {
    const saved = localStorage.getItem('habitus_language');
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        currentLanguage = saved;
    } else {
        currentLanguage = detectLanguage();
    }
    return currentLanguage;
}

// Save language preference
function saveLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('habitus_language', lang);
}

/** Muda de idioma carregando o ficheiro respetivo antes de repintar. */
function setLanguage(lang) {
    return loadLanguageAssets(lang).then(() => {
        saveLanguage(lang);
        if (typeof window.updateUI === 'function') {
            window.updateUI();
        } else {
            updateUI();
            if (typeof RenderManager !== 'undefined' && RenderManager.renderAll) {
                RenderManager.renderAll();
            }
        }
    });
}

// Get translation
function t(key) {
    return translations[currentLanguage]?.[key] ?? translations.pt_BR[key] ?? key;
}

// Update all UI text
function updateUI() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
}

/**
 * Inicializa o i18n. Como o idioma pode viver noutro ficheiro, o arranque da
 * app corre no callback (ou na promessa devolvida).
 */
function initI18n(onReady) {
    loadLanguage();
    const selector = document.getElementById('language-selector');
    if (selector) {
        selector.value = currentLanguage;
        selector.addEventListener('change', (e) => {
            setLanguage(e.target.value);
        });
    }
    return loadLanguageAssets(currentLanguage).then(() => {
        updateUI();
        if (typeof onReady === 'function') onReady();
    });
}
