/**
 * Feature Mapper
 * Maps raw survey answers to the 19 Refined Features for the ML Model
 */

import { FeatureKey } from '../../types/chatbot';

export const DEFAULT_FEATURES: Record<FeatureKey, number> = {
    "Discomfort Eye-strain": 0,
    "Itchiness/Irritation in eye": 0,
    "Redness in eye": 0,
    "Stress level": 1,
    "Smart device before bed": 0,
    "Sleep quality": 2,
    "Gender": 0,
    "Alcohol consumption": 0,
    "Smoking": 0,
    "Sleep disorder": 0,
    "Ongoing medication": 0,
    "Caffeine consumption": 0,
    "Feel sleepy during day": 0,
    "Wake up during night": 0,
    "Medical issue": 0,
    "Blue-light filter": 0,
    "Daily steps": 5000,
    "Age": 30,
    "Average screen time": 5
};

/**
 * Maps raw answers to the 19-feature vector
 */
export function mapAnswersToFeatures(answers: Record<string, any>): Record<FeatureKey, number> {
    const features = { ...DEFAULT_FEATURES };

    const assign = (key: FeatureKey, val: any) => {
        if (val !== undefined && val !== null) {
            features[key] = Number(val);
        }
    };

    assign('Gender', answers['intro_gender']);
    assign('Age', answers['intro_age']);
    assign('Average screen time', answers['lifestyle_screen']);
    assign('Blue-light filter', answers['lifestyle_blue_light']);
    assign('Smart device before bed', answers['lifestyle_smart_device']);
    assign('Daily steps', answers['lifestyle_steps']);
    assign('Smoking', answers['habit_smoking']);
    assign('Alcohol consumption', answers['habit_alcohol']);
    assign('Caffeine consumption', answers['habit_caffeine']);
    assign('Ongoing medication', answers['health_medication']);
    assign('Medical issue', answers['health_issues']);
    assign('Sleep quality', answers['sleep_quality']);
    assign('Sleep disorder', answers['sleep_disorder']);
    assign('Wake up during night', answers['sleep_wake']);
    assign('Feel sleepy during day', answers['sleep_day']);
    assign('Stress level', answers['mental_stress']);
    assign('Discomfort Eye-strain', answers['sym_discomfort']);
    assign('Redness in eye', answers['sym_redness']);
    assign('Itchiness/Irritation in eye', answers['sym_itch']);

    return features;
}
