/**
 * Camera Engine
 * Main controller for camera module integrating MediaPipe, blink detection,
 * distance estimation, and quality monitoring
 * 
 * REWRITTEN: New distance estimation pipeline integration
 */

import type {
    CameraEngineConfig,
    AssessmentResult,
    DistanceBurstResult,
    CalibrationResult,
    QualityFlags
} from './types'
import { QualityFlag as QF } from './types'
import { LandmarkProvider, extractEyeLandmarks } from './LandmarkProvider'
import { BlinkDetector } from './blink/BlinkDetector'
import { DistanceEstimator, DistanceResult } from './distance/DistanceEstimator'
import { QualityMonitor } from './quality/QualityMonitor'
import { CameraEventEmitter } from './events'
import { analyzePose } from './distance/pose'

const DEFAULT_CONFIG: CameraEngineConfig = {
    preferredResolution: { width: 1280, height: 720 },
    blinkDetector: {},
    distanceEstimator: {},
    qualityMonitor: {},
    mediapipeAssetsPath: undefined // Use CDN by default
}

export class CameraEngine {
    private config: CameraEngineConfig
    private eventEmitter: CameraEventEmitter

    // Camera state
    private stream: MediaStream | null = null
    private videoElement: HTMLVideoElement | null = null
    private isRunning: boolean = false

    // Processing
    private animationFrameId: number | null = null
    private lastFrameTime: number = 0

    // Modules
    private blinkDetector: BlinkDetector
    private distanceEstimator: DistanceEstimator
    private qualityMonitor: QualityMonitor

    // Metrics tracking
    private sessionStartTime: number = 0
    private frameCount: number = 0
    private metricsInterval: number | null = null

    // Debug State
    private lastDistanceResult: DistanceResult | null = null

    constructor(config: Partial<CameraEngineConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
        this.eventEmitter = new CameraEventEmitter()

        // Initialize modules
        this.blinkDetector = new BlinkDetector(this.config.blinkDetector)
        // New Distance Estimator (Parameterless constructor in new version)
        this.distanceEstimator = new DistanceEstimator()
        this.qualityMonitor = new QualityMonitor(this.config.qualityMonitor)
    }

    /**
     * Initialize camera engine
     */
    async init(assetsPath?: string): Promise<void> {
        try {
            console.log('[CameraEngine] Initializing...')

            // Initialize MediaPipe
            await LandmarkProvider.initialize({
                assetsPath: assetsPath || this.config.mediapipeAssetsPath,
                runningMode: 'VIDEO',
                numFaces: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            })

            this.eventEmitter.emit('camera:ready', undefined)
            console.log('[CameraEngine] Initialized successfully')
        } catch (error: any) {
            console.error('[CameraEngine] Initialization failed:', error)
            this.eventEmitter.emit('camera:error', { error, code: 'INIT_FAILED' })
            throw error
        }
    }

    /**
     * Start camera preview
     */
    async startPreview(videoElement: HTMLVideoElement): Promise<void> {
        if (this.stream) {
            console.warn('[CameraEngine] Preview already running')
            return
        }

        try {
            console.log('[CameraEngine] Starting camera preview...')

            this.videoElement = videoElement

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: this.config.preferredResolution.width },
                    height: { ideal: this.config.preferredResolution.height },
                    facingMode: 'user',
                    frameRate: { ideal: 30, min: 15 }
                },
                audio: false
            })

            // Attach to video element
            videoElement.srcObject = this.stream
            await videoElement.play()

            // Start processing loop
            this.isRunning = true
            this.processFrame()

            console.log('[CameraEngine] Camera preview started')
        } catch (error: any) {
            console.error('[CameraEngine] Failed to start preview:', error)
            this.eventEmitter.emit('camera:error', {
                error,
                code: error.name === 'NotAllowedError' ? 'PERMISSION_DENIED' : 'CAMERA_FAILED'
            })
            throw error
        }
    }

    /**
     * Stop camera preview
     */
    async stopPreview(): Promise<void> {
        console.log('[CameraEngine] Stopping camera preview...')

        this.isRunning = false

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }

        if (this.metricsInterval !== null) {
            clearInterval(this.metricsInterval)
            this.metricsInterval = null
        }

        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop())
            this.stream = null
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null
            this.videoElement = null
        }

        console.log('[CameraEngine] Camera preview stopped')
    }

    /**
     * Main frame processing loop
     */
    private processFrame = (): void => {
        if (!this.isRunning || !this.videoElement) {
            return
        }

        const timestamp = performance.now()

        this.processFrameData(timestamp).catch((error) => {
            console.error('[CameraEngine] Frame processing error:', error)
        })

        this.animationFrameId = requestAnimationFrame(this.processFrame)
    }

    /**
     * Process a single frame
     */
    private async processFrameData(timestamp: number): Promise<void> {
        if (!this.videoElement) return

        try {
            // 1. Detect Landmarks
            const result = await LandmarkProvider.detectLandmarks(this.videoElement, timestamp)

            // 2. Assess Quality (Brightness, Face Found)
            const quality = this.qualityMonitor.assessQuality(this.videoElement, result, timestamp)

            // 3. Emit Quality Updates
            if (this.frameCount % 30 === 0) {
                this.eventEmitter.emit('camera:quality', {
                    flags: quality.flags,
                    confidence: quality.confidence
                })
            }

            // 4. Process Features if Face Found
            if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {

                // Blink Detection
                const eyeLandmarks = extractEyeLandmarks(result, 0)
                this.blinkDetector.processFrame(eyeLandmarks, timestamp)

                // Distance Estimation
                const videoWidth = this.videoElement.videoWidth
                const landmarks = result.faceLandmarks[0]

                // V3 Estimation
                this.lastDistanceResult = this.distanceEstimator.estimate(videoWidth, landmarks)
            } else {
                // No face - reset last result or set to null
                this.lastDistanceResult = null
            }

            this.frameCount++
            this.lastFrameTime = timestamp

            // Emit frame metrics
            this.eventEmitter.emit('camera:metrics', {
                timestamp,
                fps: this.qualityMonitor.getAverageFPS(),
                distance: this.lastDistanceResult ? {
                    estimatedCm: this.lastDistanceResult.estCm,
                    bucket: this.lastDistanceResult.bucket,
                    confidence: this.lastDistanceResult.confidence
                } : undefined,
                quality: quality,
                landmarks: result && result.faceLandmarks && result.faceLandmarks.length > 0 ? {
                    landmarks: result.faceLandmarks[0]
                } : undefined
            })
        } catch (error) {
            console.error('[CameraEngine] Frame processing error:', error)
        }
    }

    /**
     * Strict Pixel-Space IOD Calculation
     * IOD = abs(xRight - xLeft) * videoWidth
     * Using Outer Eye Corners: Left(33) Right(263)
     */
    private calculatePixelIOD(landmarks: { x: number, y: number }[], videoWidth: number): number {
        if (!landmarks || landmarks.length < 264) return 0

        const leftEyeOuter = landmarks[33]
        const rightEyeOuter = landmarks[263]

        const dx = rightEyeOuter.x - leftEyeOuter.x
        const dy = rightEyeOuter.y - leftEyeOuter.y
        const iodNorm = Math.hypot(dx, dy)
        return iodNorm * videoWidth
    }

    /**
     * Run Calibration (New 10s Single Phase)
     */
    async runCalibration(options: { durationSec?: number } = {}): Promise<CalibrationResult> {
        const durationSec = options.durationSec || 10
        console.log(`[CameraEngine] Starting calibration V3 (${durationSec}s)...`)

        // Reset and Start V3 calibration
        this.distanceEstimator.resetCalibration()
        this.distanceEstimator.startCalibration()

        const startTime = Date.now()
        const endTime = startTime + durationSec * 1000

        while (Date.now() < endTime && this.videoElement && this.isRunning) {
            try {
                const timestamp = performance.now()
                const result = await LandmarkProvider.detectLandmarks(this.videoElement, timestamp)
                const remaining = Math.max(0, endTime - Date.now())
                const percent = 100 - (remaining / (durationSec * 1000) * 100)

                this.eventEmitter.emit('camera:calibrationProgress', { percent })

                if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
                    const landmarks = result.faceLandmarks[0]
                    const pose = analyzePose(landmarks)

                    // Calculate IOD for calibration (V3 does this internally or we pass IOD? Check V3 API)
                    // V3 processCalibrationFrame takes (iodPx, isStable).
                    // We need to calc iodPx here to pass it, OR update V3 to take landmarks.
                    // Current V3: processCalibrationFrame(iodPx: number, isStable: boolean)
                    // So we need calculatePixelIOD.
                    const videoWidth = this.videoElement.videoWidth
                    const iodPx = this.calculatePixelIOD(landmarks, videoWidth)

                    this.distanceEstimator.processCalibrationFrame(iodPx, pose.isStable)
                }

                await new Promise(r => setTimeout(r, 100))
            } catch (e) {
                console.error('Calibration error', e)
            }
        }

        if (!this.videoElement) throw new Error('Camera stopped')

        this.distanceEstimator.finalizeCalibration()
        const success = this.distanceEstimator.isCalibrated()
        const details = this.distanceEstimator.getCalibrationDetails()

        const result: CalibrationResult = {
            success,
            state: details || undefined,
            qualityDuringCalibration: { flags: [], confidence: 1 },
            error: success ? undefined : 'Not enough stable samples'
        }

        this.eventEmitter.emit('camera:calibrationComplete', result)
        return result
    }

    /**
     * Burst Check (Pomodoro)
     */
    async runDistanceBurst(options: { durationMs?: number } = {}): Promise<DistanceBurstResult> {
        const ms = options.durationMs || 1500

        if (!this.distanceEstimator.isCalibrated()) {
            return { bucket: 'UNKNOWN', confidence: 0, qualityFlags: { flags: [], confidence: 0 }, sampleCount: 0, duration: 0 }
        }

        // Ensure camera running
        const temporarilyStarted = !this.isRunning
        const tempVideo = this.videoElement || document.createElement('video')

        if (temporarilyStarted) {
            await this.startPreview(tempVideo)
        }

        // Burst Check Logic
        // We already have smoothed estimates in lastDistanceResult.
        // Just collect them over time.

        const start = Date.now()
        const end = start + ms
        const collectedCms: number[] = []

        while (Date.now() < end) {
            if (this.lastDistanceResult && this.lastDistanceResult.estCm > 0) {
                collectedCms.push(this.lastDistanceResult.estCm)
            }
            await new Promise(r => setTimeout(r, 100))
        }

        if (temporarilyStarted) await this.stopPreview()

        if (collectedCms.length === 0) {
            return { bucket: 'UNKNOWN', confidence: 0, qualityFlags: { flags: [], confidence: 0 }, sampleCount: 0, duration: ms }
        }

        collectedCms.sort((a, b) => a - b)
        const medianCm = collectedCms[Math.floor(collectedCms.length / 2)]

        // Determine bucket from median
        let bucket: 'NEAR' | 'OK' | 'FAR' | 'UNKNOWN' = 'OK'
        if (medianCm < 30) bucket = 'NEAR'
        else if (medianCm > 60) bucket = 'FAR'
        else bucket = 'OK'

        return {
            bucket,
            estimatedCm: medianCm,
            confidence: 0.9,
            qualityFlags: { flags: [], confidence: 0.9 },
            sampleCount: collectedCms.length,
            duration: ms
        }
    }

    // --- Exposed methods ---

    getDebugState() {
        if (!this.videoElement || !this.lastDistanceResult) return null

        return {
            iodPx: this.lastDistanceResult.debug.iodPx,
            k: this.lastDistanceResult.debug.k,
            estCm: this.lastDistanceResult.estCm,
            rawCm: this.lastDistanceResult.debug.rawCm,
            confidence: this.lastDistanceResult.confidence,
            flags: this.lastDistanceResult.debug.flags,
            streamSize: {
                width: this.videoElement.videoWidth,
                height: this.videoElement.videoHeight
            },
            pose: {
                stable: true, // Simplified
                yawProxy: 0
            }
        }
    }

    getEventEmitter() { return this.eventEmitter }
    isActive() { return this.isRunning }
    getVideoElement() { return this.videoElement }

    getBlinkMetrics() {
        return this.blinkDetector.getMetrics() // Assuming BlinkDetector has getMetrics
    }

    dispose() {
        this.stopPreview()
        this.eventEmitter.removeAllListeners()
    }

    async runCalibrationNear() { console.warn('Deprecated') }
    async runCalibrationFar() { console.warn('Deprecated') }

    // Preserved logic
    async runAssessmentSession(options: { durationSec?: number } = {}): Promise<AssessmentResult> {
        const durationSec = options.durationSec || 45
        console.log(`[CameraEngine] Starting ${durationSec}s assessment session...`)

        this.blinkDetector.reset()
        this.qualityMonitor.reset()

        this.sessionStartTime = Date.now()

        this.metricsInterval = window.setInterval(() => {
            const avgFps = this.qualityMonitor.getAverageFPS()
            this.eventEmitter.emit('camera:fpsUpdate', { fps: avgFps })
        }, 1000)

        // Wait for usage
        // Note: In real app, we likely want to allow external cancellation or non-blocking wait.
        // But for this simplified port which uses Promise, we wait.
        const end = Date.now() + durationSec * 1000
        while (Date.now() < end) {
            if (!this.isRunning) break // Abort if stopped
            await new Promise(r => setTimeout(r, 100))
        }

        if (this.metricsInterval !== null) {
            clearInterval(this.metricsInterval)
            this.metricsInterval = null
        }

        const actualDuration = (Date.now() - this.sessionStartTime) / 1000
        const avgFps = this.qualityMonitor.getAverageFPS()
        const blinkMetrics = this.blinkDetector.calculateMetrics(actualDuration, avgFps)

        // Create quality summary
        const qualityFlags: QualityFlags = {
            flags: avgFps < 20 ? [QF.LOW_FPS] : [],
            confidence: blinkMetrics.confidence
        }

        const result: AssessmentResult = {
            status: "OK",
            duration: actualDuration,
            blinkMetrics,
            qualityFlags,
            blinkHistory: this.blinkDetector.getBlinkHistory(),
            avgFps
        }

        this.eventEmitter.emit('camera:sessionComplete', result)
        return result
    }
}
