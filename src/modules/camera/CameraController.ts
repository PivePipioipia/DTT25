/**
 * Main Camera Controller (Adapter)
 * Adapts the new CameraEngine to the interface expected by DiagnosticFlow
 */

import { CameraEngine } from './CameraEngine'
import { EyeMetrics } from '../../types/camera'
import { FaceMeshDrawer } from './FaceMeshDrawer'

export class CameraController {
    private engine: CameraEngine
    private isInitialized = false
    private meshDrawer: FaceMeshDrawer

    constructor() {
        this.engine = new CameraEngine()
        this.meshDrawer = new FaceMeshDrawer()
    }

    async initialize() {
        if (this.isInitialized) return
        await this.engine.init()
        this.isInitialized = true
    }

    /**
     * Get snapshot metrics for other consumers (e.g. main.ts)
     */
    getSnapshotMetrics() {
        const blinkMetrics = this.engine.getBlinkMetrics()
        const debugState = this.engine.getDebugState()

        return {
            distance: debugState?.estCm || 0,
            ear: blinkMetrics.currentEAR || 0,
            blinkRate: blinkMetrics.blinkRate || 0,
            blinkCount: blinkMetrics.blinkCount || 0,
            incompleteBlinkCount: blinkMetrics.incompleteBlinkCount || 0
        }
    }

    /**
     * Measure session (diagnostic flow interface)
     */
    async measureSession(durationSec: number, onProgress: (progress: number, guidance: any) => void): Promise<EyeMetrics> {
        if (!this.isInitialized) await this.initialize()

        // 1. Find video element
        const videoElement = document.getElementById('assessment-video') as HTMLVideoElement
        if (!videoElement) {
            throw new Error('Video element #assessment-video not found')
        }

        const canvas = document.getElementById('assessment-canvas') as HTMLCanvasElement
        if (canvas) {
            this.meshDrawer.setCanvas(canvas)
            canvas.width = videoElement.videoWidth || 1280
            canvas.height = videoElement.videoHeight || 720
        }

        // 2. Start Preview
        if (!this.engine.isActive()) {
            await this.engine.startPreview(videoElement)
        }

        // 3. Setup progress listener
        const cleanupListener = this.engine.getEventEmitter().on('camera:metrics', (metrics) => {
            if (metrics.landmarks && canvas) {
                // Ensure canvas matches video size if changed
                if (videoElement.videoWidth && (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight)) {
                    canvas.width = videoElement.videoWidth
                    canvas.height = videoElement.videoHeight
                    this.meshDrawer.setCanvas(canvas)
                }
                // @ts-ignore
                this.meshDrawer.draw(metrics.landmarks.landmarks)
            } else if (canvas) {
                const ctx = canvas.getContext('2d')
                ctx?.clearRect(0, 0, canvas.width, canvas.height)
            }
        })

        // 4. Run Session
        const startTime = Date.now()
        const interval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000
            const progress = Math.min(100, (elapsed / durationSec) * 100)

            const blinkMetrics = this.engine.getBlinkMetrics()
            const debugState = this.engine.getDebugState()

            onProgress(progress, {
                distance: debugState?.estCm || 0,
                blinkCount: blinkMetrics.blinkCount,
                incompleteBlinkCount: blinkMetrics.incompleteBlinkCount || 0,
                blinkRate: blinkMetrics.blinkRate || 0,
                ear: blinkMetrics.currentEAR || 0,
                landmarks: null
            })
        }, 100)

        try {
            const result = await this.engine.runAssessmentSession({ durationSec })

            // Map result to EyeMetrics
            if (result.status === "OK") {
                return {
                    blinkCount: result.blinkMetrics.blinkCount,
                    blinkRate: result.blinkMetrics.blinkRate,
                    incompleteBlinkCount: result.blinkMetrics.incompleteBlinkCount,
                    incompleteBlinkRatio: result.blinkMetrics.incompleteBlinkRatio,
                    confidence: result.qualityFlags.confidence
                } as any
            } else {
                return {
                    blinkCount: 0,
                    blinkRate: 0,
                    incompleteBlinkCount: 0,
                    incompleteBlinkRatio: 0,
                    confidence: 0
                } as any
            }
        } finally {
            clearInterval(interval)
            cleanupListener()
            await this.engine.stopPreview()
        }
    }

    // Methods for other parts of app (e.g. Pomodoro)
    async start(videoElement?: HTMLVideoElement, silent: boolean = false) {
        if (!this.isInitialized) await this.initialize()

        // Handle optional video element
        let targetElement = videoElement;
        if (!targetElement) {
            // Try finding the default assessment video
            targetElement = document.getElementById('assessment-video') as HTMLVideoElement;

            // If still no element and we need one for the engine, create a hidden one
            if (!targetElement) {
                targetElement = document.createElement('video');
                targetElement.autoplay = true;
                targetElement.muted = true;
                targetElement.style.display = 'none';
                document.body.appendChild(targetElement);
            }
        }

        await this.engine.startPreview(targetElement)
    }

    async stop() {
        await this.engine.stopPreview()
    }
}
