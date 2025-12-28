// @ts-ignore
import { WORK_MODES, DEFAULT_MODE } from '../core/WorkConfiguration.js';
import { EscalationManager } from '../core/EscalationManager.js';

export class PolicyEngine {
    currentMode: any;
    escalationManager: EscalationManager;
    sessionStats: { checks: number; violations: number; };
    nextCheckInterval: number;

    constructor() {
        this.currentMode = DEFAULT_MODE;
        this.escalationManager = new EscalationManager();
        this.sessionStats = {
            checks: 0,
            violations: 0
        };
        this.nextCheckInterval = this.currentMode.checkIntervalSec;
    }

    setMode(modeId: string) {
        // @ts-ignore
        const mode = Object.values(WORK_MODES).find((m: any) => m.id === modeId);
        if (mode) {
            this.currentMode = mode;
            this.nextCheckInterval = mode.checkIntervalSec;
            console.log(`[Policy] Switched to mode: ${mode.label}`);
        }
    }

    /**
     * Determines if a mid-session check should occur.
     * Supports Adaptive Frequency.
     */
    shouldTriggerMidCheck(elapsedSec: number, totalDurationSec: number, lastCheckTimeSec: number) {
        // If Deep Focus mode is active, only check very rarely
        // But here we rely on the interval set in config.

        let interval = this.nextCheckInterval;

        // ADAPTIVE LOGIC: If compliance is high, extend interval
        if (this.currentMode.adaptive) {
            const compliance = this._calculateCompliance();
            if (compliance > 0.9 && this.sessionStats.checks > 3) {
                interval = interval * 1.5; // Extend by 50%
            } else if (compliance < 0.5 && this.sessionStats.checks > 3) {
                interval = interval * 0.5; // Shorten to catch bad habits
            }
        }

        // Clamp interval (min 5 mins, max 40 mins)
        interval = Math.min(Math.max(300, interval), 2400);

        // Check if enough time passed since last check
        const timeSinceLast = elapsedSec - (lastCheckTimeSec || 0);
        return timeSinceLast >= interval;
    }

    /**
     * Decisions based on Camera Result
     */
    evaluateMidCheckResult(cameraResult: any) {
        this.sessionStats.checks++;

        const isViolation = cameraResult.bucket === 'NEAR';
        if (isViolation) this.sessionStats.violations++;

        // 1. Silent Success Rule
        if (!isViolation && this.currentMode.silentSuccess) {
            this.escalationManager.evaluate(false); // Log good behavior
            return { action: 'NONE', message: '' };
        }

        // 2. Escalation Logic
        const intervention = this.escalationManager.evaluate(isViolation);

        if (intervention.actionType === 'NONE') return { action: 'NONE' };

        // Construct Message (Vietnamese)
        let message = "Khoảng cách chưa chuẩn, hãy xem lại tư thế.";
        if (cameraResult.estimatedDistanceCm < 40) message = "Bạn đang ngồi quá gần! Hãy lùi lại để bảo vệ mắt.";

        return {
            action: intervention.actionType, // MICRO_NUDGE, TOAST, WARNING, ALERT
            message: message,
            sound: intervention.sound,
            modal: intervention.modal,
            level: intervention.level
        };
    }

    evaluateBreakStart(sessionStats: any) {
        // End of session break advice
        let msg = "Hãy nhắm mắt thư giãn theo quy tắc 20-20-20.";
        if (sessionStats.blinkRate < 10) {
            msg = "Mắt bạn có vẻ rất khô. Hãy chớp mắt liên tục 10 lần ngay nhé!";
        }

        return {
            action: 'NOTIFY',
            message: msg,
            sound: !this.currentMode.silentMode
        };
    }

    _calculateCompliance() {
        if (this.sessionStats.checks === 0) return 1.0;
        return 1.0 - (this.sessionStats.violations / this.sessionStats.checks);
    }
}
