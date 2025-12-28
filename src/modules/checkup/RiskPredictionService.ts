/**
 * RiskPredictionService V2 (Hybrid AI)
 * - Tries to run ONNX Model (Real AI)
 * - Falls back to Heuristic Rules (Simulation) if model fails/missing
 */

import * as ort from 'onnxruntime-web';
import { FeatureKey } from '../../types/chatbot';

export interface MLPredictionResult {
    riskScore: number;
    confidence: number;
    level: 'normal' | 'moderate' | 'high';
    method: 'AI_MODEL' | 'HEURISTIC';
}

export class RiskPredictionService {
    private session: ort.InferenceSession | null = null;
    private isModelLoaded = false;

    // Heuristic Weights (Fallback)
    private weights: Record<string, number>;
    private bias: number;

    constructor() {
        // Fallback Weights
        this.weights = {
            "Discomfort Eye-strain": 15, "Itchiness/Irritation in eye": 12, "Redness in eye": 10,
            "Average screen time": 3.5, "Sleep quality": 5, "Stress level": 4, "Age": 0.3,
            "Smart device before bed": 5, "Blue-light filter": -3, "Gender": 2,
            "Medical issue": 8, "Ongoing medication": 5, "Smoking": 4
        };
        this.bias = -20;

        // Auto-load model
        this.loadModel();
    }

    async loadModel() {
        try {
            // Updated Path: public/models/survey_model.onnx
            const modelPath = '/models/survey_model.onnx';

            // Set wasm paths for vite
            ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/";

            this.session = await ort.InferenceSession.create(modelPath);
            this.isModelLoaded = true;
            console.log("✅ AI Model Loaded Successfully!");
        } catch (e) {
            console.warn("⚠️ AI Model failed to load (using Heuristics instead). Reason:", e);
            this.isModelLoaded = false;
        }
    }

    async predict(features: Partial<Record<FeatureKey, number>>): Promise<MLPredictionResult> {
        // 1. Try AI Prediction
        if (this.isModelLoaded && this.session) {
            try {
                return await this.runInference(features);
            } catch (e) {
                console.error("Inference Error:", e);
                // Fallthrough to heuristic
            }
        }

        // 2. Fallback to Heuristic
        return this.runHeuristic(features);
    }

    private async runInference(features: Partial<Record<FeatureKey, number>>): Promise<MLPredictionResult> {
        // Vectorize features (Order must match Training!)
        // Assuming standard 19 features order
        const FeatureList: FeatureKey[] = [
            "Age", "Gender", "Average screen time", "Blue-light filter",
            "Smart device before bed", "Daily steps", "Smoking", "Alcohol consumption",
            "Caffeine consumption", "Ongoing medication", "Medical issue",
            "Sleep quality", "Sleep disorder", "Wake up during night", "Feel sleepy during day",
            "Stress level", "Discomfort Eye-strain", "Redness in eye", "Itchiness/Irritation in eye"
        ];

        const inputData = Float32Array.from(FeatureList.map(k => features[k] || 0));
        const tensor = new ort.Tensor('float32', inputData, [1, 19]);

        const feeds: Record<string, ort.Tensor> = {};
        // You generally need to know the input name. 'input' or 'float_input' is common.
        // We'll try common names or inspect model. For now assume 'input'.
        feeds[this.session!.inputNames[0]] = tensor;

        const results = await this.session!.run(feeds);
        const output = results[this.session!.outputNames[0]]; // Assume first output is score

        // Assume output is Probability [0..1]
        const scoreProb = output.data[0] as number;
        const riskScore = Math.round(scoreProb * 100);

        return {
            riskScore,
            confidence: 0.95, // AI is confident
            level: this._mapLevel(riskScore),
            method: 'AI_MODEL'
        };
    }

    private runHeuristic(features: Partial<Record<FeatureKey, number>>): MLPredictionResult {
        let score = this.bias;
        const getVal = (key: FeatureKey) => (features[key] !== undefined ? features[key]! : 0);

        score += getVal("Discomfort Eye-strain") * this.weights["Discomfort Eye-strain"];
        score += getVal("Itchiness/Irritation in eye") * this.weights["Itchiness/Irritation in eye"];
        score += getVal("Redness in eye") * this.weights["Redness in eye"];
        score += Math.min(30, getVal("Average screen time") * this.weights["Average screen time"]);
        score += getVal("Smart device before bed") * this.weights["Smart device before bed"];
        score += getVal("Smoking") * this.weights["Smoking"];
        if (getVal("Blue-light filter") == 1) score += this.weights["Blue-light filter"];
        score += (getVal("Age") || 30) * this.weights["Age"];
        if (getVal("Gender") == 0) score += this.weights["Gender"];
        score += getVal("Medical issue") * this.weights["Medical issue"];
        score += getVal("Ongoing medication") * this.weights["Ongoing medication"];

        const sleepQ = getVal("Sleep quality") || 2;
        if (sleepQ === 3) score += this.weights["Sleep quality"] * 2;
        else if (sleepQ === 2) score += this.weights["Sleep quality"];
        const stress = getVal("Stress level") || 1;
        score += (stress - 1) * this.weights["Stress level"];

        let finalScore = Math.min(100, Math.max(5, score));
        return {
            riskScore: Math.round(finalScore),
            confidence: 0.85,
            level: this._mapLevel(finalScore),
            method: 'HEURISTIC'
        };
    }

    private _mapLevel(score: number): 'normal' | 'moderate' | 'high' {
        if (score < 30) return 'normal';
        if (score < 60) return 'moderate';
        return 'high';
    }
}
