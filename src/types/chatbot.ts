export type FeatureKey =
    | "Discomfort Eye-strain"
    | "Itchiness/Irritation in eye"
    | "Redness in eye"
    | "Stress level"
    | "Smart device before bed"
    | "Sleep quality"
    | "Gender"
    | "Alcohol consumption"
    | "Smoking"
    | "Sleep disorder"
    | "Ongoing medication"
    | "Caffeine consumption"
    | "Feel sleepy during day"
    | "Wake up during night"
    | "Medical issue"
    | "Blue-light filter"
    | "Daily steps"
    | "Age"
    | "Average screen time";

export interface QuestionOption {
    label: string;
    value: any;
    nextQuestionId?: string;
}

export interface Question {
    id: string;
    featureKey?: FeatureKey;
    text: string;
    type: 'choice' | 'number' | 'text';
    options?: QuestionOption[];
    validation?: (value: any) => boolean;
    skipAllowed?: boolean;
}

export interface SurveyState {
    answers: Record<string, any>;
    features: Partial<Record<FeatureKey, number>>;
    currentQuestionId: string;
    isComplete: boolean;
    history: string[];
}
