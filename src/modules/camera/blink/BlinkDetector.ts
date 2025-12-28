/**
 * Blink Detector
 * Deterministic blink detection with state machine, hysteresis, and incomplete blink detection
 * 
 * Features:
 * - State machine: OPEN → CLOSING → CLOSED → OPENING → OPEN
 * - EAR (Eye Aspect Ratio) calculation from MediaPipe landmarks
 * - Baseline calibration for incomplete blink detection
 * - Temporal smoothing (EMA/median) to reduce noise
 * - Debouncing to eliminate false positives
 * - Duration validation (80-400ms)
 * - Configurable thresholds
 */

import type { BlinkMetrics, BlinkEvent, EyeOpenness, BlinkDetectorConfig } from '../types'
import { calculateEAR } from '../LandmarkProvider'

enum BlinkState {
    OPEN = 'OPEN',
    CLOSING = 'CLOSING',
    CLOSED = 'CLOSED',
    OPENING = 'OPENING'
}

const DEFAULT_CONFIG: BlinkDetectorConfig = {
    earThreshold: 0.2, // Blink confirmed when EAR < 0.2
    earCloseThreshold: 0.25, // Start CLOSING when EAR < 0.25
    earOpenThreshold: 0.28, // Return to OPEN when EAR > 0.28
    incompleteThreshold: 0.30, // Incomplete if (minOpen / baseline) > 0.30
    minBlinkDuration: 80, // ms
    maxBlinkDuration: 400, // ms
    debounceTime: 120, // ms
    smoothingWindowSize: 3 // frames
}

export class BlinkDetector {
    private config: BlinkDetectorConfig
    private state: BlinkState = BlinkState.OPEN
    private blinkHistory: BlinkEvent[] = []
    private opennessHistory: EyeOpenness[] = []
    private smoothingWindow: number[] = []
    private monitoringStartTime: number = 0

    // Baseline openness (calculated from stable OPEN state frames)
    private baselineOpenness: number = 0.35 // Default, will be recalculated

    // Current blink tracking
    private currentBlinkStart: number = 0
    private currentBlinkMinOpenness: number = 1.0
    private lastBlinkTimestamp: number = 0

    // Calibration
    private isCalibrated: boolean = false
    private calibrationSamples: number[] = []

    constructor(config: Partial<BlinkDetectorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Process eye landmarks and detect blinks
     * Returns current eye openness for tracking
     */
    processFrame(
        eyeLandmarks: {
            leftEye: Array<{ x: number; y: number; z?: number }>
            rightEye: Array<{ x: number; y: number; z?: number }>
        } | null,
        timestamp: number
    ): EyeOpenness | null {
        if (!eyeLandmarks) {
            return null
        }

        // Calculate EAR for both eyes
        const leftEAR = calculateEAR(eyeLandmarks.leftEye)
        const rightEAR = calculateEAR(eyeLandmarks.rightEye)

        // Average EAR (normalized openness: 0 = closed, 1 = open)
        // EAR typically ranges from ~0.1 (closed) to ~0.35 (open)
        // Normalize to 0-1 range
        const rawOpenness = (leftEAR + rightEAR) / 2
        const normalizedOpenness = Math.min(1, rawOpenness / 0.35)

        // Apply temporal smoothing
        const smoothedOpenness = this.smoothOpenness(normalizedOpenness)

        const eyeOpenness: EyeOpenness = {
            left: leftEAR / 0.35,
            right: rightEAR / 0.35,
            timestamp
        }

        this.opennessHistory.push(eyeOpenness)

        // Keep only last 60 seconds of history
        const sixtySecondsAgo = timestamp - 60000
        this.opennessHistory = this.opennessHistory.filter((h) => h.timestamp > sixtySecondsAgo)

        // Calibrate baseline if needed
        if (!this.isCalibrated) {
            this.calibrateBaseline(smoothedOpenness)
        }

        // Run state machine
        this.updateStateMachine(smoothedOpenness, timestamp)

        return eyeOpenness
    }

    /**
     * Smooth openness using median window
     */
    private smoothOpenness(openness: number): number {
        this.smoothingWindow.push(openness)

        if (this.smoothingWindow.length > this.config.smoothingWindowSize) {
            this.smoothingWindow.shift()
        }

        // Return median of window
        const sorted = [...this.smoothingWindow].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted[mid]
    }

    /**
     * Calibrate baseline openness from stable OPEN frames
     */
    private calibrateBaseline(openness: number): void {
        // Collect samples when eyes appear open (openness > 0.5)
        if (openness > 0.5) {
            this.calibrationSamples.push(openness)
        }

        // After 30 samples, calculate baseline as median
        if (this.calibrationSamples.length >= 30) {
            const sorted = [...this.calibrationSamples].sort((a, b) => a - b)
            const mid = Math.floor(sorted.length / 2)
            this.baselineOpenness = sorted[mid]
            this.isCalibrated = true
            console.log('[BlinkDetector] Baseline calibrated:', this.baselineOpenness)
        }
    }

    /**
     * State machine for blink detection with hysteresis
     */
    private updateStateMachine(openness: number, timestamp: number): void {
        const earValue = openness * 0.35 // Convert back to EAR scale

        switch (this.state) {
            case BlinkState.OPEN:
                if (earValue < this.config.earCloseThreshold) {
                    this.state = BlinkState.CLOSING
                    this.currentBlinkStart = timestamp
                    this.currentBlinkMinOpenness = openness
                }
                break

            case BlinkState.CLOSING:
                // Track minimum openness
                if (openness < this.currentBlinkMinOpenness) {
                    this.currentBlinkMinOpenness = openness
                }

                // Transition to CLOSED if below threshold
                if (earValue < this.config.earThreshold) {
                    this.state = BlinkState.CLOSED
                }

                // Abort if eyes reopen without reaching CLOSED
                if (earValue > this.config.earOpenThreshold) {
                    this.state = BlinkState.OPEN
                }
                break

            case BlinkState.CLOSED:
                // Track minimum openness
                if (openness < this.currentBlinkMinOpenness) {
                    this.currentBlinkMinOpenness = openness
                }

                // Transition to OPENING when eyes start to reopen
                if (earValue >= this.config.earThreshold) {
                    this.state = BlinkState.OPENING
                }
                break

            case BlinkState.OPENING:
                // Track minimum openness
                if (openness < this.currentBlinkMinOpenness) {
                    this.currentBlinkMinOpenness = openness
                }

                // Complete blink when fully open
                if (earValue >= this.config.earOpenThreshold) {
                    this.completeBlink(timestamp)
                    this.state = BlinkState.OPEN
                }
                break
        }
    }

    /**
     * Complete a blink and validate it
     */
    private completeBlink(timestamp: number): void {
        const duration = timestamp - this.currentBlinkStart

        // Validate duration
        if (duration < this.config.minBlinkDuration || duration > this.config.maxBlinkDuration) {
            console.log('[BlinkDetector] Invalid blink duration:', duration)
            return
        }

        // Debounce: ignore if too close to last blink
        if (timestamp - this.lastBlinkTimestamp < this.config.debounceTime) {
            console.log('[BlinkDetector] Debounced blink')
            return
        }

        // Determine if incomplete
        const isComplete =
            this.currentBlinkMinOpenness / this.baselineOpenness <= this.config.incompleteThreshold

        // Record blink
        const blinkEvent: BlinkEvent = {
            timestamp,
            isComplete,
            minOpenness: this.currentBlinkMinOpenness,
            duration
        }

        this.blinkHistory.push(blinkEvent)
        this.lastBlinkTimestamp = timestamp

        console.log('[BlinkDetector] Blink detected:', {
            isComplete,
            duration,
            minOpenness: this.currentBlinkMinOpenness.toFixed(2),
            ratio: (this.currentBlinkMinOpenness / this.baselineOpenness).toFixed(2)
        })

        // Keep only last 60 seconds
        const sixtySecondsAgo = timestamp - 60000
        this.blinkHistory = this.blinkHistory.filter((b) => b.timestamp > sixtySecondsAgo)
    }

    /**
     * Calculate metrics for a given duration
     */
    calculateMetrics(durationSeconds: number, avgFps: number): BlinkMetrics {
        if (this.blinkHistory.length === 0) {
            return {
                blinkCount: 0,
                blinkRate: 0,
                incompleteBlinkCount: 0,
                incompleteBlinkRatio: 0,
                confidence: 0
            }
        }

        const blinkCount = this.blinkHistory.length
        const incompleteBlinkCount = this.blinkHistory.filter((b) => !b.isComplete).length

        // Blink rate: blinks per minute
        const minutes = durationSeconds / 60
        const blinkRate = minutes > 0 ? blinkCount / minutes : 0

        // Incomplete blink ratio
        const incompleteBlinkRatio = blinkCount > 0 ? incompleteBlinkCount / blinkCount : 0

        // Confidence calculation
        let confidence = 1.0

        // Reduce confidence if FPS is low
        if (avgFps < 20) {
            confidence *= 0.7
        } else if (avgFps < 24) {
            confidence *= 0.85
        }

        // Reduce confidence if not calibrated
        if (!this.isCalibrated) {
            confidence *= 0.5
        }

        // Reduce confidence for incomplete blink detection specifically if FPS < 30
        if (avgFps < 30) {
            // Incomplete blink detection needs high FPS to catch nadir
            confidence *= 0.8
        }

        return {
            blinkCount,
            blinkRate: Math.round(blinkRate * 10) / 10,
            incompleteBlinkCount,
            incompleteBlinkRatio: Math.round(incompleteBlinkRatio * 100) / 100,
            confidence: Math.round(confidence * 100) / 100
        }
    }

    /**
     * Get blink history
     */
    getBlinkHistory(): BlinkEvent[] {
        return [...this.blinkHistory]
    }

    /**
     * Reset detector state
     */
    reset(): void {
        this.state = BlinkState.OPEN
        this.blinkHistory = []
        this.opennessHistory = []
        this.smoothingWindow = []
        this.currentBlinkStart = 0
        this.currentBlinkMinOpenness = 1.0
        this.lastBlinkTimestamp = 0
        this.isCalibrated = false
        this.calibrationSamples = []
        this.monitoringStartTime = Date.now()
    }

    /**
     * Get real-time metrics
     */
    getMetrics(): BlinkMetrics {
        const now = Date.now()
        // Duration is either time since start or 60s window
        const durationMs = Math.max(1000, now - this.monitoringStartTime)
        const durationSec = Math.min(60, durationMs / 1000)

        return this.calculateMetrics(durationSec, 30)
    }

    /**
     * Check if calibrated
     */
    isReady(): boolean {
        return this.isCalibrated
    }
}
