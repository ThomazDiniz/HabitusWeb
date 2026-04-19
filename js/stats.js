// Resumo de estatísticas (semana local, Pomodoro persistido em appData.stats)

const StatsManager = {
    render() {
        const grid = document.getElementById('stats-grid');
        const sub = document.getElementById('stats-section-subtitle');
        if (!grid) return;

        const today = Utils.getTodayDate();
        const monday = Utils.getMondayOfWeek(new Date());
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        const ymdStart = Utils.dateToYMD(monday);
        const ymdEnd = Utils.dateToYMD(sunday);

        if (sub) {
            const a = Utils.formatDate(ymdStart);
            const b = Utils.formatDate(ymdEnd);
            sub.textContent = `${t('statsSectionSubtitle')} · ${a} — ${b}`;
        }

        const tasks = (DataManager.getAllTasks() || []).filter((t) => !t.is_deleted);

        let todosDoneWeek = 0;
        let todosDoneToday = 0;
        tasks.forEach((t) => {
            if (t.task_type !== 'todo' || t.status !== 'done' || !t.completed_at) return;
            const d = String(t.completed_at).slice(0, 10);
            if (d === today) todosDoneToday += 1;
            if (d >= ymdStart && d <= ymdEnd) todosDoneWeek += 1;
        });

        const dailies = tasks.filter((t) => t.task_type === 'daily');
        const habitsDoneToday = dailies.filter(
            (t) => t.status === 'done' && Utils.isToday(t.last_completed_date)
        ).length;

        let bestStreak = 0;
        dailies.forEach((t) => {
            bestStreak = Math.max(bestStreak, t.max_streak || 0, t.streak_count || 0);
        });

        const st = DataManager.appData.stats || {};
        const pomMin = Math.round(st.pomodoroMinutesCompleted || 0);
        const pomSes = Math.round(st.pomodoroSessionsCompleted || 0);

        grid.innerHTML = `
            <div class="stats-card">
                <span class="stats-value">${todosDoneWeek}</span>
                <span class="stats-label">${t('statsTodosDoneWeek')}</span>
            </div>
            <div class="stats-card">
                <span class="stats-value">${todosDoneToday}</span>
                <span class="stats-label">${t('statsTodosDoneToday')}</span>
            </div>
            <div class="stats-card">
                <span class="stats-value">${habitsDoneToday}</span>
                <span class="stats-label">${t('statsHabitsDoneToday')}</span>
            </div>
            <div class="stats-card">
                <span class="stats-value">${bestStreak}</span>
                <span class="stats-label">${t('statsBestStreak')}</span>
            </div>
            <div class="stats-card">
                <span class="stats-value">${pomMin}</span>
                <span class="stats-label">${t('statsPomodoroMinutes')}</span>
            </div>
            <div class="stats-card">
                <span class="stats-value">${pomSes}</span>
                <span class="stats-label">${t('statsPomodoroSessions')}</span>
            </div>
        `;
    }
};
