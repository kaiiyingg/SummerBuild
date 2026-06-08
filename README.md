# SummerBuild

A hospital web app. The repo has a React + Vite frontend and a FastAPI backend.

## Prerequisites
- Node.js 18+ and npm
- Python 3.10+

## Run the frontend
```bash
cd frontend
npm install
npm run dev
```
Then open the printed URL in your browser.

## Run the backend
### 1) Create or activate virtual environment (Windows PowerShell)
```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
```

### 2) Install dependencies
From `backend`:
```powershell
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3) Configure environment
Create or update `backend/.env`:
```env
REKA_API_KEY=your_reka_api_key_here
```

### 4) Start API server
From `backend`:
```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Environment files
- Frontend: optional. Add `VITE_` variables in `frontend/.env` only if needed.
- Backend: requires `REKA_API_KEY` in `backend/.env`.
