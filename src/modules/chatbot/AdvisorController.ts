/**
 * Advisor Controller
 * Manages the FAQ/Advisor tab UI and interactions
 */

import { 
    FAQ_CATEGORIES, 
    FAQ_BANK, 
    FAQItem, 
    FAQCategory,
    getFAQsByCategory,
    getFAQById,
    getRelatedFAQs 
} from '../chatbot/FAQBank';

export class AdvisorController {
    private container: HTMLElement | null;
    private currentCategory: FAQCategory | null = null;
    private currentFAQ: FAQItem | null = null;

    constructor() {
        this.container = document.getElementById('advisor-container');
        this.init();
    }

    private init() {
        if (!this.container) {
            console.warn('Advisor container not found');
            return;
        }
        this.renderCategories();
    }

    /**
     * Reset to category view
     */
    public reset() {
        this.currentCategory = null;
        this.currentFAQ = null;
        this.renderCategories();
    }

    /**
     * Render main category selection
     */
    private renderCategories() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="advisor-header">
                <h2>🤖 Tư Vấn Sức Khỏe Mắt</h2>
                <p class="advisor-subtitle">Chọn chủ đề bạn muốn tìm hiểu</p>
            </div>
            <div class="category-grid">
                ${FAQ_CATEGORIES.map(cat => `
                    <button class="category-card" data-category="${cat.id}">
                        <span class="category-icon">${cat.icon}</span>
                        <span class="category-name">${cat.name}</span>
                        <span class="category-desc">${cat.description}</span>
                    </button>
                `).join('')}
            </div>
        `;

        // Add event listeners
        this.container.querySelectorAll('.category-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = (e.currentTarget as HTMLElement).dataset.category as FAQCategory;
                this.showCategory(category);
            });
        });
    }

    /**
     * Show questions in a category
     */
    private showCategory(category: FAQCategory) {
        if (!this.container) return;
        this.currentCategory = category;

        const categoryInfo = FAQ_CATEGORIES.find(c => c.id === category);
        const faqs = getFAQsByCategory(category);

        this.container.innerHTML = `
            <div class="advisor-header">
                <button class="back-btn" id="btn-back-categories">
                    ← Quay lại
                </button>
                <h2>${categoryInfo?.icon} ${categoryInfo?.name}</h2>
            </div>
            <div class="faq-list">
                ${faqs.map(faq => `
                    <button class="faq-item" data-faq-id="${faq.id}">
                        <span class="faq-question">${faq.question}</span>
                        <span class="faq-arrow">→</span>
                    </button>
                `).join('')}
            </div>
        `;

        // Add event listeners
        document.getElementById('btn-back-categories')?.addEventListener('click', () => {
            this.renderCategories();
        });

        this.container.querySelectorAll('.faq-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const faqId = (e.currentTarget as HTMLElement).dataset.faqId;
                if (faqId) this.showAnswer(faqId);
            });
        });
    }

    /**
     * Show answer for a specific FAQ
     */
    private showAnswer(faqId: string) {
        if (!this.container) return;

        const faq = getFAQById(faqId);
        if (!faq) return;

        this.currentFAQ = faq;
        const relatedFAQs = getRelatedFAQs(faqId);
        const categoryInfo = FAQ_CATEGORIES.find(c => c.id === faq.category);

        // Convert markdown-like formatting to HTML
        const formattedAnswer = this.formatAnswer(faq.answer);

        this.container.innerHTML = `
            <div class="advisor-header">
                <button class="back-btn" id="btn-back-category">
                    ← ${categoryInfo?.name}
                </button>
            </div>
            <div class="answer-card">
                <h3 class="answer-question">${faq.question}</h3>
                <div class="answer-content">
                    ${formattedAnswer}
                </div>
            </div>
            ${relatedFAQs.length > 0 ? `
                <div class="related-section">
                    <h4>📚 Câu hỏi liên quan</h4>
                    <div class="related-list">
                        ${relatedFAQs.map(related => `
                            <button class="related-item" data-faq-id="${related.id}">
                                ${related.question}
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // Add event listeners
        document.getElementById('btn-back-category')?.addEventListener('click', () => {
            if (this.currentCategory) {
                this.showCategory(this.currentCategory);
            } else {
                this.renderCategories();
            }
        });

        this.container.querySelectorAll('.related-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const relatedId = (e.currentTarget as HTMLElement).dataset.faqId;
                if (relatedId) this.showAnswer(relatedId);
            });
        });
    }

    /**
     * Format answer text with basic markdown support
     */
    private formatAnswer(text: string): string {
        return text
            // Bold **text**
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Bullet points
            .replace(/^• /gm, '<span class="bullet">•</span> ')
            // Numbered lists (1️⃣, 2️⃣, etc are already emoji)
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraph
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }
}
