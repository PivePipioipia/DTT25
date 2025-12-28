import { EventEmitter } from '../utils/EventEmitter';
import { ContextDetector } from './ContextDetector';
import { ConsentManager } from './ConsentManager';
import { NotificationService } from '../pomodoro/NotificationService';
import { PolicyEngine } from '../pomodoro/PolicyEngine';
import { CameraController } from '../camera/CameraController';
import { PomodoroTimer } from '../pomodoro/PomodoroTimer';

interface CompanionDependencies {
    cameraController: CameraController;
    policyEngine: PolicyEngine;
    notificationService: NotificationService;
    consentManager: ConsentManager;
}

/**
 * WorkCompanion
 * The "Orchestrator" for Mode B: Work Support.
 */
export class WorkCompanion extends EventEmitter {
    camera: CameraController;
    policy: PolicyEngine;
    notifier: NotificationService;
    consent: ConsentManager;
    contextDetector: ContextDetector;
    timer: PomodoroTimer;

    state: string = 'IDLE';
    stats: {
        sessionCount: number;
        autoResets: number;
        violations: number;
        blinkRates: number[];
    };

    constructor(dependencies: CompanionDependencies) {
        super();
        this.camera = dependencies.cameraController;
        this.policy = dependencies.policyEngine;
        this.notifier = dependencies.notificationService;
        this.consent = dependencies.consentManager;

        this.contextDetector = new ContextDetector();

        // Initialize Pomodoro Timer
        this.timer = new PomodoroTimer(this.policy, this.notifier);
        this.timer.init();

        this.stats = {
            sessionCount: 0,
            autoResets: 0,
            violations: 0,
            blinkRates: []
        };

        this._setupEventListeners();
    }

    private _setupEventListeners() {
        // Listen to Timer Ticks for Pulse Sampling
        this.timer.on('camera_check_required', () => {
            if (this.consent.can('camera_usage')) {
                this._performPulseCheck();
            }
        });

        this.timer.on('update', (data: any) => {
            this.emit('tick', data);
        });

        this.timer.on('status_change', (data: any) => {
            this.state = data.status;
            this.emit('status_change', data);
        });
    }

    /**
     * Start/Resume a Work Session
     */
    async startSession() {
        if (!this.consent.can('notifications')) {
            console.warn('Notifications not allowed.');
        }

        this.timer.start();
        if (this.timer.status === 'BREAK') {
            this.state = 'BREAK';
        } else {
            this.state = 'WORKING';
            this._performPulseCheck(); // Immediate check
        }
        this.emit('session_started', {});
    }

    pauseSession() {
        this.timer.pause();
    }

    resetSession() {
        this.timer.resetToFull();
    }

    stopSession() {
        this.timer.stop();
        this.state = 'IDLE';
        this.emit('session_stopped', {});
    }

    /**
     * Pulse Check (3-5s Measurement)
     * Core smart feature: Mở cam chớp nhoáng -> Phân tích -> Tắt cam
     */
    private async _performPulseCheck() {
        // 1. Context Awareness: Skip if in Meeting/Deep Work
        const contextStatus = this.contextDetector.shouldSkipCheck();
        if (contextStatus.skip) {
            console.log(`[Companion] Skipping check: ${contextStatus.reason}`);
            return;
        }

        console.log('[Companion] Starting Pulse Check (3s)...');

        try {
            // 2. Silent Camera Start (hidden)
            await this.camera.start(undefined, true);

            // 3. Wait for 3 seconds to gather stable metrics
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 4. Analyze Results
            const snapshot = await this.camera.getSnapshotMetrics();

            // 5. STOP CAMERA IMMEDIATELY after capture
            await this.camera.stop();

            if (!snapshot || snapshot.distance === 0) {
                // AUTO-RESET LOGIC: No face detected? User probably walked away.
                this._handleUserAbsence();
                return;
            }

            // Emit update for UI
            this.emit('metrics_update', { distance: snapshot.distance });

            // Normal violation check
            const result = {
                estimatedDistanceCm: snapshot.distance,
                bucket: snapshot.distance < 45 ? 'NEAR' : 'OK'
            };

            const decision = this.policy.evaluateMidCheckResult(result);

            if (decision.action !== 'NONE') {
                this.stats.violations++;
                this.notifier.notify('DryEyeGuard Nhắc Nhở', decision.message || "Hãy điều chỉnh tư thế ngồi.", {
                    priority: decision.action === 'ALERT' || decision.action === 'WARNING',
                    sound: decision.sound,
                    modal: decision.modal
                });

                this.emit('nudge', { type: decision.action, message: decision.message });
            } else {
                console.log('[Companion] Pulse Check: OK. User is compliant.');
            }

        } catch (e) {
            console.error('[Companion] Pulse Check failed', e);
            await this.camera.stop(); // Ensure safety
        }
    }

    /**
     * Handle User Absence
     * Reset timers if person is not at the desk
     */
    private _handleUserAbsence() {
        console.log('[Companion] No user detected. Auto-resetting session timer.');
        this.stats.autoResets++;

        // Reset the timer as if the user just started (they effectively took a break)
        this.timer.resetToFull();

        this.notifier.notify('Tự động Reset', 'Hệ thống nhận thấy bạn đã rời máy tính. Thời gian nghỉ 20-20-20 đã được đăng ký!', {
            sound: false
        });

        this.emit('auto_reset', { reason: 'user_absent' });
    }

    setMode(modeId: string) {
        this.policy.setMode(modeId);
        this.timer.init(); // Refresh config from storage/mode
    }
}
