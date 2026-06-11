# SummerBuild

A hospital web app with a React + Vite frontend and a FastAPI backend.

## Prerequisites
- Node.js 18+ and npm
- Python 3.10+

## Quick start from the repo root

### 1) Install frontend dependencies
```bash
npm run setup:frontend
```

### 2) Create the backend virtual environment and install Python packages
```bash
npm run setup:backend
```

### 3) Add the backend API keys
```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:
```env
REKA_API_KEY=your_reka_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=marin
OPENAI_TTS_SPEED=1.0
```

### 4) Optional preflight check
```bash
npm run check:setup
```

### 5) Run both apps together
```bash
npm run dev
```

This starts:
- Frontend: Vite dev server from `frontend/` on `http://127.0.0.1:5173`
- Backend: FastAPI on `http://127.0.0.1:8000`

## Run each app separately

### Frontend only
```bash
npm run dev:frontend
```

### Backend only
```bash
npm run dev:backend
```

## Existing frontend commands

From `frontend/` you can still use:
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Environment files
- Frontend: optional. Add `VITE_` variables in `frontend/.env` only if needed.
- Backend: requires `REKA_API_KEY` in `backend/.env`.
- Backend TTS: patient medication read-aloud uses `OPENAI_API_KEY`. `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, and `OPENAI_TTS_SPEED` are optional overrides.
