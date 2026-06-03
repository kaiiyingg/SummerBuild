# SummerBuild

A hospital web app. The repo has a React + Vite **frontend** and a (not-yet-built) **backend**.

## Prerequisites
- Node.js 18+ and npm

## Run the frontend
```bash
cd frontend
npm install        # first time only
npm run dev        # starts Vite dev server (usually http://localhost:5173)
```
Then open the printed URL in your browser.

Other scripts: `npm run build` (production build), `npm run preview` (preview build), `npm run lint`.

## Environment files
- **Frontend**: optional. The frontend currently uses no env vars, so no `.env` is
  required to run it. A `frontend/.env.example` is provided for future use — copy it
  to `frontend/.env` if you add `VITE_`-prefixed variables.
- **Backend**: not implemented yet (only `backend/db/table.sql` exists). A
  `backend/.env.example` is provided as a placeholder for the eventual DB/API config.
