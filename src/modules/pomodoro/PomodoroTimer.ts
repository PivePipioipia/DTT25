
import { PolicyEngine } from './PolicyEngine';
import { NotificationService } from './NotificationService';

export class PomodoroTimer {
    policy: PolicyEngine;
    notifications: NotificationService;
    config: any;
    STATE: any;
    status: string;
    remainingSec: number;
    completedSessions: number;
    timerInterval: any;
    listeners: Record<string, Function[]>;
    sessionStartTime: number;
    lastCheckTime: number;
    currentTotalSec: number;

    constructor(policyEngine: PolicyEngine, notificationService: NotificationService) {
        this.policy = policyEngine || new PolicyEngine();
        this.notifications = notificationService || new NotificationService();

        // Configuration
        this.config = {
            workDurationSec: 25 * 60, // Default 25m
            breakDurationSec: 5 * 60, // Default 5m
            longBreakDurationSec: 15 * 60,
            sessionsBeforeLongBreak: 4
        };

        // State using simple object instead of enum for JS
        this.STATE = {
            IDLE: 'IDLE',
            WORK: 'WORK',
            BREAK: 'BREAK'
        };

        this.status = this.STATE.IDLE;
        this.remainingSec = this.config.workDurationSec;
        this.completedSessions = 0;

        this.timerInterval = null;
        this.listeners = {};

        // Tracking for Policies
        this.sessionStartTime = 0;
        this.lastCheckTime = 0;
        this.currentTotalSec = 25 * 60;
    }

    init() {
        // Load config from local storage if available
        const savedWork = localStorage.getItem('work_duration');
        if (savedWork) {
            this.config.workDurationSec = parseInt(savedWork) * 60;
        }

        const savedBreak = localStorage.getItem('break_duration');
        if (savedBreak) {
            this.config.breakDurationSec = parseInt(savedBreak) * 60;
        }

        if (this.status === this.STATE.IDLE) {
            this.remainingSec = this.config.workDurationSec;
            this.currentTotalSec = this.config.workDurationSec;
        }

        this._emit('update', {
            time: this.formatTime(this.remainingSec),
            status: this.status,
            remainingSec: this.remainingSec,
            totalSec: this.currentTotalSec
        });
    }

    start() {
        if (this.status === this.STATE.IDLE) {
            this._startSession(this.STATE.WORK);
        } else {
            // Resume
            this._runTimer();
        }
    }

    pause() {
        this._stopTimer();
        this._emit('status_change', { status: 'PAUSED' });
    }

    stop() {
        this._stopTimer();
        this.status = this.STATE.IDLE;
        this.remainingSec = this.config.workDurationSec;
        this.currentTotalSec = this.config.workDurationSec;
        this._emit('update', {
            time: this.formatTime(this.remainingSec),
            status: this.status,
            remainingSec: this.remainingSec,
            totalSec: this.currentTotalSec
        });
        this._emit('status_change', { status: this.status });
    }

    resetToFull() {
        if (this.status === this.STATE.BREAK) {
            // Check if it was a long break
            const isLong = this.completedSessions > 0 && this.completedSessions % this.config.sessionsBeforeLongBreak === 0;
            this.remainingSec = isLong ? this.config.longBreakDurationSec : this.config.breakDurationSec;
        } else {
            this.remainingSec = this.config.workDurationSec;
        }

        this.currentTotalSec = this.remainingSec;
        this.lastCheckTime = 0;

        this._emit('update', {
            time: this.formatTime(this.remainingSec),
            status: this.status,
            remainingSec: this.remainingSec,
            totalSec: this.currentTotalSec
        });
    }

    setConfig(workInfo: any) {
        if (workInfo.duration) {
            this.config.workDurationSec = workInfo.duration * 60;
            if (this.status === this.STATE.IDLE) {
                this.remainingSec = this.config.workDurationSec;
                this._emit('update', { time: this.formatTime(this.remainingSec), status: this.status });
            }
        }
    }

    _startSession(type: string) {
        this.status = type;
        this.sessionStartTime = Date.now() / 1000;
        this.lastCheckTime = 0;

        if (type === this.STATE.WORK) {
            this.remainingSec = this.config.workDurationSec;
            this.notifications.notify("Bắt đầu làm việc", "Thời gian tập trung! Chế độ giám sát thông minh đã kích hoạt.");
        } else {
            // Break logic
            const isLong = this.completedSessions > 0 && this.completedSessions % this.config.sessionsBeforeLongBreak === 0;
            this.remainingSec = isLong ? this.config.longBreakDurationSec : this.config.breakDurationSec;
            this.currentTotalSec = this.remainingSec;
            this.notifications.notify("Giờ nghỉ giải lao", "Hãy để mắt nghỉ ngơi. Hệ thống tạm dừng giám sát.");
        }

        this._runTimer();
        this._emit('status_change', { status: this.status });
    }

    _runTimer() {
        this._stopTimer();
        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
    }

    _stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    tick() {
        this.remainingSec--;

        // 1. Update UI
        this._emit('update', {
            time: this.formatTime(this.remainingSec),
            status: this.status,
            remainingSec: this.remainingSec,
            totalSec: this.currentTotalSec
        });

        // 2. Logic Check (Only during WORK)
        if (this.status === this.STATE.WORK) {
            const elapsed = (Date.now() / 1000) - this.sessionStartTime;

            // Ask Policy Engine if we need a camera check
            if (this.policy.shouldTriggerMidCheck(elapsed, this.config.workDurationSec, this.lastCheckTime)) {
                this.lastCheckTime = elapsed;
                this._emit('camera_check_required', {});
            }
        }

        // 3. Time's Up
        if (this.remainingSec <= 0) {
            this._handleSessionComplete();
        }
    }

    _handleSessionComplete() {
        this._stopTimer();

        if (this.status === this.STATE.WORK) {
            this.completedSessions++;
            this.notifications.notify("Hoàn thành phiên", "Làm tốt lắm! Đã đến lúc cho mắt nghỉ ngơi.", { sound: true });

            // Auto-start break or wait for user? Let's auto-switch to break View but wait for start?
            // For now, let's just switch status to Break and wait for user to click "Start Break" or auto-start.
            // Simple approach: Auto start break
            this._startSession(this.STATE.BREAK);

        } else {
            // Break done
            this.notifications.notify("Hết giờ nghỉ", "Bạn đã sẵn sàng quay lại làm việc chưa?", { sound: true });
            this.status = this.STATE.IDLE; // Reset to IDLE waiting for user to start work
            this.remainingSec = this.config.workDurationSec;
            this._emit('update', { time: this.formatTime(this.remainingSec), status: this.status });
            this._emit('status_change', { status: this.status });
        }
    }

    // --- Events ---
    on(event: string, callback: Function) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    _emit(event: string, data: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    formatTime(seconds: number) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
}
