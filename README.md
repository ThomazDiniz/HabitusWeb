# Habitus — Task Manager

Aplicação web de gestão de tarefas e hábitos com tema escuro, feita com **HTML, CSS e JavaScript puro**. Não há backend nem contas de utilizador: os dados ficam **localmente no navegador** (`localStorage`).

Este ficheiro é a **fonte de verdade** do produto para evolução futura (por exemplo, para uma app nativa ou PWA). **Sempre que acrescentares ou alterares uma funcionalidade, atualiza este README** na secção correspondente e, se fizer sentido, a estrutura de dados e a árvore de ficheiros.

---

## Visão geral

| Aspeto | Descrição |
|--------|-----------|
| **Stack** | HTML5, CSS3, JavaScript (ES6+), sem frameworks |
| **Persistência** | `localStorage` (chave principal `habitus_data`) |
| **i18n** | 9 idiomas; preferência em `habitus_language` |
| **UI** | Duas grandes áreas: **listas** (**Hábitos** + **Atividades**, em pt-BR) e **calendário semanal** (abaixo, com scroll na página). No código mantêm-se `task_type`: `daily` / `todo`. |

---

## Funcionalidades (catálogo)

### Atividades (tasks, `task_type: "todo"`)

- Na interface (pt-BR e i18n alinhado), a coluna chama-se **Atividades**; abaixo usa-se “task” no sentido técnico.
- Criar, editar e eliminar atividades
- Estados: pendente, em progresso, concluída
- Prioridade: nenhuma, baixa, média, alta
- **Data de vencimento** (`due_date`, formato `YYYY-MM-DD`)
- **Hora opcional** (`due_time`, formato `HH:MM`; na grelha do calendário o arrasto alinha a **30 em 30 minutos**)
- Tags múltiplas
- Subtasks com progresso
- Reordenação por **drag and drop** nas listas
- **Definir para hoje** (botão no card, só atividades não concluídas): define `due_date` para o dia **calendário local** atual (`Utils.dateToYMD`) e `due_time` para a **hora atual** (`Utils.getLocalDueTimeNow()`). Toast de confirmação; a pessoa pode depois alterar data/hora (lista, modal ou calendário).
- Limite de **200** atividades (todos) ativas
- Secção de concluídas (oculta por defeito) com eliminar todas as concluídas
- Criação rápida pelo campo `+` e teclado (ver atalhos)
- Edição inline de título e dias da semana (quando aplicável) nas listas

### Hábitos (dailies, `task_type: "daily"`)

- Na interface (pt-BR e i18n alinhado), a coluna chama-se **Hábitos**; o modelo de dados continua a usar “daily” / diária no código.
- Criar, editar e eliminar hábitos (diárias)
- **Streak** e **max streak**
- **Dias da semana** em que a diária conta (meta `days_of_week`); no cartão, o seletor inline permite marcar **vários dias** de seguida — **OK** ou clique **fora** grava; **Esc** descarta
- Reset lógico diário (estado “hoje” / conclusão)
- Limite de **20** hábitos (diárias) ativos
- Secções: ativas, concluídas, agendadas (quando aplicável à UI)
- Integração com o mesmo modelo de dados que tasks (`task_type: "daily"`)

### Tags e filtros

- Adicionar/remover tags em atividades e hábitos
- Filtro por tags com lógica **OR**
- Destaque visual das tags selecionadas
- Clicar numa tag num card aplica o filtro

### Calendário semanal

- Vista **segunda a domingo** para a semana corrente (navegação ‹ / Hoje / ›)
- **Todos com `due_date`** no dia aparecem nesse dia; **dailies** aparecem nos dias em que estão agendadas (`days_of_week`). Diárias **para todos os dias** (`days_of_week` vazio ou os 7 dias) aparecem **só na coluna do dia de hoje** (data real), para não repetir em toda a semana
- **Faixa superior (sem hora)**: itens **sem** `due_time` — **sem scroll interno**; a grelha de horas começa **só depois** de toda essa faixa (altura uniforme entre colunas via CSS Grid)
- **Grelha de tempo** (5:00–24:00 / meia-noite, linhas ~1 h): itens **com** `due_time` posicionados por hora (a posição indica o horário; edição fina pelo lápis/modal ou arrastando; largar na grelha com snap de **30 min**)
- **Diárias concluídas na semana**: só as **diárias** com estado **concluído** deixam de aparecer nas colunas e são listadas num painel **abaixo** da grelha, **à esquerda** (ao lado do painel de atividades concluídas à direita, em ecrã largo), com **data** e os mesmos controlos (⋮, lápis, ✓). Cada diária entra **uma vez** na lista (primeiro dia da semana em que entra na vista)
- **Atividades (todos) concluídas na semana**: painel **adicional** com **todos** com `due_date` nos dias visíveis e estado **concluído**; resumo **abaixo** da grelha, **à direita**, ao lado do painel de diárias (**à esquerda**), em ecrãs largos; em ecrãs estreitos voltam a empilhar. Continuam **também** visíveis no calendário no respetivo dia
- **Drag and drop**: arrastar desde as listas ou desde o calendário; largar na grelha define **data + hora** com snap de **30 em 30 minutos**; durante o arrasto sobre a grelha aparece **pré-visualização** semitransparente do cartão na posição alinhada; largar na faixa superior mantém só o **dia** e **limpa** a hora
- **Arrastar no calendário**: usar o identificador **⋮** no card (não o título nem o lápis)
- **Duplo clique** em espaço vazio na grelha abre modal de **nova task** com data/hora pré-preenchidas
- Botões **+** (nova task na data) e **☀** (nova diária para aquele dia da semana) no cabeçalho de cada dia
- **Edição no calendário**:
  - **Título**: clique no texto do título (chip ou bloco) para edição **inline**; Enter ou blur grava
  - **Hora**: definida pela **posição** na grelha; ajustar **arrastando** o cartão ou pelo **lápis** (modal com campo de hora)
  - **Lápis**: abre o **modal completo** de edição da atividade
  - **Ícone ✓ (concluir)**: alterna pendente/concluída (`TasksManager.toggleTaskStatus`), igual às listas
- Títulos dos botões e textos traduzíveis (`weekCalendar*`, `weekCalendarDragHandle`, `weekCalendarNowLine`, `weekCalendarCompletedTitle`, `weekCalendarCompletedTodosTitle`, etc.); **não** há parágrafo de dicas longas abaixo do calendário (só os painéis opcionais de concluídas, quando houver)

### Navegação na página

- **Header fixo**: além do título e do botão de alternar vista, mostra a etiqueta **Hoje** (traduzida), a **data corrente** por extenso no idioma ativo e o **relógio** local `HH:MM:SS` (atualizado a cada segundo por `WeekCalendarManager`)
- Botão no header alterna **scroll suave** entre as **listas** e o **calendário semanal**
- `scroll-margin-top` nas âncoras para compensar o header fixo

### Teclado (listas)

- **Setas ↑↓**: mover seleção entre cards na coluna ativa
- **Setas ←→**: alternar coluna Hábitos / Atividades (labels conforme idioma)
- **Enter** (com card selecionado): alternar conclusão (checkbox)
- Nos campos de adicionar: **↓** para o primeiro card; **←→** para mudar de coluna de adição
- Ignorado quando modais estão abertos, em inputs, ou durante edição inline específica

### Pomodoro

- Timer configurável (predefinição 15 minutos)
- Iniciar, pausar, continuar, reiniciar
- Barra de progresso
- Notificação e som ao terminar
- Associado a uma atividade (task) específica

### Internacionalização (i18n)

- Idiomas: EN, ES, ZH, JA, DE, IT, PT-BR, PT, FR
- Deteção pelo idioma do sistema
- `updateUI` estendido na app para títulos de botões export/import, secções de concluídas, **toggle de vista**, etc.
- Chaves de rótulos principais: `dailies` / `tasks` (ex.: pt-BR **Hábitos** / **Atividades**); ações do card: `setForToday`, `setForTodayDone`.

### Exportação / importação

- Exportar dados (JSON) e copiar para a área de transferência
- Importar ficheiro JSON com validação
- Botões no canto superior direito

### Robustez e dados

- `tasks` em memória tratado como **array** (fallback se JSON corromper)
- Calendário: `ensureWeekStart()` evita estado inválido da segunda-feira da semana; utilitários de data toleram valores inválidos onde aplicável
- Inicialização do calendário envolvida em `try/catch` na app para não bloquear o resto

---

## Como usar (rápido)

1. Clonar ou descarregar o repositório e abrir `index.html` num navegador moderno.
2. **Atividades / Hábitos**: usar `+` ou os campos de texto e Enter; nas atividades pendentes, **Definir para hoje** agenda para hoje à hora corrente.
3. **Calendário**: navegar a semana, arrastar itens, editar título inline ou abrir o modal com o lápis para hora e outros campos.
4. **Alternar vista**: botão no topo para saltar entre listas e calendário.

---

## Estrutura do projeto

```
HabitusWeb/
├── index.html           # Marcação principal (header, listas, calendário, modais)
├── styles.css           # Tema, layout, calendário, responsivo
├── i18n.js              # Traduções e `t()`, `updateUI`, seletor de idioma
├── app.js               # DOMContentLoaded, listeners globais, `window.updateUI`, toggle de vista
├── README.md            # Este documento (fonte de verdade)
├── LICENSE
└── js/
    ├── data.js          # Persistência, limites MAX_TASKS / MAX_DAILIES
    ├── utils.js         # Datas (incl. getMondayOfWeek, dateToYMD, due_time, getLocalDueTimeNow)
    ├── tasks.js         # CRUD e regras de tasks/dailies
    ├── subtasks.js
    ├── filters.js
    ├── drag-drop.js     # Reordenar nas listas; integração com dados
    ├── pomodoro.js
    ├── export-import.js
    ├── inline-edit.js   # Criação rápida e edição inline nas listas
    ├── keyboard-nav.js  # Navegação por teclado nas listas
    ├── week-calendar.js # Vista semanal, DnD, edição inline, hora
    ├── render.js        # RenderManager.renderAll(); botão «Definir para hoje» em atividades
    ├── modal.js         # Modal de task/daily e Pomodoro (referência)
    └── README.md        # Notas técnicas dos módulos
```

Ordem de scripts em `index.html`: i18n e dados primeiro; `week-calendar.js` antes de `render.js`; `app.js` por último.

---

## Estrutura de dados (referência)

Persistência na chave **`habitus_data`**. Exemplo simplificado de um item em `tasks`:

```json
{
  "id": 1234567890,
  "title": "Título",
  "status": "pending",
  "task_type": "todo",
  "due_date": "2026-12-31",
  "due_time": "14:30",
  "priority": "high",
  "completed_at": null,
  "last_completed_date": null,
  "streak_count": 0,
  "max_streak": 0,
  "order_index": 0,
  "meta": {
    "tags": ["tag1"],
    "days_of_week": ["monday", "wednesday"]
  },
  "is_deleted": false,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z",
  "subtasks": []
}
```

- **`task_type`**: `"todo"` | `"daily"`
- **`due_time`**: `null` ou string `HH:MM` (normalizada nos updates)
- **`meta.days_of_week`**: nomes em inglês minúsculos (`monday` … `sunday`)

Preferência de idioma: chave separada **`habitus_language`** (ex.: `pt_BR`).

---

## Personalização

- **Tema**: variáveis em `:root` em `styles.css` (`--bg-primary`, `--blue-primary`, etc.)
- **Limites**: `MAX_TASKS` e `MAX_DAILIES` em `js/data.js`

---

## Tecnologias e APIs

- HTML5, CSS3 (Grid, Flexbox, variáveis CSS)
- JavaScript ES6+
- `localStorage`
- Web Audio (Pomodoro)
- Drag and Drop API
- Notificações (quando permitidas)

---

## Limitações atuais

- Dados apenas no navegador/dispositivo atual
- Sem sincronização entre dispositivos
- Limite prático do `localStorage` (~5–10 MB)
- Navegadores muito antigos podem ter limitações em DnD ou `input type="time"`

---

## Manutenção deste README

Ao implementar algo novo:

1. Acrescentar à secção **Funcionalidades (catálogo)** ou criar subsecção clara.
2. Atualizar **Estrutura do projeto** se ficheiros ou responsabilidades mudarem.
3. Atualizar **Estrutura de dados** se campos ou chaves mudarem.
4. Se alterar atalhos ou fluxos críticos, refletir em **Como usar** ou nas subsecções relevantes.

Assim o repositório continua pronto para evoluir para PWA, app embutida ou backend opcional sem perder o mapa do produto.

---

## Licença

Este projeto está sob a licença MIT (ver ficheiro `LICENSE`).
