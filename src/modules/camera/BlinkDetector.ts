/**
 * Blink Detector V3 (Upgraded)
 * Deterministic blink detection with state machine, hysteresis, and incomplete blink detection
 */

import { calculateEAR } from './LandmarkProvider';
import { EyeLandmarks, BlinkResult, BlinkMetrics } from '../../types/camera';

enum BlinkState {
    OPEN = 'OPEN',
    CLOSING = 'CLOSING',
    CLOSED = 'CLOSED',
    OPENING = 'OPENING'
}

interface BlinkConfig {
    earThreshold: number;
    earCloseThreshold: number;
    earOpenThreshold: number;
    incompleteThreshold: number;
    minBlinkDuration: number;
    maxBlinkDuration: number;
    debounceTime: number;
    smoothingWindowSize: number;
}

const DEFAULT_CONFIG: BlinkConfig = {
    earThreshold: 0.2, // Blink confirmed when EAR < 0.2
    earCloseThreshold: 0.25, // Start CLOSING when EAR < 0.25
    earOpenThreshold: 0.28, // Return to OPEN when EAR > 0.28
    incompleteThreshold: 0.30, // Incomplete if (minOpen / baseline) > 0.30
    minBlinkDuration: 80, // ms
    maxBlinkDuration: 400, // ms
    debounceTime: 120, // ms
    smoothingWindowSize: 3 // frames
};

export class BlinkDetector {
    public config: BlinkConfig;
    private state: BlinkState;
    private blinkHistory: BlinkResult[];
    private opennessHistory: { left: number; right: number; timestamp: number }[];
    private smoothingWindow: number[];
    private monitoringStartTime: number;

    // Baseline openness
    private baselineOpenness: number;

    // Current blink tracking
    private currentBlinkStart: number;
    private currentBlinkMinOpenness: number;
    private lastBlinkTimestamp: number;

    // Calibration
    private isCalibrated: boolean;
    private calibrationSamples: number[];

    // Public metric
    public currentEAR: number = 0;

    constructor(config: Partial<BlinkConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.state = BlinkState.OPEN;
        this.blinkHistory = [];
        this.opennessHistory = [];
        this.smoothingWindow = [];
        this.monitoringStartTime = 0;

        this.baselineOpenness = 0.35;

        this.currentBlinkStart = 0;
        this.currentBlinkMinOpenness = 1.0;
        this.lastBlinkTimestamp = 0;

        this.isCalibrated = false;
        this.calibrationSamples = [];
    }

    reset() {
        this.state = BlinkState.OPEN;
        this.blinkHistory = [];
        this.opennessHistory = [];
        this.smoothingWindow = [];
        this.currentBlinkStart = 0;
        this.currentBlinkMinOpenness = 1.0;
        this.lastBlinkTimestamp = 0;
        this.isCalibrated = false;
        this.calibrationSamples = [];
        this.monitoringStartTime = Date.now();
    }

    /**
     * Process eye landmarks and detect blinks
     * Returns current eye openness for tracking
     */
    processFrame(eyeLandmarks: EyeLandmarks | null, timestamp: number) {
        if (!eyeLandmarks) {
            return null;
        }

        // Calculate EAR for both eyes
        const leftEAR = calculateEAR(eyeLandmarks.left);
        const rightEAR = calculateEAR(eyeLandmarks.right);

        // Average EAR
        const rawOpenness = (leftEAR + rightEAR) / 2;

        // Normalize to 0-1 range (Tracking purposes)
        const normalizedOpenness = Math.min(1, rawOpenness / 0.35);

        // Apply temporal smoothing
        const smoothedOpenness = this.smoothOpenness(normalizedOpenness);
        this.currentEAR = rawOpenness; // For UI visualization

        const eyeOpenness = {
            left: leftEAR / 0.35,
            right: rightEAR / 0.35,
            timestamp
        };

        this.opennessHistory.push(eyeOpenness);

        // Keep only last 60 seconds of history
        const sixtySecondsAgo = timestamp - 60000;
        this.opennessHistory = this.opennessHistory.filter((h) => h.timestamp > sixtySecondsAgo);

        // Calibrate baseline if needed
        if (!this.isCalibrated) {
            this.calibrateBaseline(smoothedOpenness);
        }

        // Run state machine
        this.updateStateMachine(smoothedOpenness, timestamp);

        return eyeOpenness;
    }

    /**
     * Smooth openness using median window
     */
    private smoothOpenness(openness: number): number {
        this.smoothingWindow.push(openness);

        if (this.smoothingWindow.length > this.config.smoothingWindowSize) {
            this.smoothingWindow.shift();
        }

        // Return median of window
        const sorted = [...this.smoothingWindow].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted[mid];
    }

    /**
     * Calibrate baseline openness from stable OPEN frames
     */
    private calibrateBaseline(openness: number) {
        // Collect samples when eyes appear open (openness > 0.5)
        if (openness > 0.5) {
            this.calibrationSamples.push(openness);
        }

        // After 30 samples, calculate baseline as median
        if (this.calibrationSamples.length >= 30) {
            const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            this.baselineOpenness = sorted[mid];
            this.isCalibrated = true;
            console.log('[BlinkDetector] Baseline calibrated:', this.baselineOpenness);
        }
    }

    /**
     * State machine for blink detection with hysteresis
     */
    private updateStateMachine(openness: number, timestamp: number) {
        const earValue = openness * 0.35; // Convert back to EAR scale approximation

        switch (this.state) {
            case BlinkState.OPEN:
                if (earValue < this.config.earCloseThreshold) {
                    this.state = BlinkState.CLOSING;
                    this.currentBlinkStart = timestamp;
                    this.currentBlinkMinOpenness = openness;
                }
                break;

            case BlinkState.CLOSING:
                // Track minimum openness
                if (openness < this.currentBlinkMinOpenness) {
                    this.currentBlinkMinOpenness = openness;
                }

                // Transition to CLOSED if below threshold
                if (earValue < this.config.earThreshold) {
                    this.state = BlinkState.CLOSED;
                }

                // Abort if eyes reopen without reaching CLOSED
                if (earValue > this.config.earOpenThreshold) {
                    this.state = BlinkState.OPEN;
                }
                break;

            case BlinkState.CLOSED:
                // Track minimum openness
                if (openness < this.currentBlinkMinOpenness) {
                    this.currentBlinkMinOpenness = openness;
                }

                // Transition to OPENING when eyes start to reopen
                if (earValue >= this.config.earThreshold) {
                    this.state = BlinkState.OPENING;
                }
                break;

            case BlinkState.OPENING:
                // Track minimum openness
                if (openness < this.currentBlinkMinOpenness) {
                    this.currentBlinkMinOpenness = openness;
                }

                // Complete blink when fully open
                if (earValue >= this.config.earOpenThreshold) {
                    this.completeBlink(timestamp);
                    this.state = BlinkState.OPEN;
                }
                break;
        }
    }

    /**
     * Complete a blink and validate it
     */
    private completeBlink(timestamp: number) {
        const duration = timestamp - this.currentBlinkStart;

        // Validate duration
        if (duration < this.config.minBlinkDuration || duration > this.config.maxBlinkDuration) {
            return;
        }

        // Debounce: ignore if too close to last blink
        if (timestamp - this.lastBlinkTimestamp < this.config.debounceTime) {
            return;
        }

        // Determine if incomplete
        const isComplete = (this.currentBlinkMinOpenness / this.baselineOpenness) <= this.config.incompleteThreshold;

        // Record blink
        const blinkEvent: BlinkResult = {
            timestamp,
            isComplete,
            minOpenness: this.currentBlinkMinOpenness,
            duration
        };

        this.blinkHistory.push(blinkEvent);
        this.lastBlinkTimestamp = timestamp;

        // Keep only last 60 seconds
        const sixtySecondsAgo = timestamp - 60000;
        this.blinkHistory = this.blinkHistory.filter((b) => b.timestamp > sixtySecondsAgo);
    }

    /**
     * Calculate blink metrics for a given duration
     */
    calculateMetrics(durationSeconds: number, avgFps: number = 30): BlinkMetrics {
        if (this.blinkHistory.length === 0) {
            return {
                blinkCount: 0,
                blinkRate: 0,
                incompleteBlinkCount: 0,
                incompleteBlinkRatio: 0,
                confidence: 0
            };
        }

        const blinkCount = this.blinkHistory.length;
        const incompleteBlinkCount = this.blinkHistory.filter((b) => !b.isComplete).length;

        // Blink rate: blinks per minute
        const minutes = durationSeconds / 60;
        const blinkRate = minutes > 0 ? blinkCount / minutes : 0;

        // Incomplete blink ratio
        const incompleteBlinkRatio = blinkCount > 0 ? incompleteBlinkCount / blinkCount : 0;

        // Confidence calculation
        let confidence = 1.0;

        // Reduce confidence if FPS is low
        if (avgFps < 20) confidence *= 0.7;
        else if (avgFps < 24) confidence *= 0.85;

        // Reduce confidence if not calibrated
        if (!this.isCalibrated) confidence *= 0.5;

        return {
            blinkCount,
            blinkRate: Math.round(blinkRate * 10) / 10,
            incompleteBlinkCount,
            incompleteBlinkRatio: Math.round(incompleteBlinkRatio * 100) / 100,
            confidence: Math.round(confidence * 100) / 100
        };
    }

    getMetrics() {
        // Use a fixed 10s window if мониторингStartTime not set
        const elapsed = this.monitoringStartTime > 0 ? (Date.now() - this.monitoringStartTime) / 1000 : 10;
        return {
            ...this.calculateMetrics(elapsed),
            currentEAR: this.currentEAR
        };
    }

    // Backwards compatibility getter for partial refactor
    getBlinkData() {
        const metrics = this.calculateMetrics(60);
        return {
            totalBlinks: this.blinkHistory.length,
            incompleteBlinks: this.blinkHistory.filter(b => !b.isComplete).length,
            blinkRate: metrics.blinkRate
        };
    }
}
