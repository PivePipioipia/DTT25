/**
 * Pose estimation helpers using MediaPipe landmarks
 * Used to gate distance estimation when user is looking away
 */
import type { FaceLandmarks } from '../types'

// MediaPipe Landmark Indices (468 point face mesh)
// Nose tip: 1
// Left Eye Outer: 33
// Right Eye Outer: 263
// Left Ear/Side: 234
// Right Ear/Side: 454

const LANDMARKS = {
    NOSE_TIP: 1,
    LEFT_EYE_OUTER: 33,
    RIGHT_EYE_OUTER: 263,
    LEFT_FACE_EDGE: 234,
    RIGHT_FACE_EDGE: 454
}

export interface PoseState {
    yawProxy: number // -1 (left) to 1 (right)
    isStable: boolean
    isCentered: boolean
}

/**
 * Calculate Yaw Proxy
 * Logic: Compare distance from nose to left vs right face edge/eye
 * Returns value roughly between -1 (looking left) and 1 (looking right)
 * 0 is straight ahead
 */
export function calculateYawProxy(landmarks: { x: number, y: number }[]): number {
    if (!landmarks || landmarks.length === 0) return 0

    const nose = landmarks[LANDMARKS.NOSE_TIP]
    const leftEdge = landmarks[LANDMARKS.LEFT_FACE_EDGE]
    const rightEdge = landmarks[LANDMARKS.RIGHT_FACE_EDGE]

    if (!nose || !leftEdge || !rightEdge) return 0

    // Distance from nose to edges (horizontal only)
    const distToLeft = Math.abs(nose.x - leftEdge.x)
    const distToRight = Math.abs(nose.x - rightEdge.x)
    const totalWidth = distToLeft + distToRight

    if (totalWidth === 0) return 0

    // (Right - Left) / Total
    // If looking straight: Right ≈ Left => 0
    // If looking right: Nose moves right, so Right < Left => Negative?
    // Let's verify coordinate system: x increases left to right [0..1]
    // Nose x increases as you turn right? No.
    // If I turn right (my right), my left cheek becomes visible, nose moves left in image (x decreases).
    // Wait, mirror mode?
    // Let's stick to relative asymmetry.

    // Standard metric: (distToRight - distToLeft) / totalWidth
    // If nose is exactly in middle, this is 0.
    return (distToRight - distToLeft) / totalWidth
}

/**
 * Check if pose is stable enough for calibration/estimation
 * threshold: default 0.15 (approx 15-20 degrees)
 */
export function analyzePose(landmarks: { x: number, y: number }[], threshold: number = 0.2): PoseState {
    const yaw = calculateYawProxy(landmarks)
    const isCentered = Math.abs(yaw) < threshold

    return {
        yawProxy: yaw,
        isStable: isCentered, // For now, stable means centered enough
        isCentered
    }
}
