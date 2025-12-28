/**
 * Fusion Engine Core V2 (Upgraded)
 * Combines Survey and Camera inputs with weighted logic
 */

export interface CameraFusionInput {
    blinkRate: number;
    incompleteBlinkRatio: number;
    confidence: number;
}

export interface FusionResult {
    riskScore: number;
    severity: 'low' | 'moderate' | 'high';
    explanation: string;
    advice: string;
    details: {
        surveyComponent: number;
        cameraComponent: number;
    }
}

export class FusionEngine {
    private WEIGHTS = {
        SURVEY: 0.7,
        CAMERA: 0.3
    };

    /**
     * Calculate Risk based on Survey Score and Camera Metrics
     */
    calculateRisk(surveyRiskScore: number, cameraMetrics: CameraFusionInput): FusionResult {
        let finalScore = 0;
        let explanation = "";
        let advice = "";
        let cameraScore = 0;

        if (cameraMetrics && cameraMetrics.confidence > 0) {
            // Scoring Logic:
            // 1. Blink Rate: Normal 15-20. Low (<10) is bad.
            let blinkComponent = 0;
            if (cameraMetrics.blinkRate < 15) {
                blinkComponent = (15 - cameraMetrics.blinkRate) * 4;
            }

            // 2. Incomplete Blink: > 0% is bad.
            let incompleteComponent = cameraMetrics.incompleteBlinkRatio * 50;

            cameraScore = Math.min(100, blinkComponent + incompleteComponent);
        }

        // FUSION LOGIC
        if (!cameraMetrics || cameraMetrics.confidence < 0.3) {
            finalScore = surveyRiskScore;
            explanation = "Dựa trên khảo sát triệu chứng của bạn (vì không đủ dữ liệu camera).";
        } else {
            const wCamera = this.WEIGHTS.CAMERA * cameraMetrics.confidence;
            const wSurvey = 1 - wCamera;

            finalScore = (surveyRiskScore * wSurvey) + (cameraScore * wCamera);
            explanation = `Kết hợp 70% triệu chứng và 30% phân tích camera (Độ tin cậy: ${Math.round(cameraMetrics.confidence * 100)}%).`;
        }

        // Advice mapping
        const suggestions: string[] = [];
        const reasons: string[] = [];

        if (surveyRiskScore > 50) reasons.push("Triệu chứng lâm sàng");
        if (cameraMetrics.blinkRate < 10) {
            reasons.push("Tần suất chớp mắt quá thấp");
            suggestions.push("Tập thói quen chớp mắt chủ động mỗi khi chuyển tab làm việc.");
        }
        if (cameraMetrics.incompleteBlinkRatio > 0.4) {
            reasons.push("Chớp mắt không hoàn toàn");
            suggestions.push("Thực hiện bài tập nhắm chặt mắt trong 2 giây để bôi trơn nhãn cầu.");
        }

        // Determine Level
        let severity: 'low' | 'moderate' | 'high' = "low";
        if (finalScore >= 60) severity = "high";
        else if (finalScore >= 30) severity = "moderate";

        // Generate Final Advice
        if (severity === "high") {
            advice = "Nguy cơ cao. " + (suggestions.length > 0 ? suggestions[0] : "Hãy áp dụng quy tắc 20-20-20 và đi khám chuyên khoa.");
        } else if (severity === "moderate") {
            advice = "Nguy cơ trung bình. " + (suggestions.length > 0 ? suggestions[0] : "Hãy nghỉ ngơi mắt sau mỗi 20 phút.");
        } else {
            advice = "Mắt bạn đang ổn định. Hãy tiếp tục duy trì thói quen tốt nhé!";
        }

        if (reasons.length > 0) {
            explanation += ` Các yếu tố chính: ${reasons.join(", ")}.`;
        }

        return {
            riskScore: Math.round(finalScore),
            severity,
            explanation,
            advice,
            details: {
                surveyComponent: surveyRiskScore,
                cameraComponent: cameraScore
            }
        };
    }
}
