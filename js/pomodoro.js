// Pomodoro Timer Module
// Handles Pomodoro timer functionality

const PomodoroManager = {
    interval: null,
    timeLeft: 15 * 60, // 15 minutes in seconds
    totalTime: 15 * 60,
    paused: false,
    currentTask: null,
    
    // Open Pomodoro modal
    openModal(task) {
        this.currentTask = task;
        const modal = document.getElementById('pomodoro-modal');
        const durationInput = document.getElementById('timer-duration');
        const taskTitleEl = document.getElementById('pomodoro-task-title');
        const durationLabel = document.getElementById('timer-duration-label');
        
        if (taskTitleEl) taskTitleEl.textContent = `${t('pomodoro')} ${t('for')} ${task.title}:`;
        if (durationInput) durationInput.value = Math.floor(this.totalTime / 60);
        if (durationLabel) durationLabel.textContent = t('duration');
        
        // Update button labels
        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');
        const resumeBtn = document.getElementById('timer-resume');
        const resetBtn = document.getElementById('timer-reset');
        
        if (startBtn) startBtn.textContent = t('start');
        if (pauseBtn) pauseBtn.textContent = t('pause');
        if (resumeBtn) resumeBtn.textContent = t('resume');
        if (resetBtn) resetBtn.textContent = t('reset');
        
        this.reset();
        if (modal) modal.style.display = 'flex';
        
        // Setup time input after modal is shown
        setTimeout(() => {
            this.setupTimeInput();
        }, 100);
    },
    
    // Close Pomodoro modal
    closeModal() {
        const modal = document.getElementById('pomodoro-modal');
        if (modal) modal.style.display = 'none';
        this.stop();
    },
    
    // Start timer
    start() {
        if (this.interval) return;
        
        // Get time from input or duration input
        const timeEl = document.getElementById('timer-time');
        let minutes = 15;
        let seconds = 0;
        
        if (timeEl && timeEl.value) {
            const timeMatch = timeEl.value.match(/(\d+):(\d+)/);
            if (timeMatch) {
                minutes = parseInt(timeMatch[1]) || 15;
                seconds = parseInt(timeMatch[2]) || 0;
            } else {
                const durationInput = document.getElementById('timer-duration');
                minutes = parseInt(durationInput?.value) || 15;
            }
        } else {
            const durationInput = document.getElementById('timer-duration');
            minutes = parseInt(durationInput?.value) || 15;
        }
        
        this.totalTime = minutes * 60 + seconds;
        this.timeLeft = this.totalTime;
        
        this.paused = false;
        this.interval = setInterval(() => {
            if (!this.paused) {
                this.timeLeft--;
                this.updateDisplay();
                
                if (this.timeLeft <= 0) {
                    this.complete();
                }
            }
        }, 1000);
        
        this.updateDisplay();
        this.updateControls();
    },
    
    // Pause timer
    pause() {
        this.paused = true;
        this.updateControls();
    },
    
    // Resume timer
    resume() {
        this.paused = false;
        this.updateControls();
    },
    
    // Reset timer
    reset() {
        this.stop();
        const durationInput = document.getElementById('timer-duration');
        const duration = parseInt(durationInput?.value) || 15;
        this.totalTime = duration * 60;
        this.timeLeft = this.totalTime;
        this.paused = false;
        this.updateDisplay();
        this.updateControls();
    },
    
    // Setup time input handler
    setupTimeInput() {
        const timeEl = document.getElementById('timer-time');
        if (!timeEl) return;
        
        timeEl.addEventListener('blur', () => {
            const timeMatch = timeEl.value.match(/(\d+):(\d+)/);
            if (timeMatch) {
                const minutes = parseInt(timeMatch[1]) || 15;
                const seconds = parseInt(timeMatch[2]) || 0;
                const totalSeconds = Math.min(Math.max(minutes * 60 + seconds, 0), 3600); // Max 60 min
                const mins = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                timeEl.value = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                
                // Update duration input
                const durationInput = document.getElementById('timer-duration');
                if (durationInput) {
                    durationInput.value = mins;
                }
            } else {
                // Invalid format, reset
                const durationInput = document.getElementById('timer-duration');
                const duration = parseInt(durationInput?.value) || 15;
                timeEl.value = `${String(duration).padStart(2, '0')}:00`;
            }
        });
        
        timeEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                timeEl.blur();
            }
        });
    },
    
    // Stop timer
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },
    
    // Update display
    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const timeEl = document.getElementById('timer-time');
        if (timeEl) {
            if (this.interval && !this.paused) {
                // Running - not editable
                timeEl.readOnly = true;
                timeEl.classList.add('timer-running');
            } else {
                // Stopped/paused - editable
                timeEl.readOnly = false;
                timeEl.classList.remove('timer-running');
            }
            timeEl.value = timeString;
        }
        
        const progress = ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
        const progressBar = document.getElementById('timer-progress-bar');
        if (progressBar) progressBar.style.width = `${progress}%`;
    },
    
    // Update control buttons
    updateControls() {
        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');
        const resumeBtn = document.getElementById('timer-resume');
        
        if (this.interval && !this.paused) {
            if (startBtn) startBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'inline-block';
            if (resumeBtn) resumeBtn.style.display = 'none';
        } else if (this.interval && this.paused) {
            if (startBtn) startBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (resumeBtn) resumeBtn.style.display = 'inline-block';
        } else {
            if (startBtn) startBtn.style.display = 'inline-block';
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (resumeBtn) resumeBtn.style.display = 'none';
        }
    },
    
    // Complete Pomodoro
    complete() {
        this.stop();
        Utils.showToast(t('pomodoroComplete'), 'success');
        Utils.playBeep();
        this.updateDisplay();
        this.updateControls();
    },
    
    // Setup event listeners
    setupEventListeners() {
        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');
        const resumeBtn = document.getElementById('timer-resume');
        const resetBtn = document.getElementById('timer-reset');
        const closeBtn = document.getElementById('close-pomodoro');
        const modal = document.getElementById('pomodoro-modal');
        
        if (startBtn) startBtn.addEventListener('click', () => this.start());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.resume());
        if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'pomodoro-modal') {
                    this.closeModal();
                }
            });
        }
        
        this.setupTimeInput();
    }
};
