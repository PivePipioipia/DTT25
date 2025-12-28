/**
 * Database Schema Types
 */

export interface CheckupRecord {
    id?: number; // Auto-increment
    timestamp: number;

    // Results
    riskScore: number;
    severity: 'low' | 'moderate' | 'high';

    // Details
    surveyScore: number;
    cameraScore: number;

    // Raw metrics snapshot
    blinkRate: number;
    blinkCount: number;
    incompleteBlinkCount: number;
    incompleteBlinkRatio: number;
}

export interface DailyStats {
    date: string; // YYYY-MM-DD
    totalSessions: number;
    totalFocusTimeMs: number;
    totalBlinks: number;
    averageBlinkRate: number;
}

export interface Achievement {
    id: string; // e.g. 'first_checkup'
    name: string;
    description: string;
    icon: string; // emoji
    unlockedAt?: number; // timestamp
    condition?: string; // description of how to unlock
}

export interface UserProgress {
    key: 'streak' | 'xp';
    value: number;
    lastUpdated: string; // YYYY-MM-DD
}

export interface WorkSession {
    id?: number;
    startTime: number;
    endTime?: number;
    durationMinutes: number;
    mode: string;
    complianceScore: number;
    autoResets: number;
    violationCount: number;
}
