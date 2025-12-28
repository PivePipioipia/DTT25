/**
 * Camera feature type definitions
 * Comprehensive types for blink detection, distance estimation, quality monitoring
 */

// ============= Distance Types =============
export type DistanceBucket = 'NEAR' | 'OK' | 'FAR' | 'UNKNOWN'

export interface DistanceMetrics {
    estimatedCm?: number
    bucket: DistanceBucket
    confidence: number // 0-1
}

// ============= Blink Types =============
export interface BlinkMetrics {
    blinkCount: number
    blinkRate: number // blinks per minute
    incompleteBlinkCount: number
    incompleteBlinkRatio: number // 0-1
    confidence: number // 0-1
    currentEAR?: number
}

export interface BlinkEvent {
    timestamp: number
    isComplete: boolean
    minOpenness: number // 0-1, minimum openness during blink
    duration: number // ms
}

export interface EyeOpenness {
    left: number // 0-1, 0 = fully closed, 1 = fully open
    right: number // 0-1
    timestamp: number
}

// ============= Quality Types =============
export enum QualityFlag {
    FACE_NOT_FOUND = 'FACE_NOT_FOUND',
    LOW_LIGHT = 'LOW_LIGHT',
    LOW_FPS = 'LOW_FPS',
    POSE_UNSTABLE = 'POSE_UNSTABLE',
    EYE_OCCLUDED = 'EYE_OCCLUDED',
    GLASSES_GLARE_SUSPECTED = 'GLASSES_GLARE_SUSPECTED',
    MULTI_FACE_DETECTED = 'MULTI_FACE_DETECTED',
    MODEL_WARMING_UP = 'MODEL_WARMING_UP'
}

export interface QualityFlags {
    flags: QualityFlag[]
    confidence: number // Overall confidence 0-1
    details?: {
        brightness?: number
        fps?: number
        faceCount?: number
        poseAngles?: { yaw: number; pitch: number; roll: number }
    }
}

// Legacy compatibility
export interface QualityFlagsLegacy {
    tooFar: boolean
    tooClose: boolean
    lowLight: boolean
    blur: boolean
}

// ============= Frame Metrics =============
export interface FrameMetrics {
    timestamp: number
    fps: number
    eyeOpenness?: EyeOpenness
    distance?: DistanceMetrics
    quality: QualityFlags
    landmarks?: FaceLandmarks
}

// ============= Calibration Types =============
export interface CalibrationState {
    targetCm: number // Target distance in cm (typically 45cm)
    iodPxCalib: number // Inter-ocular distance in pixels at target distance
    k: number // Calibration constant: k = targetCm * iodPxCalib
    timestamp: number
    sampleCount: number
}

export interface CalibrationResult {
    success: boolean
    state?: CalibrationState
    error?: string
    qualityDuringCalibration: QualityFlags
}

// ============= Session Result Types =============
export type AssessmentResult =
    | {
        status: "OK"
        duration: number
        blinkMetrics: BlinkMetrics
        distanceMetrics?: DistanceMetrics
        qualityFlags: QualityFlags
        blinkHistory: BlinkEvent[]
        avgFps: number
        // Explicitly add these for UI binding if needed, or rely on blinkMetrics
    }
    | {
        status: "LOW_CONFIDENCE"
        reason: string
        confidence: number
        duration: number
        qualityFlags: QualityFlags
    }
    | {
        status: "NO_FACE"
        reason: string
        confidence: 0
        duration: number
        qualityFlags: QualityFlags
    }

export interface DistanceBurstResult {
    bucket: DistanceBucket
    estimatedCm?: number
    confidence: number
    qualityFlags: QualityFlags
    sampleCount: number
    duration: number // actual duration in ms
}

export interface CameraSessionResult {
    duration: number // seconds
    blinkMetrics: BlinkMetrics
    distanceMetrics?: DistanceMetrics
    qualityFlags: QualityFlagsLegacy
}

// ============= Configuration Types =============
export interface BlinkDetectorConfig {
    earThreshold: number // EAR threshold for blink detection (default: 0.2)
    earCloseThreshold: number // Threshold for entering CLOSING state (default: 0.25)
    earOpenThreshold: number // Threshold for re-entering OPEN state (default: 0.28)
    incompleteThreshold: number // Threshold for incomplete blink (default: 0.30)
    minBlinkDuration: number // ms (default: 80)
    maxBlinkDuration: number // ms (default: 400)
    debounceTime: number // ms between blinks (default: 120)
    smoothingWindowSize: number // frames for smoothing (default: 3)
}

export interface DistanceEstimatorConfig {
    nearThreshold: number // cm (default: 30)
    farThreshold: number // cm (default: 60)
    medianWindowSize: number // frames for median filtering (default: 5)
}

export interface QualityMonitorConfig {
    lowLightThreshold: number // brightness 0-255 (default: 50)
    lowFpsThreshold: number // fps (default: 20)
    poseYawThreshold: number // degrees (default: 25)
    posePitchThreshold: number // degrees (default: 20)
    poseRollThreshold: number // degrees (default: 15)
    warmupDuration: number // ms (default: 2500)
}

export interface CameraEngineConfig {
    preferredResolution: { width: number; height: number }
    blinkDetector: Partial<BlinkDetectorConfig>
    distanceEstimator: Partial<DistanceEstimatorConfig>
    qualityMonitor: Partial<QualityMonitorConfig>
    mediapipeAssetsPath?: string // Optional local path, defaults to CDN
}

// ============= MediaPipe Types =============
export interface FaceLandmarks {
    landmarks: Array<{ x: number; y: number; z?: number }>
    faceBlendshapes?: Array<{ categoryName: string; score: number }>
    facialTransformationMatrixes?: number[]
}
