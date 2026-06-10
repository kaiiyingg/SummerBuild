from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.patient_medication_scan import PatientMedicationScanResponse
from app.services.patient_medication_scan import (
    PatientMedicationScanError,
    get_localized_scan_message,
    scan_medication_label,
)


router = APIRouter()


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
