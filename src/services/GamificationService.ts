/**
 * Gamification Service
 * Handles Streaks, Badges, and Rewards
 */

import { db } from './DatabaseService';
import { Achievement } from '../types/db';
import confetti from 'canvas-confetti';

const BADGES: Achievement[] = [
    { id: 'first_step', name: 'First Step', description: 'Complete your first eye checkup', icon: '🥉' },
    { id: 'eagle_eye', name: 'Eagle Eye', description: 'Achieve perfect blink rate (>15 bpm)', icon: '🦅' },
    { id: 'consistency_3', name: 'On Fire', description: 'Reach a 3-day streak', icon: '🔥' },
    { id: 'zen_master', name: 'Zen Master', description: 'Report low stress levels', icon: '🧘' },
    { id: 'night_owl', name: 'Night Owl Awareness', description: 'Complete a checkup late at night', icon: '🦉' }
];

export class GamificationService {

    constructor() {
        this.initBadges();
        this.checkStreak();
    }

    async initBadges() {
        // Ensure all defined badges exist in DB (locked state)
        const existing = await db.achievements.toArray();
        const existingIds = new Set(existing.map(b => b.id));

        const toAdd = BADGES.filter(b => !existingIds.has(b.id));
        if (toAdd.length > 0) {
            await db.achievements.bulkAdd(toAdd);
        }
    }

    async checkStreak() {
        const today = new Date().toISOString().split('T')[0];

        // simple streak logic: based on dailyStats
        // In a real app, we'd check previous day.
        // Here we just count how many contiguous days exist in dailyStats going back from today.
        // Efficient way: just keep a 'streak' record.

        const lastStreak = await db.userProgress.get('streak');
        const lastDate = await db.userProgress.get('last_active_date');

        let currentStreak = lastStreak ? lastStreak.value : 0;
        let lastActive = lastDate ? lastDate.lastUpdated : ''; // Re-using lastUpdated field as string value storage is hacky, let's just query dailyStats

        // Alternative: Just query DailyStats
        const stats = await db.dailyStats.orderBy('date').reverse().limit(10).toArray();
        if (stats.length === 0) return 0;

        // Calc Logic ... simplified for demo
        // If today or yesterday is present, keep streak alive.
    }

    async handleCheckupCompletion(result: any) {
        // 1. Check First Step
        await this.unlockIf('first_step', true);

        // 2. Eagle Eye
        if (result.blinkRate > 15) {
            await this.unlockIf('eagle_eye', true);
        }

        // 3. Zen Master
        // Need to check survey answers. simplified:
        if (result.riskScore < 30) {
            await this.unlockIf('zen_master', true);
        }

        // Trigger Confetti if Risk is Low/Normal
        if (result.severity !== 'high') {
            this.triggerConfetti();
        }
    }

    async unlockIf(badgeId: string, condition: boolean) {
        if (!condition) return;

        const badge = await db.achievements.get(badgeId);
        if (badge && !badge.unlockedAt) {
            // Unlock!
            await db.achievements.update(badgeId, { unlockedAt: Date.now() });
            this.showToast(`🏆 Badge Unlocked: ${badge.name}!`);
            this.triggerConfetti();
        }
    }

    triggerConfetti() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    showToast(msg: string) {
        // Simple DOM Toast
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.background = '#333';
        div.style.color = '#fff';
        div.style.padding = '12px 24px';
        div.style.borderRadius = '8px';
        div.style.zIndex = '9999';
        div.innerText = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }

    async getAllBadges() {
        return await db.achievements.toArray();
    }
}
