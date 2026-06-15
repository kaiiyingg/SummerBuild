import mimetypes

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.patient_medication_scan import PatientMedicationScanResponse
from app.services.patient_medication_scan import (
    PatientMedicationScanError,
    get_localized_scan_message,
    scan_medication_label,
)
from app.services.patient_video_workflows import (
    PatientVideoWorkflowError,
    scan_medication_video_with_reka_chat,
)


router = APIRouter()
MAX_VIDEO_UPLOAD_BYTES = 25 * 1024 * 1024


def _normalized_content_type(upload: UploadFile) -> str:
    raw_type = (upload.content_type or "").split(";")[0].strip().lower()
    if raw_type:
        return raw_type
    guessed = mimetypes.guess_type(upload.filename or "")[0]
    return (guessed or "").strip().lower()


@router.post("/scan-medication-label", response_model=PatientMedicationScanResponse)
async def scan_medication_label_route(
    image: UploadFile = File(...),
    language: str = Form(default="en"),
) -> PatientMedicationScanResponse:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file.")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    try:
        return await scan_medication_label(
            image_bytes=image_bytes,
            filename=image.filename,
            content_type=image.content_type,
            language=language,
        )
    except PatientMedicationScanError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=get_localized_scan_message("service_unavailable", language),
        ) from exc


@router.post("/scan-medication-video", response_model=PatientMedicationScanResponse)
async def scan_medication_video_route(
    video: UploadFile = File(...),
    language: str = Form(default="en"),
) -> PatientMedicationScanResponse:
    video_type = _normalized_content_type(video)
    if not video_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Upload must be an MP4, MOV, or WEBM video.")

    video_bytes = await video.read()
    if not video_bytes:
        raise HTTPException(status_code=400, detail="Uploaded video is empty.")
    if len(video_bytes) > MAX_VIDEO_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Video exceeds 25MB limit.")

    try:
        return await scan_medication_video_with_reka_chat(
            video_bytes=video_bytes,
            filename=video.filename,
            content_type=video_type,
            language=language,
        )
    except PatientVideoWorkflowError as exc:
        raise HTTPException(status_code=getattr(exc, "status_code", 422), detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=get_localized_scan_message("service_unavailable", language),
        ) from exc
