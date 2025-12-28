export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export interface EyeLandmarks {
    left: NormalizedLandmark[];
    right: NormalizedLandmark[];
}

export interface BlinkResult {
    timestamp: number;
    isComplete: boolean;
    minOpenness: number;
    duration: number;
}

export interface BlinkMetrics {
    blinkCount: number;
    blinkRate: number;
    incompleteBlinkCount: number;
    incompleteBlinkRatio: number;
    confidence: number;
    currentEAR?: number;
}

export interface DistanceResult {
    estimatedDistanceCm: number;
    bucket: 'NEAR' | 'FAR' | 'OK' | 'UNKNOWN';
    confidence: number;
}

export interface EyeMetrics extends BlinkMetrics {
    // Add any potential future fields here
    distance?: number;
}
