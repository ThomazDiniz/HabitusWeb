// Keyboard navigation: arrows between columns / items, Enter toggles completion

const KeyboardNavManager = {
    column: 'daily',
    selectedTaskId: null,
    hasUserNavigated: false,

    init() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e), true);
        const dailyIn = document.getElementById('add-daily-input');
        const taskIn = document.getElementById('add-task-input');
        [dailyIn, taskIn].forEach((el) => {
            if (!el) return;
            el.addEventListener('focusin', () => {
                this.column = el.id === 'add-daily-input' ? 'daily' : 'todo';
                this.clearCardOutline();
                this.applyAddRowOutline();
            });
        });
    },

    isModalOpen() {
        const pomodoro = document.getElementById('pomodoro-modal');
        const taskModal = document.getElementById('task-modal');
        const open = (el) => el && el.style.display && el.style.display !== 'none';
        return open(pomodoro) || open(taskModal);
    },

    shouldHandle(e) {
        const t = e.target;
        if (t.id === 'add-daily-input' || t.id === 'add-task-input') {
            return false;
        }
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) {
            return false;
        }
        if (e.key === 'Enter' && (t.tagName === 'BUTTON' || t.tagName === 'A')) {
            return false;
        }
        if (this.isModalOpen()) return false;
        if (typeof InlineEditManager !== 'undefined') {
            if (InlineEditManager.editingTaskId != null || InlineEditManager.editingDaysOfWeekTaskId != null) {
                return false;
            }
        }
        return true;
    },

    listId() {
        return this.column === 'daily' ? 'dailies-list' : 'tasks-list';
    },

    getCards() {
        const list = document.getElementById(this.listId());
        if (!list) return [];
        return Array.from(list.querySelectorAll(':scope > .task-card'));
    },

    clearCardOutline() {
        document.querySelectorAll('.task-card.keyboard-selected').forEach((el) => {
            el.classList.remove('keyboard-selected');
        });
    },

    clearAddRowOutline() {
        document.querySelectorAll('.add-input-row.keyboard-selected-add').forEach((el) => {
            el.classList.remove('keyboard-selected-add');
        });
    },

    applyAddRowOutline() {
        this.clearAddRowOutline();
        const id = this.column === 'daily' ? 'add-daily-input' : 'add-task-input';
        const input = document.getElementById(id);
        const row = input && input.closest('.add-input-row');
        if (row) row.classList.add('keyboard-selected-add');
    },

    applyOutline() {
        this.clearAddRowOutline();
        this.clearCardOutline();
        if (this.selectedTaskId == null) return;
        const card = document.querySelector(
            `#${this.listId()} > .task-card[data-task-id="${this.selectedTaskId}"]`
        );
        if (card) {
            card.classList.add('keyboard-selected');
            card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    },

    moveVertical(delta) {
        this.hasUserNavigated = true;
        const cards = this.getCards();
        if (cards.length === 0) {
            this.selectedTaskId = null;
            this.clearCardOutline();
            return;
        }
        let index = cards.findIndex((c) => String(c.dataset.taskId) === String(this.selectedTaskId));
        if (index < 0) {
            index = delta > 0 ? 0 : cards.length - 1;
        } else {
            const next = index + delta;
            if (next < 0) {
                this.focusAddInput(this.column);
                return;
            }
            index = Math.max(0, Math.min(cards.length - 1, next));
        }
        this.selectedTaskId = Number(cards[index].dataset.taskId);
        this.applyOutline();
    },

    focusAddInput(column) {
        this.column = column;
        this.hasUserNavigated = true;
        this.selectedTaskId = null;
        this.clearCardOutline();
        const id = column === 'daily' ? 'add-daily-input' : 'add-task-input';
        const el = document.getElementById(id);
        if (el) {
            el.focus({ preventScroll: false });
            this.applyAddRowOutline();
        }
    },

    goFromAddInputToFirstTask(column) {
        this.column = column;
        const cards = this.getCards();
        if (cards.length === 0) {
            return;
        }
        const input = document.activeElement;
        if (input && input.blur) input.blur();
        this.hasUserNavigated = true;
        this.selectedTaskId = Number(cards[0].dataset.taskId);
        this.applyOutline();
    },

    switchColumn(newColumn) {
        this.hasUserNavigated = true;
        const oldCards = this.getCards();
        let index = 0;
        if (this.selectedTaskId != null && oldCards.length > 0) {
            const i = oldCards.findIndex((c) => String(c.dataset.taskId) === String(this.selectedTaskId));
            if (i >= 0) index = i;
        }
        this.column = newColumn;
        const cards = this.getCards();
        if (cards.length === 0) {
            this.selectedTaskId = null;
            this.clearCardOutline();
            return;
        }
        const target = cards[Math.min(index, cards.length - 1)];
        this.selectedTaskId = Number(target.dataset.taskId);
        this.applyOutline();
    },

    toggleSelected() {
        if (!this.hasUserNavigated || this.selectedTaskId == null) return;
        const cards = this.getCards();
        const card = cards.find((c) => String(c.dataset.taskId) === String(this.selectedTaskId));
        if (!card) return;
        const checkbox = card.querySelector('.task-checkbox');
        if (checkbox) {
            checkbox.click();
        }
    },

    onKeyDown(e) {
        const t = e.target;
        const isAddInput = t.id === 'add-daily-input' || t.id === 'add-task-input';

        if (isAddInput && !this.isModalOpen()) {
            if (typeof InlineEditManager !== 'undefined') {
                if (InlineEditManager.editingTaskId != null || InlineEditManager.editingDaysOfWeekTaskId != null) {
                    return;
                }
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const col = t.id === 'add-daily-input' ? 'daily' : 'todo';
                this.column = col;
                this.goFromAddInputToFirstTask(col);
                return;
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const goDaily = e.key === 'ArrowLeft';
                this.focusAddInput(goDaily ? 'daily' : 'todo');
                return;
            }
            return;
        }

        if (!this.shouldHandle(e)) return;

        const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
        if (!navKeys.includes(e.key)) return;

        e.preventDefault();

        switch (e.key) {
            case 'ArrowUp':
                this.moveVertical(-1);
                break;
            case 'ArrowDown':
                this.moveVertical(1);
                break;
            case 'ArrowLeft':
                this.switchColumn('daily');
                break;
            case 'ArrowRight':
                this.switchColumn('todo');
                break;
            case 'Enter':
                this.toggleSelected();
                break;
            default:
                break;
        }
    },

    afterRender() {
        const ae = document.activeElement;
        if (ae && (ae.id === 'add-daily-input' || ae.id === 'add-task-input')) {
            this.column = ae.id === 'add-daily-input' ? 'daily' : 'todo';
            this.clearCardOutline();
            this.applyAddRowOutline();
            return;
        }
        if (!this.hasUserNavigated) {
            this.clearCardOutline();
            this.clearAddRowOutline();
            return;
        }
        const cards = this.getCards();
        if (cards.length === 0) {
            this.selectedTaskId = null;
            this.clearCardOutline();
            return;
        }
        const stillThere = cards.some((c) => String(c.dataset.taskId) === String(this.selectedTaskId));
        if (!stillThere) {
            this.selectedTaskId = Number(cards[0].dataset.taskId);
        }
        this.applyOutline();
    }
};
