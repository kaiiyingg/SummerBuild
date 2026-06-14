from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.speech_to_text import transcribe_audio

router = APIRouter()


@router.post("/speech-to-text")
async def speech_to_text_route(
    audio: UploadFile = File(...),
    language: str = Form("en"),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio data received.")
    try:
        text = await transcribe_audio(
            audio_bytes=audio_bytes,
            filename=audio.filename or "audio.webm",
            language=language,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Transcription temporarily unavailable.") from exc

    return {"text": text}
