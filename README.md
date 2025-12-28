# 👁️ DryEyeGuard (AI Companion)

A comprehensive local-first application for dry eye prevention, featuring real-time computer vision analysis, Pomodoro workflow, and AI-driven health assessments.

## 🚀 How to Run (Quick Start)

Since this project uses ES6 Modules (`import/export`), you cannot simply double-click `index.html`. You must serve it via a local web server to avoid CORS errors.

### Option 1: VS Code Live Server (Recommended)
1. Install the **Live Server** extension in VS Code.
2. Right-click on `index.html` in the file explorer.
3. Select **"Open with Live Server"**.
4. The app will open in your default browser at `http://127.0.0.1:5500`.

### Option 2: Python HTTP Server
If you have Python installed, run this terminal command in the project folder:
```bash
# Python 3
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

## 📂 Project Structure

- **src/**
  - **modules/**
    - `camera/`: Real-time CV logic (MediaPipe wrapper, Blink detection).
    - `core/`: App orchestration (`WorkCompanion`, `ConsentManager`).
    - `checkup/`: Diagnostic logic (`DiagnosticFlow`, `RiskPrediction`).
    - `pomodoro/`: Logic for breaks and nudges (`PolicyEngine`).
    - `fusion/`: Algorithm to combine Subjective + Objective data.
    - `chatbot/`: Logic for advice generation.
  - `AppController.js`: Main entry point binding UI to Logic.
- `index.html`: Main UI Views.
- `styles.css`: Dark mode styling.

## 🛠️ Key Features

1.  **Work Companion Mode**: 
    - 25-minute focus timer.
    - **Privacy-First Camera Check**: Validates posture every 12 mins (Mid-check).
    - **Distance Bar**: Visual feeback for screen distance (Red/Yellow/Green).

2.  **Eye Checkup Mode**:
    - **Chatbot Interface**: Conducts OSDI symptom survey.
    - **Hybrid Diagnosis**: Combines survey score with ML simulation.
    - **Camera Assessment**: Optional 10s video test to measure Blink Rate/Eye Closure.

3.  **Privacy**:
    - All camera processing is **On-Device** (Client-side JS).
    - Video streams are destroyed immediately after metric extraction.
    - User Consent is required and persistent.

## ⚠️ Known Limitations (Demo)
- **Assets**: Audio files (`chime.mp3`) need to be placed in `assets/sounds/` manually.
- **Backend**: ML Model is currently a heuristic simulation (`RiskPredictionService.js`) for demonstration purposes.

---
*Built for Datathon 2025*
