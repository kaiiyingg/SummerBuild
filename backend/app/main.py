import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

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

STATIC_DIR_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "static",
    Path(__file__).resolve().parents[2] / "frontend" / "dist",
]

STATIC_DIR = next((directory for directory in STATIC_DIR_CANDIDATES if directory.exists()), STATIC_DIR_CANDIDATES[0])
INDEX_FILE = STATIC_DIR / "index.html"
ASSETS_DIR = STATIC_DIR / "assets"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/")
def root():
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return Response(
        "<h1>Frontend build not found</h1><p>Expected: /app/static/index.html</p>",
        media_type="text/html",
        status_code=503,
    )


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
    icon_file = STATIC_DIR / "favicon.ico"
    if icon_file.exists():
        return FileResponse(icon_file)
    return Response(status_code=204)


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    candidate = STATIC_DIR / full_path
    if candidate.is_file():
        return FileResponse(candidate)

    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)

    return Response(
        "<h1>Frontend build not found</h1><p>Expected: /app/static/index.html</p>",
        media_type="text/html",
        status_code=503,
    )
