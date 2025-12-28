/**
 * ContextDetector
 * Detects if the user is in a state where they should NOT be disturbed.
 * (Meeting, Deep Work, etc.)
 */
export class ContextDetector {
    isMeetingMode: boolean;

    constructor() {
        this.isMeetingMode = false; // Manual toggle for now
    }

    /**
     * Should we skip the check?
     * @returns {Object} { skip: boolean, reason: string }
     */
    shouldSkipCheck() {
        if (this.isMeetingMode) {
            return { skip: true, reason: 'Meeting Mode Active' };
        }

        // Future: Check CPU usage / Fullscreen status
        return { skip: false, reason: '' };
    }

    setMeetingMode(isActive: boolean) {
        this.isMeetingMode = isActive;
        console.log(`[Context] Meeting Mote set to: ${isActive}`);
    }
}
