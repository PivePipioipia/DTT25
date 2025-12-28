/**
 * AssessmentController
 * Handles the UI for the Guided Assessment Redesign
 */

import { QUESTION_BANK } from '../chatbot/QuestionBank';

export class AssessmentController {
    private cardContainer: HTMLElement | null;
    private progressContainer: HTMLElement | null;
    private progressFill: HTMLElement | null;
    private progressText: HTMLElement | null;

    // Callback for sending answer back to system
    private onAnswer: (value: string) => void = () => { };

    private currentStep: number = 0;
    private totalSteps: number = Object.keys(QUESTION_BANK).length;

    constructor() {
        this.cardContainer = document.getElementById('question-card');
        this.progressContainer = document.getElementById('assessment-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-current');
    }

    setAnswerCallback(fn: (val: string) => void) {
        this.onAnswer = fn;
    }

    /**
     * Display a question in the card
     */
    renderQuestion(text: string, type: 'choice' | 'text', options: any[] = []) {
        if (!this.cardContainer) return;

        // Show Progress Bar if hidden
        this.progressContainer?.classList.remove('hidden');
        this.updateProgress();

        // Animate Out
        this.cardContainer.style.opacity = '0';
        this.cardContainer.style.transform = 'translateY(10px)';

        setTimeout(() => {
            let html = `<div class="question-text">${text}</div>`;

            if (type === 'choice' && options.length > 0) {
                html += `<div class="options-grid">`;
                options.forEach(opt => {
                    const icon = this.getIconForOption(opt.label, opt.value);
                    html += `<button class="option-btn" data-val="${opt.value}">
                        <span class="btn-icon">${icon}</span>
                        <span class="btn-label">${opt.label}</span>
                        <span class="btn-arrow">›</span>
                    </button>`;
                });
                html += `</div>`;
            } else {
                // Fallback for text input (rare in this app now)
                html += `<div style="display:flex; gap:10px;">
                    <input type="text" id="assess-input" class="modern-input" placeholder="Type here..." style="flex:1; padding:1rem; border-radius:8px; border:1px solid #ddd;">
                    <button id="assess-send" class="primary-btn">Next</button>
                </div>`;
            }

            if (this.cardContainer) {
                this.cardContainer.innerHTML = html;

                // Bind events
                this.cardContainer.querySelectorAll('.option-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const val = (e.currentTarget as HTMLElement).dataset.val;
                        if (val) this.handleSelection(val);
                    });
                });

                const sendBtn = document.getElementById('assess-send');
                if (sendBtn) {
                    sendBtn.onclick = () => {
                        const input = document.getElementById('assess-input') as HTMLInputElement;
                        if (input.value) this.handleSelection(input.value);
                    };
                }
            }

            // Animate In
            if (this.cardContainer) {
                this.cardContainer.style.opacity = '1';
                this.cardContainer.style.transform = 'translateY(0)';
            }
        }, 300);
    }

    handleSelection(value: string) {
        // Optimistic UI update or wait for next?
        // Let's call callback
        this.currentStep++;
        this.onAnswer(value);
    }

    renderResult(title: string, message: string) {
        if (!this.cardContainer) return;
        this.progressContainer?.classList.add('hidden'); // Hide progress

        this.cardContainer.innerHTML = `
            <div style="text-align:center; padding:2rem;">
                <div style="font-size:3rem; margin-bottom:1rem;">✅</div>
                <h2 style="margin-bottom:1rem;">${title}</h2>
                <div style="color:var(--text-secondary); line-height:1.6;">${message}</div>
                <div style="margin-top:2rem;">
                    <button class="primary-btn" onclick="window.location.reload()">Done</button>
                </div>
            </div>
        `;
    }

    updateProgress() {
        if (this.progressFill && this.progressText) {
            const pct = Math.min(100, (this.currentStep / this.totalSteps) * 100);
            this.progressFill.style.width = `${pct}%`;
            this.progressText.innerText = `${Math.min(this.currentStep + 1, this.totalSteps)}`;
        }
    }

    private getIconForOption(label: string, value: string): string {
        const lower = label.toLowerCase();
        // Yes / No
        if (lower === 'yes' || lower.includes('có')) return '✅';
        if (lower === 'no' || lower.includes('không')) return '❌';

        // Frequency / Time
        if (lower.includes('never') || lower.includes('không bao giờ')) return '🙅‍♂️';
        if (lower.includes('rarely') || lower.includes('hiếm khi')) return '🌤️';
        if (lower.includes('sometimes') || lower.includes('thỉnh thoảng')) return '🤔';
        if (lower.includes('often') || lower.includes('thường xuyên')) return '⚠️';
        if (lower.includes('always') || lower.includes('luôn luôn')) return '🚨';

        // Hours
        if (lower.includes('hour') || lower.includes('tiếng')) return '⏱️';
        if (lower.includes('minute') || lower.includes('phút')) return '⏲️';

        // Severity
        if (lower.includes('low') || lower.includes('thấp')) return '🟢';
        if (lower.includes('medium') || lower.includes('vừa')) return '🟡';
        if (lower.includes('high') || lower.includes('cao')) return '🔴';
        if (lower.includes('severe') || lower.includes('nặng')) return '👿';

        // Devices
        if (lower.includes('laptop') || lower.includes('computer')) return '💻';
        if (lower.includes('phone') || lower.includes('mobile')) return '📱';
        if (lower.includes('tablet')) return '🖊️';

        // Gender / Personal
        if (lower.includes('male') || lower.includes('nam')) return '👨';
        if (lower.includes('female') || lower.includes('nữ')) return '👩';
        if (lower.includes('other') || lower.includes('khác')) return '🧑';

        // Default bullet
        return '🔹';
    }
}
