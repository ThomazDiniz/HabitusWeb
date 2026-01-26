# Estrutura de Módulos JavaScript

Este diretório contém todos os módulos JavaScript do Habitus Task Manager, organizados por responsabilidade para facilitar manutenção e desenvolvimento.

## Ordem de Carregamento

Os módulos devem ser carregados na seguinte ordem no HTML:

1. **i18n.js** - Sistema de internacionalização (carregado antes dos módulos)
2. **data.js** - Gerenciamento de dados e localStorage
3. **utils.js** - Funções utilitárias (toast, linkify, datas)
4. **tasks.js** - Lógica de tasks e dailies
5. **subtasks.js** - Lógica de subtasks
6. **filters.js** - Sistema de filtros e tags
7. **drag-drop.js** - Drag and drop
8. **pomodoro.js** - Timer Pomodoro
9. **export-import.js** - Exportação e importação JSON
10. **render.js** - Funções de renderização
11. **modal.js** - Gerenciamento de modais
12. **app.js** - Inicialização principal (carregado por último)

## Módulos

### data.js
**DataManager** - Gerencia persistência de dados
- `init()` - Inicializa e carrega dados do localStorage
- `saveData()` - Salva dados no localStorage
- `loadData()` - Carrega dados do localStorage
- `generateId()` - Gera IDs únicos
- `getAllTasks()`, `getTasksByType()`, `findTask()` - Consultas
- `addTask()`, `updateTask()`, `deleteTask()` - CRUD básico

### utils.js
**Utils** - Funções utilitárias
- `getTodayDate()`, `isToday()`, `getDayOfWeek()` - Helpers de data
- `formatDate()` - Formatação de datas
- `linkify()` - Converte URLs em links
- `showToast()` - Notificações toast
- `playBeep()` - Som de notificação

### tasks.js
**TasksManager** - Lógica de tasks e dailies
- `createTask()` - Cria objeto de task
- `addTask()` - Adiciona task (com validação de limites)
- `updateTask()` - Atualiza task
- `deleteTask()` - Remove task
- `toggleTaskStatus()` - Alterna status (pending/done)
- `isDailyScheduledForToday()` - Verifica se daily está agendada
- `checkDailyResets()` - Reseta dailies diariamente
- `deleteCompletedTasks()` - Remove tasks concluídas

### subtasks.js
**SubtasksManager** - Lógica de subtasks
- `addSubtask()` - Adiciona subtask
- `updateSubtask()` - Atualiza subtask
- `deleteSubtask()` - Remove subtask
- `toggleSubtaskStatus()` - Alterna status
- `getSubtasksProgress()` - Calcula progresso

### filters.js
**FiltersManager** - Sistema de filtros
- `toggleFilter()` - Ativa/desativa filtro por tag
- `clearFilters()` - Limpa filtros
- `getFilteredTasks()` - Retorna tasks filtradas
- `getAllTags()` - Retorna todas as tags únicas
- `isTagActive()` - Verifica se tag está ativa

### drag-drop.js
**DragDropManager** - Drag and drop
- `setup()` - Configura drag and drop em container
- Handlers: `handleDragStart`, `handleDragEnd`, `handleDragOver`, etc.

### pomodoro.js
**PomodoroManager** - Timer Pomodoro
- `openModal()` - Abre modal do timer
- `closeModal()` - Fecha modal
- `start()`, `pause()`, `resume()`, `reset()` - Controles do timer
- `updateDisplay()` - Atualiza display do timer
- `complete()` - Completa o Pomodoro
- `setupEventListeners()` - Configura eventos

### export-import.js
**ExportImportManager** - Exportação/Importação
- `exportTasks()` - Exporta tasks para JSON (clipboard)
- `importTasks()` - Abre diálogo de importação
- `handleFileImport()` - Processa arquivo importado
- `setupEventListeners()` - Configura eventos

### render.js
**RenderManager** - Renderização da UI
- `renderAll()` - Renderiza tudo
- `renderDailies()` - Renderiza dailies
- `renderTasks()` - Renderiza tasks
- `renderTagFilters()` - Renderiza filtros de tags
- `createTaskCard()` - Cria card de task
- `createSubtasksHTML()` - Cria HTML de subtasks
- `updateCounts()` - Atualiza contadores
- `updateMotivationalMessage()` - Atualiza mensagem motivadora

### modal.js
**ModalManager** - Gerenciamento de modais
- `openTaskModal()` - Abre modal de task/daily
- `closeTaskModal()` - Fecha modal
- `saveTaskFromModal()` - Salva task do modal
- `renderSubtasksInModal()` - Renderiza subtasks no modal
- `setupEventListeners()` - Configura eventos

## Dependências

- Todos os módulos dependem de `DataManager` para acesso aos dados
- Todos os módulos dependem de `Utils` para funções utilitárias
- Módulos de UI dependem de `RenderManager` para re-renderização
- `app.js` orquestra todos os módulos

## Convenções

- Cada módulo expõe um objeto global com seu nome (ex: `DataManager`, `TasksManager`)
- Métodos públicos são documentados no objeto
- Dados compartilhados são acessados via `DataManager.appData`
- Funções de tradução usam `t()` do i18n.js
