/**
 * EscalationManager
 * Manages the "Annoyance Level" of the system based on user compliance.
 * Levels: 0 (Normal), 1 (Nudge), 2 (Toast), 3 (Sound), 4 (Modal)
 */

export interface InterventionResult {
    level: number;
    actionType: 'NONE' | 'MICRO_NUDGE' | 'TOAST' | 'WARNING' | 'ALERT';
    sound?: boolean;
    modal?: boolean;
}

export class EscalationManager {
    currentLevel: number;
    consecutiveViolations: number;
    lastComplianceTime: number;
    config: {
        resetTimeMs: number;
        maxLevel: number;
    };

    constructor() {
        this.currentLevel = 0;
        this.consecutiveViolations = 0;
        this.lastComplianceTime = Date.now();
        this.config = {
            resetTimeMs: 10 * 60 * 1000, // 10 mins of good behavior resets level
            maxLevel: 4
        };
    }

    /**
     * Evaluate the result of a check
     * @param {boolean} isViolation - True if user is sitting poorly
     * @returns {InterventionResult} { level, actionType }
     */
    evaluate(isViolation: boolean): InterventionResult {
        const now = Date.now();

        if (!isViolation) {
            // Good behavior!
            this.lastComplianceTime = now;

            // If they have been good for a while, reset escalation
            if (this.currentLevel > 0) {
                // We don't drop level immediately, but we stop escalating.
                // Real reset happens if they stay good for X mins (handled in checkReset)
                this.checkReset(now);
            }
            // Reset consecutive counter immediately on good behavior
            this.consecutiveViolations = 0;

            return { level: 0, actionType: 'NONE' };
        }

        // Bad behavior detected
        this.consecutiveViolations++;

        // Logarithmically or Sequentially increase level?
        // Simple Logic: Every 2 consecutive violations -> Level UP
        if (this.consecutiveViolations >= 2) {
            // 2 bad checks in a row? escalate.
            if (this.currentLevel < this.config.maxLevel) {
                this.currentLevel++;
            }
        } else if (this.currentLevel === 0) {
            // First violation
            this.currentLevel = 1;
        }

        return this.getIntervention(this.currentLevel);
    }

    checkReset(now: number) {
        if (now - this.lastComplianceTime > this.config.resetTimeMs) {
            this.currentLevel = 0;
            this.consecutiveViolations = 0;
            console.log("[Escalation] Reset to Level 0 due to sustained compliance.");
        }
    }

    getIntervention(level: number): InterventionResult {
        switch (level) {
            case 1:
                return { level: 1, actionType: 'MICRO_NUDGE', sound: false, modal: false };
            case 2:
                return { level: 2, actionType: 'TOAST', sound: false, modal: false };
            case 3:
                return { level: 3, actionType: 'WARNING', sound: true, modal: false };
            case 4:
                return { level: 4, actionType: 'ALERT', sound: true, modal: true };
            default:
                return { level: 0, actionType: 'NONE' };
        }
    }

    reset() {
        this.currentLevel = 0;
        this.consecutiveViolations = 0;
    }
}
