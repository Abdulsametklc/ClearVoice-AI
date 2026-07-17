# ClearVoice AI

### Neural background-noise removal for speech — local, fast, and private

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-Async%20API-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/AI-Noise%20Reduction-10B981?style=for-the-badge&logo=pytorch&logoColor=white" alt="AI Noise Reduction" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />
</p>

---

**ClearVoice AI** is a premium, locally running audio denoising tool. Upload a recording or video, adjust strength, and get a cleaned speech track — powered by Facebook Denoiser and classical spectral reduction, wrapped in a modern dark SaaS UI.

## UI Preview

![UI Preview](assets/preview.png)

> Add your screenshot at `assets/preview.png` to showcase the interface.

## Key Features

- 🎙️ **AI speech enhancement** — Facebook Denoiser (dns64) isolates voice from fans, keyboards, and room noise
- 🎚️ **Tunable strength** — dial noise reduction from gentle to aggressive (30–100%)
- 🔀 **Multiple methods** — AI, classic spectral reduction, or a strong combo pipeline
- 📁 **Broad format support** — MP3, WAV, M4A, FLAC, OGG, and video containers (MP4, MKV, WEBM) via FFmpeg
- 🎧 **A/B playback** — compare original vs cleaned audio side by side
- ⬇️ **One-click export** — download WAV (lossless) or MP3
- 🌙 **Modern dark UI** — React + Tailwind, glassmorphism panels, emerald accents
- 🔒 **Local-first privacy** — files stay on your machine; no cloud upload required

## Tech Stack & Architecture

| Layer | Technology | Role |
| --- | --- | --- |
| **UI** | React 19, Vite, Tailwind CSS 4, Lucide | Drag-and-drop workspace, settings, players |
| **API** | FastAPI + Uvicorn | `POST /api/clean` multipart upload → cleaned file |
| **Engine** | `cleaner.py` | Extract → denoise → normalize → export |
| **Models / DSP** | PyTorch, Facebook Denoiser, noisereduce, librosa | Neural + spectral noise reduction |
| **Media** | FFmpeg, soundfile | Decode audio/video, write WAV/MP3 |

```text
┌─────────────────┐     FormData      ┌──────────────┐     clean_audio()     ┌─────────────┐
│  React frontend │ ───────────────► │  FastAPI     │ ───────────────────► │  cleaner.py │
│  (Vite build)   │ ◄─────────────── │  /api/clean  │ ◄─────────────────── │  Denoiser   │
└─────────────────┘   cleaned audio   └──────────────┘                      └─────────────┘
```

Legacy Gradio entry (`app.py`) remains available; the primary path is **FastAPI + React** via `api.py` and `baslat.bat`.

## Live / Permanent Hosting

**Recommended (simple & free):** [Render](https://render.com) Docker free tier.

| Layer | Host | Notes |
| --- | --- | --- |
| **Full app** | Render | Classical noise reduction (lite, reliable on free RAM) |
| **UI mirror** | GitHub Pages | Optional; points at the Render API |

### Deploy on Render (2 minutes)

1. Open: https://render.com/deploy?repo=https://github.com/Abdulsametklc/ClearVoice-AI  
2. Sign in with GitHub → **Create Web Service**  
3. Wait for the first build (~5–10 min)

App URL will look like: `https://clearvoice-ai.onrender.com`

> Free Render services sleep after idle; first request may take ~30–60s to wake.

Local full AI (PyTorch) still works with `baslat.bat` / `requirements.txt`.  
Cloud lite mode sets `CLEARVOICE_LITE=1` and maps AI methods to classical `noisereduce`.

### Optional: GitHub Pages UI

1. Repo **Settings → Pages → Source**: **GitHub Actions**  
2. After Render is live, set Pages build `VITE_API_BASE` to your Render URL if different.

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm (frontend build)
- **FFmpeg** on your `PATH`
- Optional: CUDA-capable GPU for faster inference

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Abdulsametklc/ClearVoice-AI.git
cd ClearVoice-AI
```

### 2. Create a virtual environment

**Windows (PowerShell):**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Install and build the frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. Run the application

**Recommended (Windows):** double-click or run:

```bat
baslat.bat
```

**Or manually:**

```bash
python api.py
```

Open **http://127.0.0.1:7861** in your browser.

### Development mode (hot reload UI)

```bat
baslat-dev.bat
```

- API: http://127.0.0.1:7861  
- Vite UI: http://127.0.0.1:5173  

## API (brief)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/clean` | Upload file + `strength`, `method`, `output_format` → cleaned audio |

## Project Structure

```text
├── api.py                   # FastAPI app (serves API + built UI)
├── cleaner.py               # Noise-reduction engine (core logic)
├── app.py                   # Optional Gradio UI (legacy)
├── Dockerfile               # Production image (HF Spaces / cloud)
├── requirements.txt
├── requirements-docker.txt
├── deploy-hf.ps1            # Deploy to Hugging Face Spaces
├── baslat.bat               # Build frontend + start server (local)
├── baslat-dev.bat           # API + Vite dev server
├── frontend/                # React + Tailwind source
├── assets/                  # Screenshots (preview.png)
└── README.md
```

## License

This project is released under the **MIT License**.

```text
MIT License

Copyright (c) 2026 ClearVoice AI contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

<p align="center">
  <strong>ClearVoice AI</strong> — clean speech, locally.
</p>
