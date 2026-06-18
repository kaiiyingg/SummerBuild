# 💊 Pilly — AI-Powered Hospital Pharmacy Assistant

**Team Sunsetters** · NTU Summer Build

Pilly streamlines hospital pharmacy workflows for both pharmacists and patients using AI to catch dispensing errors before they happen, and giving patients real-time visibility into their medications and queue status.

---

## 🚀 The Problem

Pharmacists perform multiple layers of manual verification including checking medication identity, dosage, and quantity for every single patient, all day long. This work is essential for patient safety, but it's repetitive, fatiguing, and leaves little room for error. Meanwhile, patients are often left in the dark. Having no visibility into delays, no way to track their queue remotely, and language barriers that make it hard to understand medication instructions.

**Pilly tackles five concrete pain points:**

| # | Pain Point | How Pilly Solves It |
|---|---|---|
| 1 | Verification fatigue & human error | AI-powered medication & quantity verification as a second check |
| 2 | Poor visibility into delays | "Put On Hold" notifications explain delays to patients instantly |
| 3 | Missed queue numbers from long waits | Real-time queue tracking, viewable remotely |
| 4 | Language barriers & poor adherence | Multilingual scan assistant + automated medication reminders |
| 5 | High volume of routine enquiries | AI Q&A chatbot handles common questions 24/7 |

---

## ✨ Key Features

### For Pharmacists
- **Live Queue Dashboard** — real-time view of every patient's status (Pending, On Hold, Ready, Collected), with filtering and search.
- **AI Medication Verification** — scan a medication label; the AI reads it and cross-checks it against the prescription, flagging mismatches.
- **AI Pill Counting** — count pills directly from a photo for a fast, accurate second check on quantity.
- **One-Tap Medication Reminders** — auto-populated from the prescription, controlled by pharmacist and sent to the patient in a single tap.
- **On-Hold Reason Capture** — requires a reason when an order is paused, encouraging single-session packing and reducing errors.


### For Patients
- **QR Code Entry** — patients scan a QR code on arrival at the pharmacy to access Pilly directly in their browser, skipping app store downloads entirely for a frictionless walk-in experience.
- **Live Registration & Collection Queue** — real-time position, estimated wait time, and people ahead, with one-tap re-registration if a queue number is missed.
- **Real-Time Push Notifications** — patients are notified the moment their queue is called, their order is delayed, or a reminder is due, even while the app is in the background.
- **Reschedule Collection** — pick a new date/time slot directly in the app.
- **Medications Dashboard** — every prescribed medication with dosage, purpose, instructions, and caution labels, with text-to-speech support.
- **Scan Medication Label** — point the camera at any label, bottle, or sticker to get a plain-language breakdown (name, dosage, side effects, storage).
- **Personalised Reminders** — pharmacist-initiated, patient-adjustable medication schedules.
- **Ask Pilly (Chatbot)** — ask about medications, side effects, or pharmacy info via text, voice, photo, or video — available outside pharmacy hours.
- **4-Language Support** — English, 中文, Bahasa Melayu, and தமிழ், across the entire patient experience, including scan and chatbot results.
- **Accessible, Senior-Friendly UI** — large fonts, high-contrast layouts, and simple navigation designed for elderly patients, fully responsive across laptop and mobile screens.

---

## 🎥 Demo Video
 
📺 [Watch the Pilly Demo](https://youtu.be/iFPMjVzcIf0)

---
## 🏗️ Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | React 19 + Vite + TypeScript, Tailwind CSS v4, React Router, lucide-react |
| **Backend** | Python — FastAPI (served by Uvicorn) |
| **Database** | Supabase (PostgreSQL) — `patients`, `patient_medications`, `notifications`, `hold_reasons`, `queue` |
| **Auth** | Supabase Auth (email/password) |
| **AI — Core** | Reka AI (`reka-flash`) — multilingual chatbot, label scanning (vision OCR), video scan & chat-with-media, pharmacist medication-identity verification |
| **AI — Supporting** | OpenAI Whisper (`whisper-1`) speech-to-text · `gpt-4o-mini-tts` read-aloud · `gpt-4.1` pill-quantity counting |
| **Translation / i18n** | OpenAI for patient-UI translation + custom React `LanguageContext` (EN · 中文 · Bahasa Melayu · தமிழ்) |
| **Media Handling** | Multipart upload to FastAPI; images/video base64-encoded to AI APIs |
| **Notifications** | PWA push via Web Push API, Service Worker + VAPID keys, FastAPI → Supabase subscriptions |
| **Dev Tooling** | Node.js + npm scripts, ESLint, Python venv |

---

## 🧩 Engineering Challenges We Solved

**1. AI pill counting on reflective blister packs**
Silver foil packaging caused glare that washed out pocket edges, and the model defaulted to assuming even-numbered layouts — miscounting odd-sized strips (e.g. a pack of 7). Prompt refinement on Reka AI didn't fix it; switching the counting step to **GPT-4.1 vision** resolved both the glare and odd-count issues.

**2. Real-time 4-language translation**
Translating the full patient UI at runtime was slow and costly. Reka AI alone couldn't reliably translate Malay or Tamil. We split the pipeline: **Reka AI extracts text → GPT-4.1 translates it**, giving accurate results across all four supported languages without the runtime cost.

---

## 🔮 Future Improvements

- **Dialect-aware voice translation** — expand beyond 4 languages to support local dialects for fuller accessibility.
- **GPS-based queue recall & navigation** — detect when a patient has stepped away and proactively guide them back before their turn, accounting for walking distance.
- **Robotics for internal logistics** — automate transport of medications from storage to packing stations to further reduce pharmacist manual workload.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### 1. Install frontend dependencies
```bash
npm run setup:frontend
```

### 2. Create the backend virtual environment and install Python packages
```bash
npm run setup:backend
```

### 3. Configure backend API keys
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
```env
REKA_API_KEY=your_reka_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=marin
OPENAI_TTS_SPEED=1.0
```

### 4. Configure frontend Supabase settings
```bash
cp frontend/.env.example frontend/.env
```
Edit `frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 5. Set up Supabase tables, auth profile sync, and demo data
Run one of these SQL files in **Supabase Dashboard → SQL Editor**:
- `backend/db/table.sql` — base schema only
- `backend/db/supabase_pharmacy_seed.sql` — base schema **plus** demo queue, medications, and reminder seed data

For a seamless demo experience:
- In **Authentication → Providers → Email**, ensure Email auth is enabled.
- Disable email confirmation if you want users to land in the app immediately after sign-up.
- If email confirmation stays enabled, registration succeeds but users must confirm their email before first login.

### 6. (Optional) Preflight check
```bash
npm run check:setup
```

### 7. Run both apps together
```bash
npm run dev
```
This starts:
- **Frontend** — Vite dev server (`frontend/`) → `http://127.0.0.1:5173`
- **Backend** — FastAPI → `http://127.0.0.1:8000`

### Run each app separately
```bash
npm run dev:frontend   # frontend only
npm run dev:backend    # backend only
```

From `frontend/` you can also run the standard `npm run dev`, `npm run build`, `npm run preview`, and `npm run lint`.

### Environment files summary
- **Frontend** — `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env`
- **Backend** — `REKA_API_KEY` required in `backend/.env`
- **Backend TTS** — `OPENAI_API_KEY` required for read-aloud; `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_TTS_SPEED` are optional overrides

---

## 👥 Team Sunsetters

| Name | Matriculation No. |
|---|---|
| Ho Shi Yu | U2423063A |
| Chong Kai Ying | U2421513A |
| Chen Jia Wei | U2422565J |
| Tan Zi Xuan | U2422677H |
| Tan Shu Yi, Stefanie | U2421711B |
