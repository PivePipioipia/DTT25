/**
 * Response Generator for Dry Eye Chatbot
 * Generates personalized responses based on survey results
 */

import { FeatureKey } from '../../types/chatbot';

// Risk level thresholds
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DiagnosisResult {
    riskLevel: RiskLevel;
    riskScore: number; // 0-100
    title: string;
    message: string;
    icon: string;
    color: string;
}

export interface AdviceItem {
    icon: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
}

/**
 * Calculate risk score from features (simple rule-based)
 * Can be replaced with ML model prediction later
 */
export function calculateRiskScore(features: Record<FeatureKey, number>): number {
    let score = 0;
    
    // Symptoms are the strongest predictors (weight: 20 each)
    if (features['Discomfort Eye-strain'] === 1) score += 20;
    if (features['Redness in eye'] === 1) score += 20;
    if (features['Itchiness/Irritation in eye'] === 1) score += 20;
    
    // Screen time (weight: 15)
    const screenTime = features['Average screen time'] || 0;
    if (screenTime >= 10) score += 15;
    else if (screenTime >= 6) score += 10;
    else if (screenTime >= 3) score += 5;
    
    // Sleep quality (weight: 10)
    const sleepQuality = features['Sleep quality'] || 2;
    if (sleepQuality >= 3) score += 10; // Poor sleep
    else if (sleepQuality === 2) score += 5; // Average
    
    // Smart device before bed (weight: 5)
    if (features['Smart device before bed'] === 1) score += 5;
    
    // Medical factors (weight: 5 each)
    if (features['Sleep disorder'] === 1) score += 5;
    if (features['Ongoing medication'] === 1) score += 5;
    if (features['Medical issue'] === 1) score += 5;
    
    // Lifestyle factors (weight: 3 each)
    if (features['Smoking'] === 1) score += 3;
    if (features['Alcohol consumption'] >= 0.5) score += 3;
    
    // Cap at 100
    return Math.min(score, 100);
}

/**
 * Determine risk level from score
 */
export function getRiskLevel(score: number): RiskLevel {
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MEDIUM';
    return 'LOW';
}

/**
 * Generate diagnosis response based on risk score
 */
export function generateDiagnosisResponse(riskScore: number): DiagnosisResult {
    const riskLevel = getRiskLevel(riskScore);
    
    const responses: Record<RiskLevel, DiagnosisResult> = {
        LOW: {
            riskLevel: 'LOW',
            riskScore,
            title: 'Tuyệt vời! Mắt bạn đang khỏe mạnh',
            message: 'Bạn có nguy cơ khô mắt thấp. Hãy tiếp tục duy trì thói quen tốt và sử dụng Work Companion để bảo vệ mắt nhé!',
            icon: '🟢',
            color: '#22c55e'
        },
        MEDIUM: {
            riskLevel: 'MEDIUM',
            riskScore,
            title: 'Cần chú ý! Có một vài dấu hiệu',
            message: 'Bạn có nguy cơ khô mắt trung bình. Hãy áp dụng các biện pháp phòng ngừa bên dưới để bảo vệ mắt tốt hơn.',
            icon: '🟡',
            color: '#eab308'
        },
        HIGH: {
            riskLevel: 'HIGH',
            riskScore,
            title: 'Cảnh báo! Nguy cơ khô mắt cao',
            message: 'Bạn có nhiều yếu tố nguy cơ khô mắt. Hãy thực hiện ngay các biện pháp bên dưới và cân nhắc gặp bác sĩ nhãn khoa.',
            icon: '🔴',
            color: '#ef4444'
        }
    };
    
    return responses[riskLevel];
}

/**
 * Generate personalized advice based on features
 */
export function generatePersonalizedAdvice(features: Record<FeatureKey, number>): AdviceItem[] {
    const advice: AdviceItem[] = [];
    
    // Screen time advice
    const screenTime = features['Average screen time'] || 0;
    if (screenTime >= 8) {
        advice.push({
            icon: '📱',
            title: 'Giảm thời gian màn hình',
            description: `Bạn đang dùng ${screenTime} tiếng/ngày. Nên giảm xuống dưới 8 tiếng và nghỉ mắt thường xuyên.`,
            priority: 'high'
        });
    }
    
    // 20-20-20 rule
    advice.push({
        icon: '⏱️',
        title: 'Áp dụng quy tắc 20-20-20',
        description: 'Mỗi 20 phút, nhìn xa 20 feet (6m) trong 20 giây. Dùng Work Companion để được nhắc nhở!',
        priority: screenTime >= 6 ? 'high' : 'medium'
    });
    
    // Blink reminder
    if (features['Discomfort Eye-strain'] === 1) {
        advice.push({
            icon: '👁️',
            title: 'Chớp mắt thường xuyên',
            description: 'Khi tập trung nhìn màn hình, ta thường quên chớp mắt. Hãy cố ý chớp mắt 15-20 lần/phút.',
            priority: 'high'
        });
    }
    
    // Sleep advice
    const sleepQuality = features['Sleep quality'] || 2;
    if (sleepQuality >= 3 || features['Sleep disorder'] === 1) {
        advice.push({
            icon: '😴',
            title: 'Cải thiện giấc ngủ',
            description: 'Giấc ngủ kém ảnh hưởng đến sức khỏe mắt. Ngủ 7-8 tiếng và tránh điện thoại trước khi ngủ.',
            priority: 'high'
        });
    }
    
    // Smart device before bed
    if (features['Smart device before bed'] === 1) {
        advice.push({
            icon: '🌙',
            title: 'Tránh màn hình trước khi ngủ',
            description: 'Không dùng điện thoại/máy tính ít nhất 1 tiếng trước khi ngủ.',
            priority: 'medium'
        });
    }
    
    // Blue light filter
    if (features['Blue-light filter'] === 0) {
        advice.push({
            icon: '🔵',
            title: 'Bật chế độ lọc ánh sáng xanh',
            description: 'Sử dụng Night Shift/Night Light trên thiết bị, đặc biệt vào buổi tối.',
            priority: 'medium'
        });
    }
    
    // Symptoms present - see doctor
    const hasSymptoms = 
        features['Discomfort Eye-strain'] === 1 ||
        features['Redness in eye'] === 1 ||
        features['Itchiness/Irritation in eye'] === 1;
    
    if (hasSymptoms) {
        advice.push({
            icon: '👨‍⚕️',
            title: 'Cân nhắc gặp bác sĩ',
            description: 'Bạn đang có triệu chứng khô mắt. Nếu tình trạng kéo dài, hãy đến gặp bác sĩ nhãn khoa.',
            priority: 'medium'
        });
    }
    
    // General tips
    advice.push({
        icon: '💧',
        title: 'Uống đủ nước',
        description: 'Uống 2-3 lít nước mỗi ngày giúp duy trì độ ẩm cho mắt.',
        priority: 'low'
    });
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return advice;
}
