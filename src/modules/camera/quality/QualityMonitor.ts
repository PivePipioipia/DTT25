/**
 * Quality Monitor
 * Detects and tracks quality issues that affect landmark detection accuracy
 * 
 * Quality flags:
 * - FACE_NOT_FOUND: No face detected in frame
 * - LOW_LIGHT: Insufficient lighting
 * - LOW_FPS: Frame rate below optimal threshold
 * - POSE_UNSTABLE: Head pose outside acceptable range
 * - EYE_OCCLUDED: Eyes partially or fully occluded
 * - GLASSES_GLARE_SUSPECTED: Possible glare from glasses
 * - MULTI_FACE_DETECTED: Multiple faces in frame
 * - MODEL_WARMING_UP: Warm-up period (first 2-3 seconds)
 */

import { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import type { QualityFlags, QualityFlag, QualityMonitorConfig } from '../types'
import { QualityFlag as QF } from '../types'
import { calculatePoseAngles, extractEyeLandmarks } from '../LandmarkProvider'

const DEFAULT_CONFIG: QualityMonitorConfig = {
    lowLightThreshold: 50,
    lowFpsThreshold: 20,
    poseYawThreshold: 25,
    posePitchThreshold: 20,
    poseRollThreshold: 15,
    warmupDuration: 2500
}

export class QualityMonitor {
    private config: QualityMonitorConfig
    private startTime: number = 0
    private fpsHistory: number[] = []
    private lastFrameTime: number = 0

    constructor(config: Partial<QualityMonitorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
        this.startTime = Date.now()
    }

    /**
     * Assess quality of current frame
     */
    assessQuality(
        videoElement: HTMLVideoElement,
        landmarkResult: FaceLandmarkerResult | null,
        timestamp: number
    ): QualityFlags {
        const flags: QualityFlag[] = []
        let confidence = 1.0
        const details: any = {}

        // Check if model is warming up
        if (Date.now() - this.startTime < this.config.warmupDuration) {
            flags.push(QF.MODEL_WARMING_UP)
            confidence *= 0.5
        }

        // Calculate FPS
        const fps = this.calculateFPS(timestamp)
        details.fps = fps

        if (fps < this.config.lowFpsThreshold && fps > 0) {
            flags.push(QF.LOW_FPS)
            confidence *= 0.7
        }

        // Check if face is found
        if (!landmarkResult || !landmarkResult.faceLandmarks || landmarkResult.faceLandmarks.length === 0) {
            flags.push(QF.FACE_NOT_FOUND)
            confidence = 0
            return {
                flags,
                confidence,
                details
            }
        }

        // Check for multiple faces
        if (landmarkResult.faceLandmarks.length > 1) {
            flags.push(QF.MULTI_FACE_DETECTED)
            details.faceCount = landmarkResult.faceLandmarks.length
            confidence *= 0.6
        }

        // Check lighting
        const brightness = this.estimateBrightness(videoElement)
        details.brightness = brightness

        if (brightness < this.config.lowLightThreshold) {
            flags.push(QF.LOW_LIGHT)
            confidence *= 0.8
        }

        // Check pose stability
        const poseAngles = calculatePoseAngles(landmarkResult, 0)
        if (poseAngles) {
            details.poseAngles = poseAngles

            if (
                Math.abs(poseAngles.yaw) > this.config.poseYawThreshold ||
                Math.abs(poseAngles.pitch) > this.config.posePitchThreshold ||
                Math.abs(poseAngles.roll) > this.config.poseRollThreshold
            ) {
                flags.push(QF.POSE_UNSTABLE)
                confidence *= 0.7
            }
        }

        // Check eye occlusion
        const eyeLandmarks = extractEyeLandmarks(landmarkResult, 0)
        if (eyeLandmarks) {
            const occlusionScore = this.detectEyeOcclusion(eyeLandmarks)
            if (occlusionScore > 0.3) {
                flags.push(QF.EYE_OCCLUDED)
                confidence *= 0.6
            }
        }

        // Detect possible glasses glare
        if (this.detectGlassesGlare(videoElement, landmarkResult)) {
            flags.push(QF.GLASSES_GLARE_SUSPECTED)
            confidence *= 0.85
        }

        return {
            flags,
            confidence,
            details
        }
    }

    /**
     * Calculate current FPS from frame timestamps
     */
    private calculateFPS(timestamp: number): number {
        if (this.lastFrameTime > 0) {
            const delta = timestamp - this.lastFrameTime
            if (delta > 0) {
                const instantFps = 1000 / delta
                this.fpsHistory.push(instantFps)

                // Keep only last 30 frames
                if (this.fpsHistory.length > 30) {
                    this.fpsHistory.shift()
                }
            }
        }

        this.lastFrameTime = timestamp

        // Return average FPS
        if (this.fpsHistory.length === 0) return 0
        return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    }

    /**
     * Estimate brightness from video frame
     * Samples center region of frame to avoid edge artifacts
     */
    private estimateBrightness(videoElement: HTMLVideoElement): number {
        try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            if (!ctx) return 128 // Default mid brightness

            // Sample small region in center
            const sampleSize = 100
            canvas.width = sampleSize
            canvas.height = sampleSize

            const centerX = (videoElement.videoWidth - sampleSize) / 2
            const centerY = (videoElement.videoHeight - sampleSize) / 2

            ctx.drawImage(
                videoElement,
                centerX,
                centerY,
                sampleSize,
                sampleSize,
                0,
                0,
                sampleSize,
                sampleSize
            )

            const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
            const data = imageData.data

            let sum = 0
            for (let i = 0; i < data.length; i += 4) {
                // Calculate perceived brightness (weighted RGB)
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]
                sum += 0.299 * r + 0.587 * g + 0.114 * b
            }

            return sum / (sampleSize * sampleSize)
        } catch (error) {
            console.error('[QualityMonitor] Failed to estimate brightness:', error)
            return 128
        }
    }

    /**
     * Detect eye occlusion based on landmark confidence variance
     * Higher variance suggests occlusion or poor detection
     */
    private detectEyeOcclusion(eyeLandmarks: {
        leftEye: Array<{ x: number; y: number; z?: number }>
        rightEye: Array<{ x: number; y: number; z?: number }>
    }): number {
        // Simple heuristic: check if eye landmarks are too close together (collapsed)
        // In real implementation, would use landmark confidence scores if available

        const leftEyeSpread = this.calculateLandmarkSpread(eyeLandmarks.leftEye)
        const rightEyeSpread = this.calculateLandmarkSpread(eyeLandmarks.rightEye)

        // If eye landmarks are collapsed (very small spread), likely occluded
        const avgSpread = (leftEyeSpread + rightEyeSpread) / 2

        // Normalize: typical eye spread is ~0.02-0.05 in normalized coordinates
        // If less than 0.01, likely occluded
        if (avgSpread < 0.01) {
            return 0.8
        } else if (avgSpread < 0.015) {
            return 0.4
        }
        return 0
    }

    /**
     * Calculate spread (variance) of landmark points
     */
    private calculateLandmarkSpread(landmarks: Array<{ x: number; y: number }>): number {
        if (landmarks.length === 0) return 0

        const xs = landmarks.map((p) => p.x)
        const ys = landmarks.map((p) => p.y)

        const xRange = Math.max(...xs) - Math.min(...xs)
        const yRange = Math.max(...ys) - Math.min(...ys)

        return Math.sqrt(xRange * xRange + yRange * yRange)
    }

    /**
     * Detect possible glasses glare
     * Heuristic: high brightness variance in eye region + low landmark confidence
     */
    private detectGlassesGlare(
        videoElement: HTMLVideoElement,
        landmarkResult: FaceLandmarkerResult
    ): boolean {
        try {
            // Sample eye regions for brightness variance
            const eyeLandmarks = extractEyeLandmarks(landmarkResult, 0)
            if (!eyeLandmarks) return false

            // For now, use simplified heuristic based on overall brightness
            // In production, would sample eye regions specifically
            const brightness = this.estimateBrightness(videoElement)

            // If very bright (potential glare) and face detected (so not just bright background)
            if (brightness > 200) {
                return true
            }

            return false
        } catch (error) {
            return false
        }
    }

    /**
     * Get average FPS
     */
    getAverageFPS(): number {
        if (this.fpsHistory.length === 0) return 0
        return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    }

    /**
     * Reset quality monitor state
     */
    reset(): void {
        this.startTime = Date.now()
        this.fpsHistory = []
        this.lastFrameTime = 0
    }
}
