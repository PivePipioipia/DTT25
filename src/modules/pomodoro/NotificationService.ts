/**
 * NotificationService
 * Handles all user alerts (Visual, Audio, Native).
 * Supports Tiered Notifications (Toast -> Modal).
 */
export class NotificationService {
    audioContext: AudioContext;
    soundEnabled: boolean;

    constructor() {
        // @ts-ignore - Prefix handling
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        this.soundEnabled = true;
    }

    notify(title: string, message: string, options: any = {}) {
        console.log(`[NOTIFY] ${title}: ${message}`, options);

        if (options.modal) {
            // Level 3/4: Show Modal
            this._showModal(title, message, options);
        } else {
            // Level 1/2: Show Toast
            this._showToast(title, message);
        }

        // Check "Edge Lighting" setting (Default to TRUE for testing if null)
        const rawEdge = localStorage.getItem('edge_lighting_enabled');
        const edgeEnabled = rawEdge === null ? true : rawEdge === 'true';
        const quietMode = localStorage.getItem('quiet_mode_enabled') === 'true';

        // Validating Edge Logic:
        // 1. Only triggers if user settings allow
        // 2. Triggers ONLY on "Break Start" (Work End) or "Break End" (Next Work Start)
        // 3. SKIPS the very first Work Session start (handled by caller logic typically, but we can check message content)

        // Simple heuristic: "Hoàn thành phiên" (Work End) OR "Hết giờ nghỉ" (Break End)
        const isTransition = title.includes("Hoàn thành phiên") || title.includes("Hết giờ nghỉ");

        if (isTransition && window.electron && window.electron.triggerEdgeLighting) {
            window.electron.triggerEdgeLighting({
                enabled: edgeEnabled,
                quiet: quietMode
            });
        }

        // Native OS Notification (IPC to Main)
        if (!quietMode && window.electron && window.electron.systemNotification) {
            window.electron.systemNotification({
                title: title,
                body: message
            });
        }

        // Also keep browser API as fallback
        if (!quietMode && !window.electron && Notification.permission === 'granted') {
            new Notification(title, { body: message, icon: '/icon.png' });
        }

        // Play Sound
        if (options.sound && this.soundEnabled && !quietMode) {
            this._playSound(options.priority ? 'alert' : 'chime');
        }
    }

    _showToast(title: string, message: string) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;

        const titleEl = document.getElementById('toast-title');
        const msgEl = document.getElementById('toast-message');

        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;

        toast.classList.remove('hidden');

        // Auto hide after 5s
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 5000);
    }

    _showModal(title: string, message: string, options: any) {
        const overlay = document.getElementById('alert-modal');
        if (!overlay) return;

        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');

        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;

        overlay.classList.remove('hidden');

        // Bind buttons
        const dismissBtn = document.getElementById('btn-modal-dismiss');
        if (dismissBtn) dismissBtn.onclick = () => {
            overlay.classList.add('hidden');
        };

        const snoozeBtn = document.getElementById('btn-modal-snooze');
        if (snoozeBtn) {
            if (options.priority) {
                snoozeBtn.style.display = 'none'; // No snooze for Alerts? Or config based
            } else {
                snoozeBtn.style.display = 'inline-block';
                snoozeBtn.onclick = () => {
                    overlay.classList.add('hidden');
                    // TODO: Emit snooze event back to Policy
                };
            }
        }
    }

    _playSound(type: string) {
        // Try to play custom mp3
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;

        // Attempt to play; if it fails (e.g. file not found), fall back to synthetic beep
        audio.play().catch((e) => {
            console.warn("Custom sound failed/missing, using fallback beep:", e);
            this._playSyntheticBeep(type);
        });
    }

    _playSyntheticBeep(type: string) {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        if (type === 'alert') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
            gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.3);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
            gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.1);
        }
    }
}
