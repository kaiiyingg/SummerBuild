import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.routers import (
    chatbot,
    medication_verification,
    patient_medication_scan,
    patient_medication_speech,
    patient_video_workflows,
    push_notifications,
    speech_to_text,
)


app = FastAPI(title="Pilly Chatbot API")

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chatbot.router, prefix="/api", tags=["chatbot"])
app.include_router(medication_verification.router, prefix="/api", tags=["medication-verification"])
app.include_router(patient_medication_scan.router, prefix="/api", tags=["patient-medication-scan"])
app.include_router(patient_medication_speech.router, prefix="/api", tags=["patient-medication-speech"])
app.include_router(patient_video_workflows.router, prefix="/api", tags=["patient-video-workflows"])
app.include_router(push_notifications.router, prefix="/api", tags=["push-notifications"])
app.include_router(speech_to_text.router, prefix="/api", tags=["speech-to-text"])


@app.get("/")
def root():
    return {
        "service": "Pilly Chatbot API",
        "status": "ok",
        "docs": "/docs",
    }


@app.head("/")
def root_head():
    return Response(status_code=200)
@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.head("/healthz")
def healthz_head():
    return Response(status_code=200)
@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)
