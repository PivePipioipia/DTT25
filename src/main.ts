/**
 * Main Entry Point (TS) - Wired Up
 */
import { CameraController } from './modules/camera/CameraController';
import { DiagnosticFlow } from './modules/checkup/DiagnosticFlow';
import { RiskPredictionService } from './modules/checkup/RiskPredictionService';
import { FusionEngine } from './modules/fusion/FusionEngine';
import { DatabaseService } from './services/DatabaseService';
import { StatisticsController } from './modules/ui/StatisticsController';
import { AssessmentController } from './modules/ui/AssessmentController';
import { GamificationService } from './services/GamificationService';
import { WorkCompanion } from './modules/core/WorkCompanion';
import { ConsentManager } from './modules/core/ConsentManager';
import { NotificationService } from './modules/pomodoro/NotificationService';
import { PolicyEngine } from './modules/pomodoro/PolicyEngine';
import { AdvisorController } from './modules/chatbot/AdvisorController';
import './styles/advisor.css';
import './styles/result.css';

class AppController {
    // Services
    camera: CameraController;
    diagnosis: DiagnosticFlow;
    db: DatabaseService;
    stats: StatisticsController;
    assessment: AssessmentController;
    game: GamificationService;
    pomodoro: WorkCompanion;
    policy: PolicyEngine;
    notifications: NotificationService;
    advisor: AdvisorController;

    constructor() {
        console.log("App Controller Initializing...");

        // 1. Core Services
        this.db = new DatabaseService();
        this.camera = new CameraController();
        this.game = new GamificationService();
        this.assessment = new AssessmentController();
        this.initSettings();

        // 2. Logic Modules
        const predictor = new RiskPredictionService();
        const fusion = new FusionEngine();

        // 3. Flows
        this.diagnosis = new DiagnosticFlow({
            cameraController: this.camera,
            predictionService: predictor,
            fusionEngine: fusion,
            databaseService: this.db,
            adviceAgent: { generateAdvice: (res: any) => Promise.resolve("Auto Advice: Relax your eyes!") }, // Mock Agent
            gamificationService: this.game
        });

        // Smart Work Companion Setup (Orchestrator)
        this.notifications = new NotificationService();
        this.policy = new PolicyEngine();
        const consentManager = new ConsentManager();

        this.pomodoro = new WorkCompanion({
            cameraController: this.camera,
            policyEngine: this.policy,
            notificationService: this.notifications,
            consentManager: consentManager
        });

        this.stats = new StatisticsController(this.db);
        this.stats.gameService = this.game;

        // Advisor/FAQ Controller
        this.advisor = new AdvisorController();

        // 4. UI Bindings
        this.bindUI();
        this.bindPomodoroEvents();
    }

    bindUI() {
        // Nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = (e.currentTarget as HTMLElement).dataset.tab;
                if (target) this.switchTab(target);
            });
        });

        // Assessment Start Button
        const btnStart = document.getElementById('btn-start-assess');
        if (btnStart) {
            btnStart.onclick = () => {
                this.diagnosis.start();
                btnStart.style.display = 'none'; // Hide start button
            };
        }

        // Connect Assessment UI to Diagnosis Flow
        this.assessment.setAnswerCallback((val) => {
            // Handle special camera permission "yes"/"no" from UI
            if (val === 'yes' || val === 'no') {
                this.diagnosis.handleCameraDecision(val);
            } else {
                this.diagnosis.handleInput(val);
            }
        });

        // Diagnosis Events
        this.diagnosis.on('bot_message', (text: string, type: string, opts: any) => {
            // Convert to Card UI
            this.assessment.renderQuestion(text, type as any, opts);
        });

        this.diagnosis.on('camera_start', () => {
            const overlay = document.getElementById('assessment-overlay');
            const status = document.querySelector('.overlay-status');
            if (overlay) overlay.classList.remove('hidden');
            if (status) status.innerHTML = `Đang khởi động camera...`;
        });

        this.diagnosis.on('camera_ready_pending', () => {
            const status = document.querySelector('.overlay-status');
            if (status) status.innerHTML = `Hãy giữ khuôn mặt trong khung hình... <span id="overlay-timer">3</span>s`;

            // Just a visual countdown for preparation
            let prepTime = 3;
            const timer = document.getElementById('overlay-timer');
            const interval = setInterval(() => {
                prepTime--;
                if (timer) timer.innerText = prepTime.toString();
                if (prepTime <= 0) clearInterval(interval);
            }, 1000);
        });

        this.diagnosis.on('camera_complete', () => {
            const overlay = document.getElementById('assessment-overlay');
            if (overlay) overlay.classList.add('hidden');
        });

        this.diagnosis.on('camera_error', () => {
            const overlay = document.getElementById('assessment-overlay');
            if (overlay) overlay.classList.add('hidden');
        });

        this.diagnosis.on('camera_progress', (pct: number, data: any) => {
            const status = document.querySelector('.overlay-status');
            if (status && !status.innerHTML.includes('Đang phân tích')) {
                status.innerHTML = `Đang phân tích chớp mắt... <span id="overlay-timer">${this.diagnosis.assessmentDuration}</span>s`;
            }

            const timer = document.getElementById('overlay-timer');
            if (timer) {
                const remaining = Math.ceil(this.diagnosis.assessmentDuration * (1 - pct / 100));
                timer.innerText = remaining.toString();
            }

            // --- Real-time HUD Update ---
            const hudDist = document.getElementById('hud-dist');
            const hudEar = document.getElementById('hud-ear');
            const hudBlinks = document.getElementById('hud-blinks');
            const hudInc = document.getElementById('hud-incomplete');
            const hudRate = document.getElementById('hud-rate');

            if (hudDist) hudDist.innerText = Math.round(data.distance || 0).toString();
            if (hudEar) hudEar.innerText = (data.ear || 0).toFixed(2);
            if (hudBlinks) hudBlinks.innerText = (data.blinkCount || 0).toString();
            if (hudInc) hudInc.innerText = (data.incompleteBlinkCount || 0).toString();
            if (hudRate) hudRate.innerText = Math.round(data.blinkRate || 0).toString();
        });

        this.diagnosis.on('diagnosis_complete', (data: any) => {
            // Use enhanced result if features are available
            if (data.features) {
                this.assessment.renderEnhancedResult(data.features);
            } else {
                this.assessment.renderResult(
                    `Risk: ${data.result.severity.toUpperCase()}`,
                    data.message
                );
            }
        });

    }

    bindPomodoroEvents() {
        // --- Smart Work Wiring ---
        const btnWorkStart = document.getElementById('btn-start-work');
        const btnWorkPause = document.getElementById('btn-pause-work');
        const btnWorkReset = document.getElementById('btn-reset-work');
        const btnWorkFinish = document.getElementById('btn-finish-work');

        if (btnWorkStart && btnWorkPause && btnWorkReset && btnWorkFinish) {
            btnWorkStart.onclick = () => {
                this.pomodoro.startSession();
                btnWorkStart.classList.add('hidden');
                btnWorkPause.classList.remove('hidden');
                btnWorkFinish.classList.remove('hidden');
            };

            btnWorkPause.onclick = () => {
                this.pomodoro.pauseSession();
                btnWorkStart.classList.remove('hidden');
                btnWorkPause.classList.add('hidden');
                btnWorkStart.innerText = "Resume Focus";
            };

            btnWorkReset.onclick = () => {
                this.pomodoro.resetSession();
            };

            btnWorkFinish.onclick = () => {
                if (confirm("Kết thúc phiên làm việc này?")) {
                    this.pomodoro.stopSession();
                    btnWorkStart.classList.remove('hidden');
                    btnWorkPause.classList.add('hidden');
                    btnWorkFinish.classList.add('hidden');
                    btnWorkStart.innerText = "Start Focus";
                    const distVal = document.getElementById('distance-value');
                    if (distVal) distVal.innerText = "Session Ended";
                }
            };
        }

        // Timer Events (relayed through WorkCompanion)
        this.pomodoro.on('tick', (data: any) => {
            const timerEl = document.getElementById('timer-text');
            if (timerEl) timerEl.innerText = data.time;

            // Update Circle
            const progressCircle = document.getElementById('timer-progress') as unknown as SVGCircleElement;
            if (progressCircle) {
                const total = data.totalSec || (25 * 60);
                const remaining = data.remainingSec || 0;
                const pct = remaining / total;

                // 2 * PI * 90 = 565.48
                const circumference = 565.48;
                const offset = circumference * (1 - pct);
                progressCircle.style.strokeDashoffset = offset.toString();

                // Color change based on status
                if (data.status === 'BREAK') {
                    progressCircle.style.stroke = 'var(--color-success)';
                } else {
                    progressCircle.style.stroke = 'var(--color-primary)';
                }
            }

            // Optional status visual
            const viewWork = document.getElementById('view-work');
            if (viewWork) {
                if (data.status === 'BREAK') {
                    viewWork.style.border = '2px solid var(--color-success)';
                } else {
                    viewWork.style.border = '2px solid transparent';
                }
            }
        });

        this.pomodoro.on('status_change', (data: any) => {
            if (data.status === 'IDLE') {
                btnWorkStart?.classList.remove('hidden');
                btnWorkPause?.classList.add('hidden');
                btnWorkFinish?.classList.add('hidden');
            }
        });

        this.pomodoro.on('nudge', (data: any) => {
            console.log("Nudge received:", data);
            // The notification is already handled inside WorkCompanion
        });

        this.pomodoro.on('auto_reset', (data: any) => {
            console.log("Auto-reset event", data);
            // Visual feedback for auto-reset
            const timerEl = document.getElementById('timer-text');
            if (timerEl) {
                timerEl.style.color = 'var(--color-success)';
                setTimeout(() => { timerEl.style.color = ''; }, 2000);
            }
        });

        this.pomodoro.on('metrics_update', (data: any) => {
            if (data.distance) {
                this._updateDistanceUI(data.distance);
            }
        });
    }

    _updateDistanceUI(dist: number) {
        const valEl = document.getElementById('distance-value');
        const fillEl = document.getElementById('distance-indicator');
        if (!valEl || !fillEl) return;

        valEl.innerText = `${Math.round(dist)} cm`;

        // Visual
        const maxDist = 80;
        const pct = Math.min(100, (dist / maxDist) * 100);
        fillEl.style.width = `${pct}%`;

        if (dist < 45) {
            fillEl.style.backgroundColor = 'var(--color-danger)';
            fillEl.classList.remove('ok');
        } else {
            fillEl.style.backgroundColor = 'var(--color-success)';
            fillEl.classList.add('ok');
        }
    }

    switchTab(tab: string) {
        // 1. Update Views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.getElementById(`view-${tab}`)?.classList.add('active');

        // 2. Update Sidebar Buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if ((btn as HTMLElement).dataset.tab === tab) {
                btn.classList.add('active');
            }
        });

        if (tab === 'stats') {
            this.stats.init();
        }

        if (tab === 'advisor') {
            this.advisor.reset();
        }
    }

    addChatMsg(sender: string, text: string) {
        const history = document.getElementById('chat-history');
        if (history) {
            const div = document.createElement('div');
            div.className = `message ${sender}`;
            div.innerText = text;
            history.appendChild(div);
            // Auto scroll to bottom
            history.scrollTop = history.scrollHeight;
        }
    }

    renderChoices(options: any[]) {
        const history = document.getElementById('chat-history');
        if (!history) return;

        const div = document.createElement('div');
        div.className = 'choice-container';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt.label;
            btn.onclick = () => {
                this.addChatMsg('user', opt.label);
                if (opt.value === 'yes' || opt.value === 'no') {
                    this.diagnosis.handleCameraDecision(opt.value);
                } else {
                    this.diagnosis.handleInput(opt.value);
                }
                div.remove();
            };
            div.appendChild(btn);
        });
        history.appendChild(div);
        // Auto scroll to bottom
        history.scrollTop = history.scrollHeight;
    }
    initSettings() {
        // 1. Theme Setup
        const themeToggle = document.getElementById('setting-theme-toggle') as HTMLInputElement;
        const savedTheme = localStorage.getItem('theme') || 'auto';
        this.setTheme(savedTheme);

        if (themeToggle) {
            themeToggle.checked = document.body.getAttribute('data-theme') === 'dark';
            themeToggle.addEventListener('change', (e) => {
                const isDark = (e.target as HTMLInputElement).checked;
                this.setTheme(isDark ? 'dark' : 'light');
            });
        }

        // 2. Work & Break Durations
        const workDurationInput = document.getElementById('setting-work-duration') as HTMLInputElement;
        const breakDurationInput = document.getElementById('setting-break-duration') as HTMLInputElement;

        if (workDurationInput) {
            const savedWork = localStorage.getItem('work_duration');
            if (savedWork) workDurationInput.value = savedWork;

            workDurationInput.addEventListener('change', () => {
                const val = parseInt(workDurationInput.value);
                if (val >= 1 && val <= 60) {
                    localStorage.setItem('work_duration', val.toString());
                    this.pomodoro.timer.init();
                } else {
                    alert("Work duration must be between 1 and 60 minutes.");
                    workDurationInput.value = "25";
                }
            });
        }

        if (breakDurationInput) {
            const savedBreak = localStorage.getItem('break_duration');
            if (savedBreak) breakDurationInput.value = savedBreak;

            breakDurationInput.addEventListener('change', () => {
                const val = parseInt(breakDurationInput.value);
                if (val >= 1 && val <= 30) {
                    localStorage.setItem('break_duration', val.toString());
                    this.pomodoro.timer.init();
                } else {
                    alert("Break duration must be between 1 and 30 minutes.");
                    breakDurationInput.value = "5";
                }
            });
        }

        // 3. Sound Toggle
        const soundToggle = document.getElementById('setting-sound-toggle') as HTMLInputElement;
        if (soundToggle) {
            const soundEnabled = localStorage.getItem('sound_enabled') !== 'false'; // default true
            soundToggle.checked = soundEnabled;

            soundToggle.addEventListener('change', () => {
                localStorage.setItem('sound_enabled', soundToggle.checked.toString());
            });
        }

        // 3b. Edge Lighting Toggle
        const edgeToggle = document.getElementById('setting-edge-toggle') as HTMLInputElement;
        if (edgeToggle) {
            const rawEdge = localStorage.getItem('edge_lighting_enabled');
            const edgeEnabled = rawEdge === null ? true : rawEdge === 'true';
            edgeToggle.checked = edgeEnabled;
            // Force save default if null
            if (rawEdge === null) localStorage.setItem('edge_lighting_enabled', 'true');

            edgeToggle.addEventListener('change', () => {
                localStorage.setItem('edge_lighting_enabled', edgeToggle.checked.toString());
            });
        }

        // 4. Test Camera
        const btnTestCam = document.getElementById('btn-check-camera');
        if (btnTestCam) {
            btnTestCam.onclick = async () => {
                btnTestCam.textContent = "Connecting...";
                try {
                    await this.camera.start(document.getElementById('assessment-video') as HTMLVideoElement);
                    document.getElementById('assessment-overlay')?.classList.remove('hidden');
                    btnTestCam.textContent = "Camera Active";

                    // Start a temporary loop to update HUD during test
                    const testInterval = setInterval(() => {
                        const metrics = this.camera.getSnapshotMetrics();
                        const hudDist = document.getElementById('hud-dist');
                        const hudEar = document.getElementById('hud-ear');
                        const hudBlinks = document.getElementById('hud-blinks');
                        const hudInc = document.getElementById('hud-incomplete');
                        const hudRate = document.getElementById('hud-rate');

                        if (hudDist) hudDist.innerText = Math.round(metrics.distance || 0).toString();
                        if (hudEar) hudEar.innerText = (metrics.ear || 0).toFixed(2);
                        if (hudBlinks) hudBlinks.innerText = (metrics.blinkCount || 0).toString();
                        if (hudInc) hudInc.innerText = (metrics.incompleteBlinkCount || 0).toString();
                        if (hudRate) hudRate.innerText = Math.round(metrics.blinkRate || 0).toString();
                    }, 100);

                    setTimeout(() => {
                        clearInterval(testInterval);
                        this.camera.stop();
                        document.getElementById('assessment-overlay')?.classList.add('hidden');
                        btnTestCam.textContent = "Test Camera";
                    }, 8000);
                } catch (e) {
                    btnTestCam.textContent = "Camera Failed";
                    alert("Could not start camera. Check permissions.");
                }
            };
        }

        // 5. Clear Data
        const btnReset = document.getElementById('btn-reset-data');
        if (btnReset) {
            btnReset.onclick = async () => {
                if (confirm("Are you sure? This will delete all your checkup history and stats.")) {
                    await this.db.resetData();
                    alert("All data cleared.");
                    location.reload();
                }
            };
        }
    }

    setTheme(theme: string) {
        if (theme === 'auto') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        } else {
            document.body.setAttribute('data-theme', theme);
        }
        localStorage.setItem('theme', theme);

        // Sync toggle if it exists
        const toggle = document.getElementById('setting-theme-toggle') as HTMLInputElement;
        if (toggle) toggle.checked = document.body.getAttribute('data-theme') === 'dark';
    }
}

new AppController();
