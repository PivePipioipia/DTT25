/**
 * Database Service using Dexie.js
 * Handles persistent storage for checkups and stats
 */

import Dexie, { Table } from 'dexie';
import { CheckupRecord, DailyStats, Achievement, UserProgress } from '../types/db';

export class DryEyeDatabase extends Dexie {
    checkups!: Table<CheckupRecord, number>;
    dailyStats!: Table<DailyStats, string>;
    achievements!: Table<Achievement, string>;
    userProgress!: Table<UserProgress, string>;
    workSessions!: Table<any, number>;

    constructor() {
        super('DryEyeGuardDB');

        // Define Schema
        this.version(3).stores({
            checkups: '++id, timestamp, severity',
            dailyStats: 'date',
            achievements: 'id',
            userProgress: 'key',
            workSessions: '++id, startTime, mode'
        });
    }
}

export const db = new DryEyeDatabase();

/**
 * Service Wrapper
 */
export class DatabaseService {
    async saveCheckup(record: CheckupRecord) {
        return await db.checkups.add(record);
    }

    async getHistory() {
        return await db.checkups.orderBy('timestamp').reverse().limit(20).toArray();
    }

    async saveWorkSession(session: any) {
        return await db.workSessions.add(session);
    }

    async updateDailyStats(focusTimeMs: number, blinks: number, durationMinutes: number) {
        const today = new Date().toISOString().split('T')[0];

        await db.transaction('rw', db.dailyStats, async () => {
            const current = await db.dailyStats.get(today);

            if (!current) {
                // New day
                await db.dailyStats.add({
                    date: today,
                    totalSessions: 1,
                    totalFocusTimeMs: focusTimeMs,
                    totalBlinks: blinks,
                    averageBlinkRate: (blinks / durationMinutes) || 0
                });
            } else {
                // Update existing
                const newTotalBlinks = current.totalBlinks + blinks;
                const newTotalTime = current.totalFocusTimeMs + focusTimeMs;
                const totalMinutes = newTotalTime / 60000;

                await db.dailyStats.update(today, {
                    totalSessions: current.totalSessions + 1,
                    totalFocusTimeMs: newTotalTime,
                    totalBlinks: newTotalBlinks,
                    averageBlinkRate: (newTotalBlinks / totalMinutes) || 0
                });
            }
        });
    }

    async resetData() {
        await db.transaction('rw', db.checkups, db.dailyStats, db.achievements, db.userProgress, async () => {
            await db.checkups.clear();
            await db.dailyStats.clear();
            await db.achievements.clear();
            await db.userProgress.clear();
        });
        console.log("Database cleared.");
    }
}
