// Utilities Module
// Helper functions for dates, formatting, notifications, etc.

const Utils = {
    // Date Helpers
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    },
    
    isToday(dateString) {
        return dateString === this.getTodayDate();
    },
    
    getDayOfWeek() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[new Date().getDay()];
    },
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage.replace('_', '-') : 'pt-BR';
        return date.toLocaleDateString(lang, { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    },
    
    // Linkify URLs in text
    linkify(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    },
    
    // Toast Notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },
    
    // Play beep sound
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
};
