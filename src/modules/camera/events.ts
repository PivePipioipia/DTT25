/**
 * Typed event system for camera module
 * Provides strongly-typed events for camera state changes and metrics
 */

import type {
    AssessmentResult,
    DistanceBurstResult,
    CalibrationResult,
    QualityFlag,
    FrameMetrics
} from './types'

export type CameraEventMap = {
    'camera:ready': void
    'camera:error': { error: Error; code?: string }
    'camera:quality': { flags: QualityFlag[]; confidence: number }
    'camera:metrics': FrameMetrics
    'camera:sessionComplete': AssessmentResult
    'camera:distanceBurstResult': DistanceBurstResult
    'camera:calibrationComplete': CalibrationResult
    'camera:calibrationProgress': { percent: number }
    'camera:fpsUpdate': { fps: number }
}

type EventCallback<T> = (data: T) => void

/**
 * Simple typed event emitter for camera events
 */
export class CameraEventEmitter {
    private listeners: Map<keyof CameraEventMap, Set<EventCallback<any>>> = new Map()

    on<K extends keyof CameraEventMap>(
        event: K,
        callback: EventCallback<CameraEventMap[K]>
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        this.listeners.get(event)!.add(callback)

        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback)
        }
    }

    emit<K extends keyof CameraEventMap>(event: K, data: CameraEventMap[K]): void {
        const callbacks = this.listeners.get(event)
        if (callbacks) {
            callbacks.forEach((callback) => callback(data))
        }
    }

    removeAllListeners(event?: keyof CameraEventMap): void {
        if (event) {
            this.listeners.delete(event)
        } else {
            this.listeners.clear()
        }
    }
}
