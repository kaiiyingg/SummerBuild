# 💊 Pilly — AI-Powered Hospital Pharmacy Assistant

**Team Sunsetters** · NTU Summer Build

Pilly streamlines hospital pharmacy workflows for both pharmacists and patients using AI to catch dispensing errors before they happen, and giving patients real-time visibility into their medications and queue status.

---

## The Problem

Pharmacists perform multiple layers of manual verification including checking medication identity, dosage, and quantity for every single patient, all day long. This work is essential for patient safety, but it's repetitive, fatiguing, and leaves little room for error. Meanwhile, patients are often left in the dark. Having no visibility into delays, no way to track their queue remotely, and language barriers that make it hard to understand medication instructions.

**Pilly tackles five concrete pain points:**

| No. | Pain Point | Solution |
|---|---|---|
| 1 | **Verification Fatigue & Human Error**: Repetitive medication/quantity checks increase mistakes from fatigue and lost focus. | AI-powered medication & quantity verification acts as an extra checking layer, reducing errors and boosting confidence. |
| 2 | **Poor Visibility of Delays**: Patients unaware of delays leads to confusion and frustration directed at pharmacists. | **Put On Hold** notifications instantly inform patients of delays and reasons via the app, ensuring transparency. |
| 3 | **Long Waits & Missed Queue Numbers**: Patients stepping away to rest or eat miss their number and must rejoin. | **Real-Time Queue Tracking** lets patients monitor progress remotely, reducing missed queues and disputes. |
| 4 | **Language Barriers & Poor Adherence**: Pharmacists struggle to explain instructions, and patients forget dosing later. | **Medication Scan Assistant** delivers info in plain language; **Reminder System** keeps patients on track with treatment. |
| 5 | **High Enquiry Volume & Limited Staff** : Pharmacists are overwhelmed by routine calls, especially during peak dispensing periods. | **AI Q&A Assistant** gives instant answers on medication and app usage, freeing pharmacists for higher-value clinical work. |

---

## Key Features

### For Pharmacists
- **Live Queue Dashboard**: Real-time view of every patient's status (Pending, On Hold, Ready, Collected), with filtering and search.
- **AI Medication Verification**: Scan a medication label; the AI reads it and cross-checks it against the prescription, flagging mismatches.
- **AI Pill Counting**: Count pills directly from a photo for a fast, accurate second check on quantity.
- **One-Tap Medication Reminders**: Auto-populated from the prescription, controlled by pharmacist and sent to the patient in a single tap.
- **On-Hold Reason Capture**: Requires a reason when an order is paused, encouraging single-session packing and reducing errors.

### For Patients
- **QR Code Entry**: Patients scan a QR code on arrival at the pharmacy to access Pilly directly in their browser, skipping app store downloads entirely for a frictionless walk-in experience.
- **Live Registration & Collection Queue**: Real-time position, estimated wait time, and people ahead, with one-tap re-registration if a queue number is missed.
- **Real-Time Push Notifications**: Patients are notified the moment their queue is called, their order is delayed, or a reminder is due, even while the app is in the background.
- **Reschedule Collection**: Pick a new date/time slot directly in the app.
- **Medications Dashboard**: Every prescribed medication with dosage, purpose, instructions, and caution labels, with text-to-speech support.
- **Scan Medication Label**: Point the camera at any label, bottle, or sticker to get a plain-language breakdown (name, dosage, side effects, storage).
- **Personalised Reminders**: Pharmacist-initiated, patient-adjustable medication schedules.
- **Ask Pilly (Chatbot)**: Ask about medications, side effects, or pharmacy info via text, voice, photo, or video which is available outside pharmacy hours.
- **Profile & Preferences**: View patient ID, registered hospital, and visit history; set a persistent language preference; toggle notifications for queue updates, reminders, and delay alerts individually.
- **4-Language Support**: English, 中文, Bahasa Melayu, and தமிழ், across the entire patient experience, including scan and chatbot results.
- **Accessible, Senior-Friendly UI**: Large fonts, high-contrast layouts, and simple navigation designed for elderly patients, fully responsive across laptop and mobile screens.

---

## Demo Video
 
📺 [Watch the Pilly Demo](https://youtu.be/iFPMjVzcIf0)

---
## Tech Stack

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

## Engineering Challenges We Solved

### 1. Pill Counting with Computer Vision Limitations
Silver foil packaging caused glare that washed out pocket edges and the model defaulted to assuming even-numbered layouts which miscounts odd-sized strips (e.g. a pack of 7). Prompt refinement on Reka AI didn't fix it; switching the counting step to **GPT-4.1 vision** resolved both the glare and odd-count issues.

### 2. Real-Time Translation & Reka AI's Language Limitations
Translating the full patient UI at runtime was slow and costly. Reka AI alone couldn't reliably translate Malay or Tamil. We split the pipeline: **Reka AI extracts text → GPT-4.1 translates it**, giving accurate results across all four supported languages without the runtime cost.

---

## Future Improvements

### 1. Multilingual & Dialect Voice Translation Support
Expand support to additional languages and local dialects to further improve accessibility and reduce communication barriers for diverse patient groups.

### 2. GPS-Based Queue Recall & Navigation Guidance
Use location awareness to detect when patients are far from the pharmacy and proactively notify them when their turn is approaching. Navigation assistance can also help patients return to the correct location on time.

### 3. Robot Interaction for Internal Pharmacy Logistics
Many hospital pharmacies already utilise autonomous robots for medication transportation. A future enhancement would allow pharmacists to summon robots directly to their workstation or dispensing counter, reducing unnecessary movement and improving workflow efficiency.

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
