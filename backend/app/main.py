from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    chatbot,
    medication_verification,
    patient_medication_scan,
    patient_medication_speech,
    patient_video_workflows,
    speech_to_text,
)


app = FastAPI(title="Pilly Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chatbot.router, prefix="/api", tags=["chatbot"])
app.include_router(medication_verification.router, prefix="/api", tags=["medication-verification"])
app.include_router(patient_medication_scan.router, prefix="/api", tags=["patient-medication-scan"])
app.include_router(patient_medication_speech.router, prefix="/api", tags=["patient-medication-speech"])
app.include_router(patient_video_workflows.router, prefix="/api", tags=["patient-video-workflows"])
app.include_router(speech_to_text.router, prefix="/api", tags=["speech-to-text"])
