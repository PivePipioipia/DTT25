/**
 * MediaPipe Face Landmarker Provider
 * Singleton wrapper for MediaPipe FaceLandmarker with lazy initialization
 * Optimized for on-device, offline-ready face landmark detection
 */

import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision'

export interface LandmarkProviderConfig {
    assetsPath?: string // Optional local path, defaults to CDN
    runningMode?: 'IMAGE' | 'VIDEO'
    numFaces?: number
    minDetectionConfidence?: number
    minTrackingConfidence?: number
}

/**
 * Singleton provider for MediaPipe Face Landmarker
 */
class LandmarkProviderClass {
    private faceLandmarker: FaceLandmarker | null = null
    private isInitializing: boolean = false
    private initPromise: Promise<void> | null = null

    /**
     * Initialize MediaPipe Face Landmarker
     * Uses local assets if assetsPath provided, otherwise falls back to CDN
     */
    async initialize(config: LandmarkProviderConfig = {}): Promise<void> {
        // If already initialized, return immediately
        if (this.faceLandmarker) {
            return
        }

        // If currently initializing, wait for that initialization to complete
        if (this.isInitializing && this.initPromise) {
            return this.initPromise
        }

        // Start new initialization
        this.isInitializing = true
        this.initPromise = this._doInitialize(config)

        try {
            await this.initPromise
        } finally {
            this.isInitializing = false
        }
    }

    private async _doInitialize(config: LandmarkProviderConfig): Promise<void> {
        try {
            // Determine assets path strategy
            const wasmPath = config.assetsPath || 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'

            // Load WASM files
            const vision = await FilesetResolver.forVisionTasks(wasmPath)

            // Model path - try local first, then CDN
            const modelPath = config.assetsPath
                ? `${config.assetsPath}/face_landmarker.task`
                : 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

            // Create Face Landmarker
            this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: 'GPU' // Use GPU acceleration if available
                },
                runningMode: config.runningMode || 'VIDEO',
                numFaces: config.numFaces || 1,
                minFaceDetectionConfidence: config.minDetectionConfidence || 0.5,
                minFacePresenceConfidence: config.minDetectionConfidence || 0.5,
                minTrackingConfidence: config.minTrackingConfidence || 0.5,
                outputFaceBlendshapes: true, // Enable for iris landmarks
                outputFacialTransformationMatrixes: false
            })

            console.log('[LandmarkProvider] MediaPipe Face Landmarker initialized successfully')
        } catch (error) {
            this.faceLandmarker = null
            console.error('[LandmarkProvider] Failed to initialize MediaPipe:', error)
            throw new Error(`Failed to initialize MediaPipe Face Landmarker: ${error}`)
        }
    }

    /**
     * Process a video frame and detect face landmarks
     * Returns null if no face detected or not initialized
     */
    async detectLandmarks(
        videoElement: HTMLVideoElement,
        timestamp: number
    ): Promise<FaceLandmarkerResult | null> {
        if (!this.faceLandmarker) {
            console.warn('[LandmarkProvider] Face landmarker not initialized')
            return null
        }

        try {
            const result = this.faceLandmarker.detectForVideo(videoElement, timestamp)
            return result
        } catch (error) {
            console.error('[LandmarkProvider] Detection error:', error)
            return null
        }
    }

    /**
     * Check if landmark provider is ready
     */
    isReady(): boolean {
        return this.faceLandmarker !== null
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        if (this.faceLandmarker) {
            this.faceLandmarker.close()
            this.faceLandmarker = null
        }
    }
}

// Export singleton instance
export const LandmarkProvider = new LandmarkProviderClass()

/**
 * Helper: Extract eye landmarks from MediaPipe result
 * Returns left and right eye contour points
 */
export function extractEyeLandmarks(result: FaceLandmarkerResult, faceIndex: number = 0) {
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        return null
    }

    const landmarks = result.faceLandmarks[faceIndex]

    // MediaPipe face mesh indices for eyes
    // Left eye: 33, 160, 158, 133, 153, 144
    // Right eye: 362, 385, 387, 263, 373, 380
    const leftEyeIndices = [33, 160, 158, 133, 153, 144]
    const rightEyeIndices = [362, 385, 387, 263, 373, 380]

    const leftEye = leftEyeIndices.map((i) => landmarks[i])
    const rightEye = rightEyeIndices.map((i) => landmarks[i])

    return { leftEye, rightEye }
}

/**
 * Helper: Calculate Eye Aspect Ratio (EAR)
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 * where p1-p6 are eye landmarks in order
 */
export function calculateEAR(eyeLandmarks: Array<{ x: number; y: number; z?: number }>): number {
    if (eyeLandmarks.length < 6) return 0

    // Vertical distances
    const v1 = Math.hypot(
        eyeLandmarks[1].x - eyeLandmarks[5].x,
        eyeLandmarks[1].y - eyeLandmarks[5].y
    )
    const v2 = Math.hypot(
        eyeLandmarks[2].x - eyeLandmarks[4].x,
        eyeLandmarks[2].y - eyeLandmarks[4].y
    )

    // Horizontal distance
    const h = Math.hypot(
        eyeLandmarks[0].x - eyeLandmarks[3].x,
        eyeLandmarks[0].y - eyeLandmarks[3].y
    )

    if (h === 0) return 0

    return (v1 + v2) / (2.0 * h)
}

/**
 * Helper: Calculate inter-ocular distance (IOD) in pixels
 * Distance between left and right eye centers
 */
export function calculateIOD(result: FaceLandmarkerResult, faceIndex: number = 0, videoWidth: number = 1280, videoHeight: number = 720): number {
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        return 0
    }

    const landmarks = result.faceLandmarks[faceIndex]

    // MediaPipe returns normalized coordinates (0-1)
    // X coordinates are normalized by WIDTH
    // Y coordinates are normalized by HEIGHT

    // Left eye inner corner: index 33
    // Right eye inner corner: index 263
    const leftEyeCenter = landmarks[33]
    const rightEyeCenter = landmarks[263]

    // Calculate difference in normalized coordinates
    const dx = rightEyeCenter.x - leftEyeCenter.x
    const dy = rightEyeCenter.y - leftEyeCenter.y

    // Convert to pixels
    // dx is normalized by width, dy is normalized by height
    const dxPixels = dx * videoWidth
    const dyPixels = dy * videoHeight

    const iodPixels = Math.hypot(dxPixels, dyPixels)

    console.log('[IOD]', {
        norm: `${(dx * 100).toFixed(1)}%, ${(dy * 100).toFixed(1)}%`,
        px: `${dxPixels.toFixed(0)}x${dyPixels.toFixed(0)}`,
        iod: iodPixels.toFixed(1)
    })

    return iodPixels
}

/**
 * Helper: Extract pose angles (yaw, pitch, roll) from transformation matrix
 * Returns angles in degrees
 */
export function calculatePoseAngles(
    result: FaceLandmarkerResult,
    faceIndex: number = 0
): { yaw: number; pitch: number; roll: number } | null {
    // Simplified pose estimation using landmark positions
    // For more accurate pose, would use facialTransformationMatrixes
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        return null
    }

    const landmarks = result.faceLandmarks[faceIndex]

    // Use nose tip and face outline to estimate pose
    const noseTip = landmarks[1]
    const leftCheek = landmarks[234]
    const rightCheek = landmarks[454]

    // Yaw: left-right rotation
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x)
    const noseCenterOffset = (noseTip.x - (leftCheek.x + rightCheek.x) / 2) / faceWidth
    const yaw = noseCenterOffset * 60 // Rough estimate, scaled to ~±60 degrees

    // Pitch and roll would require more complex calculations
    // For now, return simplified estimates
    return {
        yaw,
        pitch: 0, // Placeholder
        roll: 0 // Placeholder
    }
}
