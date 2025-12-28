/**
 * Survey Flow Manager
 * Manages the state machine of the chatbot survey, handling branching logic.
 */

import { QUESTION_BANK, INITIAL_QUESTION_ID } from './QuestionBank';
import { mapAnswersToFeatures } from './FeatureMapper';
import { SurveyState, Question } from '../../types/chatbot';

export class SurveyFlow {
    private state: SurveyState;

    constructor() {
        this.reset();
        // Initialize state to avoid undefined error in TS, though reset() does it.
        this.state = {
            answers: {},
            features: {},
            currentQuestionId: INITIAL_QUESTION_ID,
            isComplete: false,
            history: []
        };
        this.reset();
    }

    reset() {
        this.state = {
            answers: {},
            features: {},
            currentQuestionId: INITIAL_QUESTION_ID,
            isComplete: false,
            history: []
        };
    }

    /**
     * Get the current question object
     */
    getCurrentQuestion(): Question | null {
        if (this.state.isComplete || !this.state.currentQuestionId) return null;
        return QUESTION_BANK[this.state.currentQuestionId];
    }

    /**
     * Submit an answer for the current question
     */
    answerCurrent(value: any): { isComplete: boolean; nextQuestion?: Question } {
        const currentQ = this.getCurrentQuestion();
        if (!currentQ) return { isComplete: true };

        // 1. Validation (if any)
        if (currentQ.validation && !currentQ.validation(value)) {
            throw new Error("Invalid value");
        }

        // 2. Save Answer
        this.state.answers[currentQ.id] = value;
        this.state.history.push(currentQ.id);

        // 3. Determine Next Question
        let nextId: string | undefined = undefined;

        if (currentQ.type === 'choice' && currentQ.options) {
            const selectedOption = currentQ.options.find(opt => opt.value == value);
            if (selectedOption && selectedOption.nextQuestionId !== undefined) {
                nextId = selectedOption.nextQuestionId;
            }
        }

        if (!nextId && currentQ.options && currentQ.options[0]?.nextQuestionId) {
            nextId = currentQ.options[0].nextQuestionId;
        }

        // 4. Update State
        this.state.currentQuestionId = nextId || '';

        if (!nextId) {
            this.state.isComplete = true;
            this.state.features = mapAnswersToFeatures(this.state.answers);
        }

        return {
            isComplete: this.state.isComplete,
            nextQuestion: this.getCurrentQuestion() || undefined
        };
    }

    getCompletedFeatures() {
        if (!this.state.isComplete) return null;
        return this.state.features;
    }

    getAnswers() {
        return this.state.answers;
    }
}
