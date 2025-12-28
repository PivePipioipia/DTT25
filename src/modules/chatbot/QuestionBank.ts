/**
 * Vietnamese Question Bank for Dry Eye Screening
 * Mapped to 19 Refined Features for ML Model
 */

import { Question } from '../../types/chatbot';

export const INITIAL_QUESTION_ID = 'intro_gender';

export const QUESTION_BANK: Record<string, Question> = {
    // 1. Demographics
    'intro_gender': {
        id: 'intro_gender',
        featureKey: 'Gender',
        text: "Chào bạn! Để bắt đầu, xin cho biết giới tính của bạn để mình tính toán chính xác hơn nhé.",
        type: 'choice',
        options: [
            { label: "Nam", value: 1, nextQuestionId: 'intro_age' },
            { label: "Nữ", value: 0, nextQuestionId: 'intro_age' }
        ],
        skipAllowed: false
    },
    'intro_age': {
        id: 'intro_age',
        featureKey: 'Age',
        text: "Bạn bao nhiêu tuổi?",
        type: 'number',
        validation: (v: number) => v > 5 && v < 100,
        skipAllowed: true,
        options: [{ label: "Tiếp tục", value: "next", nextQuestionId: 'lifestyle_screen' }]
    },
    // ... (rest of the content is identical, just typed)
    // 2. Lifestyle & Screen
    'lifestyle_screen': {
        id: 'lifestyle_screen',
        featureKey: 'Average screen time',
        text: "Trung bình một ngày bạn nhìn màn hình (điện thoại + máy tính) bao lâu?",
        type: 'choice',
        options: [
            { label: "Dưới 3 tiếng", value: 2, nextQuestionId: 'lifestyle_blue_light' },
            { label: "3 - 6 tiếng", value: 5, nextQuestionId: 'lifestyle_blue_light' },
            { label: "6 - 9 tiếng", value: 8, nextQuestionId: 'lifestyle_blue_light' },
            { label: "Trên 10 tiếng", value: 12, nextQuestionId: 'lifestyle_blue_light' }
        ]
    },
    'lifestyle_blue_light': {
        id: 'lifestyle_blue_light',
        featureKey: 'Blue-light filter',
        text: "Bạn có thường dùng chế độ lọc ánh sáng xanh (Night Shift/Night Light) không?",
        type: 'choice',
        options: [
            { label: "Có, thường xuyên", value: 1, nextQuestionId: 'lifestyle_smart_device' },
            { label: "Thỉnh thoảng", value: 0.5, nextQuestionId: 'lifestyle_smart_device' },
            { label: "Không", value: 0, nextQuestionId: 'lifestyle_smart_device' }
        ]
    },
    'lifestyle_smart_device': {
        id: 'lifestyle_smart_device',
        featureKey: 'Smart device before bed',
        text: "Bạn có thói quen dùng điện thoại ngay trước khi ngủ không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'lifestyle_steps' },
            { label: "Không", value: 0, nextQuestionId: 'lifestyle_steps' }
        ]
    },
    'lifestyle_steps': {
        id: 'lifestyle_steps',
        featureKey: 'Daily steps',
        text: "Bạn có hay vận động không? (Ước lượng số bước chân/ngày)",
        type: 'choice',
        options: [
            { label: "Ít vận động (<3000)", value: 2000, nextQuestionId: 'habit_smoking' },
            { label: "Trung bình (3000-8000)", value: 5000, nextQuestionId: 'habit_smoking' },
            { label: "Năng động (>8000)", value: 9000, nextQuestionId: 'habit_smoking' }
        ],
        skipAllowed: true
    },
    // 3. Habits
    'habit_smoking': {
        id: 'habit_smoking',
        featureKey: 'Smoking',
        text: "Bạn có hút thuốc lá không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'habit_alcohol' },
            { label: "Không", value: 0, nextQuestionId: 'habit_alcohol' }
        ]
    },
    'habit_alcohol': {
        id: 'habit_alcohol',
        featureKey: 'Alcohol consumption',
        text: "Bạn có thường xuyên uống rượu bia không?",
        type: 'choice',
        options: [
            { label: "Thường xuyên", value: 1, nextQuestionId: 'habit_caffeine' },
            { label: "Thỉnh thoảng", value: 0.5, nextQuestionId: 'habit_caffeine' },
            { label: "Không/Hiếm khi", value: 0, nextQuestionId: 'habit_caffeine' }
        ]
    },
    'habit_caffeine': {
        id: 'habit_caffeine',
        featureKey: 'Caffeine consumption',
        text: "Bạn có uống cafe hàng ngày không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'health_medication' },
            { label: "Không", value: 0, nextQuestionId: 'health_medication' }
        ]
    },
    // 4. Medical
    'health_medication': {
        id: 'health_medication',
        featureKey: 'Ongoing medication',
        text: "Bạn có đang dùng thuốc điều trị bệnh nào kéo dài (như thuốc dị ứng, huyết áp, trầm cảm...)?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'health_issues' },
            { label: "Không", value: 0, nextQuestionId: 'health_issues' }
        ]
    },
    'health_issues': {
        id: 'health_issues',
        featureKey: 'Medical issue',
        text: "Bạn có bệnh lý nền nào về mắt hoặc miễn dịch không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'sleep_quality' },
            { label: "Không", value: 0, nextQuestionId: 'sleep_quality' }
        ]
    },
    // 5. Sleep & Stress
    'sleep_quality': {
        id: 'sleep_quality',
        featureKey: 'Sleep quality',
        text: "Bạn đánh giá chất lượng giấc ngủ của mình thế nào?",
        type: 'choice',
        options: [
            { label: "Tốt", value: 1, nextQuestionId: 'sleep_disorder' },
            { label: "Bình thường", value: 2, nextQuestionId: 'sleep_disorder' },
            { label: "Kém/Mất ngủ", value: 3, nextQuestionId: 'sleep_disorder' }
        ]
    },
    'sleep_disorder': {
        id: 'sleep_disorder',
        featureKey: 'Sleep disorder',
        text: "Bạn có được chẩn đoán rối loạn giấc ngủ không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'sleep_wake' },
            { label: "Không", value: 0, nextQuestionId: 'sleep_wake' }
        ]
    },
    'sleep_wake': {
        id: 'sleep_wake',
        featureKey: 'Wake up during night',
        text: "Bạn có hay bị thức giấc giữa đêm không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'sleep_day' },
            { label: "Không", value: 0, nextQuestionId: 'sleep_day' }
        ]
    },
    'sleep_day': {
        id: 'sleep_day',
        featureKey: 'Feel sleepy during day',
        text: "Bạn có hay buồn ngủ vào ban ngày không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'mental_stress' },
            { label: "Không", value: 0, nextQuestionId: 'mental_stress' }
        ]
    },
    'mental_stress': {
        id: 'mental_stress',
        featureKey: 'Stress level',
        text: "Mức độ căng thẳng (stress) hiện tại của bạn?",
        type: 'choice',
        options: [
            { label: "Thấp/Thoải mái", value: 1, nextQuestionId: 'sym_discomfort' },
            { label: "Trung bình", value: 2, nextQuestionId: 'sym_discomfort' },
            { label: "Cao/Rất căng thẳng", value: 3, nextQuestionId: 'sym_discomfort' }
        ]
    },
    // 6. Symptoms
    'sym_discomfort': {
        id: 'sym_discomfort',
        featureKey: 'Discomfort Eye-strain',
        text: "Gần đây bạn có thấy mỏi mắt, khó chịu ở mắt không?",
        type: 'choice',
        options: [
            { label: "Thường xuyên", value: 1, nextQuestionId: 'sym_redness' },
            { label: "Thỉnh thoảng", value: 1, nextQuestionId: 'sym_redness' },
            { label: "Không", value: 0, nextQuestionId: 'sym_redness' }
        ]
    },
    'sym_redness': {
        id: 'sym_redness',
        featureKey: 'Redness in eye',
        text: "Mắt bạn có bị đỏ không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1, nextQuestionId: 'sym_itch' },
            { label: "Không", value: 0, nextQuestionId: 'sym_itch' }
        ]
    },
    'sym_itch': {
        id: 'sym_itch',
        featureKey: 'Itchiness/Irritation in eye',
        text: "Bạn có cảm thấy ngứa hay cộm mắt không?",
        type: 'choice',
        options: [
            { label: "Có", value: 1 },
            { label: "Không", value: 0 }
        ]
    }
};
