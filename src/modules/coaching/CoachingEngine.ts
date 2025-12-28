export class CoachingEngine {
    content: any;

    constructor() {
        this.content = { // Inline content for simplicity, or import from JSON
            'medical_consult': { title: 'Medical Consult', text: 'Please see a doctor.' },
            '20-20-20_rule': { title: '20-20-20 Rule', text: 'Every 20 mins, look 20 feet away for 20 secs.' },
            'blink_exercises': { title: 'Blink Exercises', text: 'Squeeze eyes shut, then open wide.' },
            'full_blink_training': { title: 'Full Blink Training', text: 'Ensure your eyelids touch fully.' },
            'screen_distance_guide': { title: 'Screen Distance', text: 'Keep screen at arm\'s length.' },
            'posture_tips': { title: 'Posture Tips', text: 'Sit straight, feet flat on floor.' }
        };
    }

    /**
     * Generate coaching cards
     * @param {string} severity - 'mild', 'moderate', 'severe'
     * @param {Object} metrics - { blinkRate, incompleteRatio, distanceBucket }
     * @returns {Array} List of card objects
     */
    generateCards(severity: string, metrics: { blinkRate: number, incompleteRatio: number, distanceBucket: string }) {
        const cardKeys = new Set<string>(); // Use Set to avoid duplicates

        // 1. Severity-based rules
        if (severity === 'severe') {
            cardKeys.add('medical_consult');
        }

        // 2. Metric-based rules
        // Blink Rate < 10/min
        if (metrics.blinkRate < 10) {
            cardKeys.add('20-20-20_rule');
            cardKeys.add('blink_exercises');
        }

        // Incomplete Blinks > 40%
        if (metrics.incompleteRatio > 40) {
            cardKeys.add('full_blink_training');
        }

        // Distance bad
        if (metrics.distanceBucket === 'NEAR' || metrics.distanceBucket === 'FAR') {
            cardKeys.add('screen_distance_guide');
        }

        // 3. Defaults
        cardKeys.add('posture_tips');

        // Map keys to full content content
        return Array.from(cardKeys)
            .map(key => this.content[key])
            .filter(card => card !== undefined); // Filter out missing content
    }
}
