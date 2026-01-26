# Habitus - Task Manager

Uma aplicação web de gerenciamento de tarefas com tema dark, construída com HTML, CSS e JavaScript puro. Sem backend, sem sistema de usuários - tudo salvo localmente no navegador.

## Funcionalidades

### Tasks (Todos)
- Criar, editar e deletar tasks
- Status: Pendente, Em Progresso, Concluída
- Prioridade: Baixa, Média, Alta
- Data de vencimento
- Tags múltiplas por task
- Subtasks com progresso
- Drag and drop para reordenar
- Limite de 200 tasks
- Seção de tasks concluídas (oculta por padrão)

### Dailies
- Criar, editar e deletar dailies
- Streak count (sequência de dias consecutivos)
- Max streak (maior sequência alcançada)
- Seleção de dias da semana
- Reset automático diário
- Limite de 20 dailies
- Seções: ativas, concluídas, agendadas

### Tags e Filtros
- Adicionar/remover tags em tasks e dailies
- Filtro por tags (lógica OR)
- Destaque visual para tags selecionadas
- Clicar em tag na task filtra automaticamente

### Pomodoro Timer
- Timer configurável (padrão: 15 minutos)
- Controles: Iniciar, Pausar, Continuar, Reiniciar
- Barra de progresso visual
- Notificação e som ao completar
- Associado a uma task específica

### Internacionalização
- Suporte a 9 idiomas: Inglês, Espanhol, Chinês, Japonês, Alemão, Italiano, Português BR, Português PT, Francês
- Detecção automática do idioma do sistema
- Preferência salva no localStorage

### Exportação/Importação
- Exportar todas as tasks em JSON
- Importar tasks de arquivo JSON
- Copiar para clipboard
- Validação de formato

## Como Usar

### Instalação
1. Clone ou baixe este repositório
2. Abra `index.html` no seu navegador
3. Pronto! Não precisa de instalação ou configuração

### Uso Básico

#### Criar uma Task
1. Clique no botão `+` na coluna "Tasks"
2. A task será criada e você pode editar diretamente
3. Clique no título para editar rapidamente ou no botão "Editar" para edição completa

#### Criar uma Daily
1. Clique no botão `+` na coluna "Dailies"
2. Preencha o título
3. Selecione os dias da semana (ou deixe vazio para todos os dias)

#### Adicionar Subtasks
1. Abra uma task para editar
2. Clique em "+ Adicionar Subtask"
3. Digite o título da subtask
4. Pressione Enter ou clique fora para salvar

#### Usar Pomodoro Timer
1. Clique no botão Pomodoro em qualquer task
2. Ajuste a duração (em minutos)
3. Clique em "Iniciar"
4. O timer notificará quando completar

#### Filtrar por Tags
1. Clique em uma tag abaixo do cabeçalho da coluna
2. Ou clique em uma tag diretamente na task
3. Múltiplas tags = lógica OR (mostra tasks com qualquer uma)

#### Exportar/Importar
- **Exportar**: Clique no botão de exportar no topo direito
- **Importar**: Clique no botão de importar e selecione um arquivo JSON

## Estrutura do Projeto

```
habitus/
├── index.html          # HTML principal
├── styles.css          # Estilos (tema dark)
├── i18n.js             # Sistema de internacionalização
├── app.js              # Inicialização principal
├── README.md           # Documentação geral do projeto
└── js/                 # Módulos JavaScript
    ├── data.js         # Gerenciamento de dados
    ├── utils.js        # Funções utilitárias
    ├── tasks.js        # Lógica de tasks/dailies
    ├── subtasks.js     # Lógica de subtasks
    ├── filters.js      # Sistema de filtros
    ├── drag-drop.js    # Drag and drop
    ├── pomodoro.js     # Timer Pomodoro
    ├── export-import.js # Exportação/importação
    ├── render.js       # Renderização da UI
    ├── inline-edit.js  # Edição inline
    ├── modal.js        # Gerenciamento de modais
    └── README.md       # Documentação técnica dos módulos
```

Para informações técnicas detalhadas sobre a arquitetura dos módulos, consulte [js/README.md](js/README.md)

## Estrutura de Dados

Os dados são salvos no `localStorage` com a chave `habitus_data`. Estrutura:

```json
{
  "tasks": [
    {
      "id": 1234567890,
      "title": "Título da task",
      "status": "pending",
      "task_type": "todo",
      "due_date": "2025-12-31",
      "priority": "high",
      "completed_at": null,
      "last_completed_date": null,
      "streak_count": 0,
      "max_streak": 0,
      "order_index": 0,
      "meta": {
        "tags": ["tag1", "tag2"],
        "days_of_week": ["monday", "tuesday"]
      },
      "is_deleted": false,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z",
      "subtasks": []
    }
  ],
  "settings": {
    "language": "pt_BR"
  }
}
```

## Personalização

### Cores do Tema
As cores principais podem ser ajustadas em `styles.css` através das variáveis CSS:

```css
:root {
  --bg-primary: linear-gradient(135deg, #0f1117 0%, #1a1d29 100%);
  --blue-primary: #7c9eff;
  --blue-secondary: #5b8def;
  --text-primary: #e4e7eb;
}
```

### Limites
Os limites de tasks podem ser alterados em `js/data.js`:

```javascript
const DataManager = {
    MAX_TASKS: 200,
    MAX_DAILIES: 20
};
```

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript ES6+
- localStorage API
- Web Audio API
- Drag and Drop API

## Notas

- Sem Backend: Tudo funciona localmente no navegador
- Sem Dependências: JavaScript puro, sem frameworks
- Responsivo: Funciona em desktop, tablet e mobile
- Offline: Funciona sem conexão à internet
- Privacidade: Dados ficam apenas no seu navegador

## Limitações Conhecidas

- Dados são salvos apenas no navegador atual
- Não há sincronização entre dispositivos
- Limite de armazenamento do localStorage (~5-10MB)
- Drag and drop pode não funcionar em alguns navegadores antigos

## Licença

Este projeto está sob a licença MIT.
