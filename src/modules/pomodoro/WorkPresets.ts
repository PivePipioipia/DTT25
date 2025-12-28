/**
 * Work Presets Configuration
 * Defines preset work modes for Work Companion
 */

export interface WorkPreset {
    id: string;
    name: string;
    icon: string;
    workDuration: number;  // in minutes
    breakDuration: number; // in minutes
    description: string;
    color: string;
}

export const WORK_PRESETS: WorkPreset[] = [
    {
        id: 'game',
        name: 'Game',
        icon: '🎮',
        workDuration: 30,
        breakDuration: 5,
        description: 'For gaming sessions with less frequent breaks',
        color: '#8b5cf6'
    },
    {
        id: 'office',
        name: 'Office',
        icon: '💼',
        workDuration: 25,
        breakDuration: 5,
        description: 'Standard Pomodoro for office work',
        color: '#3b82f6'
    },
    {
        id: 'reading',
        name: 'Reading',
        icon: '📖',
        workDuration: 20,
        breakDuration: 5,
        description: 'Shorter focus periods for reading',
        color: '#22c55e'
    },
    {
        id: 'movie',
        name: 'Movie',
        icon: '🎬',
        workDuration: 60,
        breakDuration: 10,
        description: 'Long sessions with extended breaks',
        color: '#ef4444'
    },
    {
        id: 'editing',
        name: 'Editing',
        icon: '✏️',
        workDuration: 25,
        breakDuration: 5,
        description: 'For design and editing work',
        color: '#f59e0b'
    },
    {
        id: 'custom',
        name: 'Custom',
        icon: '⚙️',
        workDuration: 25,
        breakDuration: 5,
        description: 'Use your custom settings',
        color: '#6b7280'
    }
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): WorkPreset | undefined {
    return WORK_PRESETS.find(p => p.id === id);
}

/**
 * Get default preset
 */
export function getDefaultPreset(): WorkPreset {
    return WORK_PRESETS.find(p => p.id === 'office') || WORK_PRESETS[0];
}
