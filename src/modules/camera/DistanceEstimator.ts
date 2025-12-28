/**
 * Distance Estimator V3 (Upgraded)
 * Pixel-Space IOD Model: Distance (cm) = K / IOD (px)
 */

import { NormalizedLandmark } from '../../types/camera';

export class DistanceEstimator {
    private calibration: any = null;
    private calibrationSamples: number[] = [];
    private cmHistory: number[] = [];

    constructor() {
        // Defaults until calibrated.
        // IOD at 50cm is approx 0.1 (Normalized)
        // K = 50 * 0.1 = 5.0
        this.calibration = {
            k: 5.0,
            targetCm: 50,
            isNormalized: true
        };
    }

    configure(config: any) {
        // Optional config update like loading saved calibration
        if (config && config.k) {
            this.calibration.k = config.k;
        }
    }

    /**
     * Add a sample potential calibration (iodPx or iodNorm)
     * Should be called during calibration phase
     */
    addCalibrationSample(iod: number) {
        if (iod > 0) {
            this.calibrationSamples.push(iod);
        }
    }

    /**
     * Finalize calibration
     */
    finalizeCalibration(targetCm: number = 50): boolean {
        if (this.calibrationSamples.length < 5) {
            console.warn("Not enough samples for calibration");
            return false;
        }

        // Median IOD
        const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const medianIOD = sorted[mid];

        // K = distance * iod
        const k = targetCm * medianIOD;

        this.calibration = {
            k,
            targetCm,
            iodMedian: medianIOD,
            isNormalized: true,
            timestamp: Date.now()
        };

        this.calibrationSamples = [];
        console.log('[DistanceEstimator] Calibrated K:', k);
        return true;
    }

    estimateDistance(landmarks: NormalizedLandmark[]) {
        if (!landmarks || landmarks.length < 478) {
            return { estimatedDistanceCm: 0, bucket: 'UNKNOWN', confidence: 0 };
        }

        // IOD = Distance between Left Eye Inner (33) and Right Eye Inner (263)
        const leftInner = landmarks[33];
        const rightInner = landmarks[263];

        if (!leftInner || !rightInner) {
            return { estimatedDistanceCm: 0, bucket: 'UNKNOWN', confidence: 0 };
        }

        // Euclidean distance (normalized)
        const dx = rightInner.x - leftInner.x;
        const dy = rightInner.y - leftInner.y;

        const iodNorm = Math.sqrt(dx * dx + dy * dy);

        if (iodNorm === 0) return { estimatedDistanceCm: 0, bucket: 'UNKNOWN', confidence: 0 };

        // D = K / IOD
        const k = (this.calibration && this.calibration.isNormalized) ? this.calibration.k : 5.0;

        let estimatedCm = k / iodNorm;

        // Start smoothing
        estimatedCm = this.smoothValue(estimatedCm);

        return {
            estimatedDistanceCm: estimatedCm,
            bucket: this.classifyBucket(estimatedCm),
            confidence: 0.8 // Placeholder
        };
    }

    private smoothValue(val: number): number {
        this.cmHistory.push(val);
        if (this.cmHistory.length > 5) this.cmHistory.shift();
        const sum = this.cmHistory.reduce((a, b) => a + b, 0);
        return sum / this.cmHistory.length;
    }

    classifyBucket(cm: number): 'NEAR' | 'FAR' | 'OK' | 'UNKNOWN' {
        if (cm < 40) return 'NEAR';
        if (cm > 75) return 'FAR';
        return 'OK';
    }

    getGuidance(bucket: string, confidence: number) {
        if (bucket === 'NEAR') return { status: 'WARNING', message: 'Too Close!' };
        if (bucket === 'FAR') return { status: 'WARNING', message: 'Too Far' };
        return { status: 'OK', message: 'Good Distance' };
    }

    // Legacy support
    getLastMeasurement() {
        if (this.cmHistory.length === 0) return null;
        const last = this.cmHistory[this.cmHistory.length - 1];
        return {
            estimatedDistanceCm: last,
            bucket: this.classifyBucket(last),
            confidence: 1
        };
    }
}
