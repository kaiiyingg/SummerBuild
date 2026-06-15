from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.schemas.patient_medication_speech import PatientMedicationSpeechRequest
from app.services.patient_medication_speech import (
    PatientMedicationSpeechError,
    get_localized_speech_message,
    synthesize_patient_medication_speech,
)


router = APIRouter()


@router.post("/scan-medication-speech")
async def scan_medication_speech_route(
    payload: PatientMedicationSpeechRequest,
) -> Response:
    try:
        audio_bytes = await synthesize_patient_medication_speech(
            text=payload.text,
            language=payload.language,
        )
    except PatientMedicationSpeechError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=get_localized_speech_message("tts_unavailable", payload.language),
        ) from exc

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": 'inline; filename="scan-medication-speech.mp3"',
        },
    )
