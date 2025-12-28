
import { extractEyeLandmarks } from '../LandmarkProvider'

export interface DistanceResult {
    estCm: number
    confidence: number // 0-1
    bucket: 'NEAR' | 'OK' | 'FAR' | 'UNKNOWN'
    debug: {
        iodPx: number
        iodNorm: number
        k: number
        rawCm: number
        flags: string[]
    }
}

const STORAGE_KEY = 'distance_calibration_v3'
const DEFAULT_TARGET_CM = 45

export class DistanceEstimator {
    private calibrationK: number | null = null

    // Smoothing
    private lastSmoothedCm: number | null = null
    private readonly ALPHA = 0.2 // EMA factor

    // Calibration State
    private calibrationSamples: number[] = []
    private isCalibrating: boolean = false
    private calibrationStartTime: number = 0
    private readonly CALIBRATION_DURATION_MS = 10000

    constructor() {
        this.loadCalibration()
    }

    public loadCalibration() {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const val = parseFloat(stored)
            if (!isNaN(val) && val > 0) {
                this.calibrationK = val
                console.log(`[Distance] Calibration loaded: K=${this.calibrationK}`)
            }
        }
    }

    public resetCalibration() {
        this.calibrationK = null
        localStorage.removeItem(STORAGE_KEY)
        this.lastSmoothedCm = null
        console.log('[Distance] Calibration reset')
    }

    // --- Calibration Flow ---

    public startCalibration() {
        this.isCalibrating = true
        this.calibrationSamples = []
        this.calibrationStartTime = Date.now()
        console.log('[Distance] Started calibration (10s)...')
    }

    public processCalibrationFrame(iodPx: number, isStable: boolean) {
        if (!this.isCalibrating) return

        if (Date.now() - this.calibrationStartTime > this.CALIBRATION_DURATION_MS) {
            this.finalizeCalibration()
            return
        }

        if (iodPx > 0 && isStable) {
            this.calibrationSamples.push(iodPx)
        }
    }

    public finalizeCalibration() {
        this.isCalibrating = false
        if (this.calibrationSamples.length < 10) {
            console.warn('[Distance] Calibration failed: Not enough samples')
            return
        }

        // Median computing
        const sorted = [...this.calibrationSamples].sort((a, b) => a - b)
        const medianIodPx = sorted[Math.floor(sorted.length / 2)]

        // Calculate K
        // estCm = K / iodPx => K = estCm * iodPx
        this.calibrationK = DEFAULT_TARGET_CM * medianIodPx

        localStorage.setItem(STORAGE_KEY, this.calibrationK.toString())
        console.log(`[Distance] Calibration finished. MedianIOD=${medianIodPx.toFixed(1)}, K=${this.calibrationK.toFixed(0)}`)
    }

    public isCalibrated(): boolean {
        return this.calibrationK !== null
    }

    public getCalibrationDetails() {
        if (!this.calibrationK) return null
        return {
            targetCm: DEFAULT_TARGET_CM,
            iodPxCalib: this.calibrationK / DEFAULT_TARGET_CM,
            k: this.calibrationK,
            timestamp: Date.now(), // Approximation
            sampleCount: 10 // Approximation or track real count
        }
    }

    // --- Main Estimation ---

    public estimate(
        videoWidth: number,
        landmarks: { x: number, y: number }[]
    ): DistanceResult {
        // 1. Calculate IOD
        // Points: 33 (Left Outer), 263 (Right Outer)
        if (!landmarks || landmarks.length < 264) {
            return this.createUnknownResult(['NO_LANDMARKS'])
        }

        const left = landmarks[33]
        const right = landmarks[263]

        const iodNorm = Math.hypot(right.x - left.x, right.y - left.y)
        const iodPx = iodNorm * videoWidth;
        const flags: string[] = []

        // Use calibrated K or a sensible default (e.g. 8500 for modern wide-angle laptop cams)
        const effectiveK = this.calibrationK || 8500;

        if (!this.calibrationK) {
            flags.push('NOT_CALIBRATED')
        }

        // 2. Raw Estimate
        let rawCm = effectiveK / iodPx

        // 3. Smoothing (EMA)
        let smoothedCm = rawCm
        if (this.lastSmoothedCm !== null) {
            smoothedCm = this.ALPHA * rawCm + (1 - this.ALPHA) * this.lastSmoothedCm
        }
        this.lastSmoothedCm = smoothedCm

        // 4. Clamping & Reliability
        let confidence = 1.0
        if (smoothedCm < 15 || smoothedCm > 120) {
            confidence = 0.3
            flags.push('OUT_OF_RANGE')
        }

        // 5. Bucketing
        let bucket: 'NEAR' | 'OK' | 'FAR' | 'UNKNOWN' = 'OK'
        if (smoothedCm < 30) bucket = 'NEAR'
        else if (smoothedCm > 60) bucket = 'FAR'
        else bucket = 'OK'

        if (confidence < 0.5) bucket = 'UNKNOWN'

        return {
            estCm: Math.round(smoothedCm * 10) / 10,
            confidence,
            bucket,
            debug: {
                iodPx,
                iodNorm,
                k: effectiveK,
                rawCm,
                flags
            }
        }
    }

    private createUnknownResult(flags: string[], iodPx = 0, iodNorm = 0): DistanceResult {
        return {
            estCm: 0,
            confidence: 0,
            bucket: 'UNKNOWN',
            debug: {
                iodPx,
                iodNorm,
                k: this.calibrationK || 0,
                rawCm: 0,
                flags
            }
        }
    }
}
