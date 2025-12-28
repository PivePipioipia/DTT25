/**
 * DiagnosticFlow (Orchestrator - TS)
 */

import { SurveyFlow } from '../chatbot/SurveyFlow';
import { EventEmitter } from '../utils/EventEmitter';
import { CameraController } from '../camera/CameraController';
import { RiskPredictionService, MLPredictionResult } from './RiskPredictionService';
import { FusionEngine } from '../fusion/FusionEngine';
import { DatabaseService } from '../../services/DatabaseService';

interface DiagnosticDependencies {
    cameraController: CameraController;
    predictionService: RiskPredictionService;
    fusionEngine: FusionEngine;
    databaseService: DatabaseService;
    adviceAgent: any;
    gamificationService?: any;
}

export class DiagnosticFlow extends EventEmitter {
    private cameraController: CameraController;
    private predictionService: RiskPredictionService;
    private fusionEngine: FusionEngine;
    private databaseService: DatabaseService;
    private adviceAgent: any;
    private gamificationService: any; // injected

    private surveyFlow: SurveyFlow;
    public state: 'IDLE' | 'SURVEYING' | 'PREDICTING' | 'CAMERA_WAIT' | 'CAMERA_PREPARE' | 'CAMERA_TEST' | 'FINISHED';
    private mlResult: MLPredictionResult | null = null;
    public assessmentDuration = 20;

    constructor(dependencies: DiagnosticDependencies) {
        super();
        this.cameraController = dependencies.cameraController;
        this.predictionService = dependencies.predictionService;
        this.fusionEngine = dependencies.fusionEngine;
        this.databaseService = dependencies.databaseService;
        this.adviceAgent = dependencies.adviceAgent;
        this.gamificationService = dependencies.gamificationService;

        this.surveyFlow = new SurveyFlow();
        this.state = 'IDLE';
    }

    start() {
        this.state = 'SURVEYING';
        this.surveyFlow.reset();
        const firstQ = this.surveyFlow.getCurrentQuestion();
        if (firstQ) this.emit('bot_message', firstQ.text, firstQ.type, firstQ.options);
    }

    handleInput(userInput: any) {
        if (this.state !== 'SURVEYING') return;

        try {
            const result = this.surveyFlow.answerCurrent(userInput);

            if (result.isComplete) {
                this.state = 'PREDICTING';
                this._performPrediction();
            } else {
                const nextQ = result.nextQuestion;
                if (nextQ) this.emit('bot_message', nextQ.text, nextQ.type, nextQ.options);
            }
        } catch (error) {
            console.error(error);
            this.emit('bot_message', "Xin lỗi, câu trả lời không hợp lệ.");
        }
    }

    private async _performPrediction() {
        const features = this.surveyFlow.getCompletedFeatures();
        if (!features) return;

        this.mlResult = await this.predictionService.predict(features);

        this.state = 'CAMERA_WAIT';

        const riskLevel = this.mlResult.level;
        let msg = `Dựa trên thông tin của bạn, mình đánh giá sơ bộ nguy cơ ở mức: ${riskLevel.toUpperCase()}.`;
        msg += `\n\nĐể chính xác hơn, mình cần kiểm tra mắt bạn qua Camera trong ${this.assessmentDuration} giây. Bạn có đồng ý không?`;

        this.emit('bot_message', msg, 'choice', [
            { label: "Đồng ý (Mở Camera)", value: 'yes' },
            { label: "Bỏ qua", value: 'no' }
        ]);
    }

    async handleCameraDecision(choice: string) {
        if (this.state !== 'CAMERA_WAIT') return;

        if (choice === 'yes') {
            this.state = 'CAMERA_PREPARE';
            this.emit('camera_start');

            // Wait for user to be ready (Posture Guide)
            try {
                await this.cameraController.start();
                this.emit('camera_ready_pending');

                // Set a timeout for preparation or wait for stable signal
                // For now, let's just wait 3 seconds for them to adjust
                setTimeout(async () => {
                    if (this.state === 'CAMERA_PREPARE') {
                        this.state = 'CAMERA_TEST';
                        await this._runCameraTest();
                    }
                }, 4000);

            } catch (e: any) {
                this.emit('camera_error', e.message);
                this._finalizeDiagnosis(null);
            }
        } else {
            this._finalizeDiagnosis(null);
        }
    }

    private async _runCameraTest() {
        try {
            const metrics = await this.cameraController.measureSession(this.assessmentDuration, (progress: number, guidance: any) => {
                this.emit('camera_progress', progress, guidance);
            });
            this.emit('camera_complete');
            this._finalizeDiagnosis(metrics);

        } catch (error: any) {
            console.warn("[DiagnosticFlow] Camera Test Failed:", error.message);
            this.emit('camera_error', error.message);
            this.emit('bot_message', "Rất tiếc, mình không thể hoàn thành kiểm tra mắt: " + error.message + ". Chúng ta sẽ tiếp tục với chỉ số khảo sát nhé.");
            this._finalizeDiagnosis(null);
        }
    }

    private async _finalizeDiagnosis(cameraMetrics: any) {
        this.state = 'FINISHED';
        if (!this.mlResult) return;

        let fusionInputCam = { blinkRate: 0, blinkCount: 0, incompleteBlinkCount: 0, incompleteBlinkRatio: 0, confidence: 0 };

        if (cameraMetrics) {
            fusionInputCam = {
                blinkRate: cameraMetrics.blinkRate,
                blinkCount: cameraMetrics.blinkCount || 0,
                incompleteBlinkCount: cameraMetrics.incompleteBlinkCount || 0,
                incompleteBlinkRatio: cameraMetrics.incompleteBlinkRatio,
                confidence: cameraMetrics.confidence !== undefined ? cameraMetrics.confidence : 0.8
            };
        }

        const finalDiagnosis = this.fusionEngine.calculateRisk(
            this.mlResult.riskScore,
            fusionInputCam
        );

        // Advice agent usually returns string
        // const advice = await this.adviceAgent.generateAdvice(finalDiagnosis);
        const advice = `Kết quả: ${finalDiagnosis.explanation}\n\nLời khuyên: ${finalDiagnosis.advice}`;

        // 4. Save to Database
        try {
            await this.databaseService.saveCheckup({
                timestamp: Date.now(),
                riskScore: finalDiagnosis.riskScore,
                severity: finalDiagnosis.severity,
                surveyScore: finalDiagnosis.details.surveyComponent,
                cameraScore: finalDiagnosis.details.cameraComponent,
                blinkRate: fusionInputCam.blinkRate,
                blinkCount: fusionInputCam.blinkCount,
                incompleteBlinkCount: fusionInputCam.incompleteBlinkCount,
                incompleteBlinkRatio: fusionInputCam.incompleteBlinkRatio
            });
            console.log("Checkup saved to DB");

            // Trigger Gamification
            if (this.gamificationService) {
                this.gamificationService.handleCheckupCompletion({
                    ...finalDiagnosis,
                    blinkRate: fusionInputCam.blinkRate
                });
            }

        } catch (e) {
            console.error("Failed to save checkup", e);
        }

        this.emit('diagnosis_complete', {
            result: finalDiagnosis,
            message: advice,
            features: this.surveyFlow.getCompletedFeatures()
        });
    }
}
