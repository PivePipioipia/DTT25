/**
 * ConsentManager
 * Handles user permissions and privacy settings.
 * Ensures the app only runs features the user has explicitly agreed to.
 */

export interface Consents {
    camera_usage: boolean;
    data_collection: boolean;
    notifications: boolean;
    health_profiling: boolean;
}

export class ConsentManager {
    consents: Consents;
    storageKey: string;

    constructor() {
        this.consents = {
            camera_usage: false,      // Allow camera stream processing
            data_collection: false,   // Allow sending aggregate stats to backend
            notifications: false,     // Allow popups/sounds
            health_profiling: false   // Allow combining survey + camera data for risk score
        };
        this.storageKey = 'dry_eye_app_consent';
        this.loadConsent();
    }

    loadConsent() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.consents = { ...this.consents, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Failed to load consents', e);
        }
    }

    saveConsent(newConsents: Partial<Consents>) {
        this.consents = { ...this.consents, ...newConsents };
        localStorage.setItem(this.storageKey, JSON.stringify(this.consents));
        console.log('Consents updated:', this.consents);
        return this.consents;
    }

    /**
     * Verify if a specific feature is allowed
     * @param {string} permissionKey 
     * @returns {boolean}
     */
    can(permissionKey: keyof Consents): boolean {
        return !!this.consents[permissionKey];
    }

    /**
     * Check if user has completed the initial setup (all essential decisions made)
     */
    isOnboarded() {
        // Simple check: has the user made a choice about Camera?
        // In real app, might want a specific 'onboarding_complete' flag.
        return localStorage.getItem(this.storageKey) !== null;
    }

    getRequestablePermissions() {
        return [
            {
                key: 'camera_usage',
                title: 'Camera Access',
                description: 'Used only for real-time eye analysis. Video is processed locally and never saved/sent.'
            },
            {
                key: 'notifications',
                title: 'Smart Break Reminders',
                description: 'Receive timely nudges based on your work habits.'
            },
            {
                key: 'data_collection',
                title: 'Improvement Data',
                description: 'Share anonymous usage statistics to help improve the AI model.'
            }
        ];
    }
}
