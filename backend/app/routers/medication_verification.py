from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.medication_verification import MedicationVerificationResponse
from app.services.medication_verification import (verify_medication_image,verify_medication_identity)


router = APIRouter()

@router.post("/verify-medication-identity")
async def verify_medication_identity_route(
    image: UploadFile = File(...),
    expected_medication: str = Form(...),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Identity upload must be an image file."
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Identity image is empty."
        )

    try:
        return await verify_medication_identity(
            image_bytes=image_bytes,
            filename=image.filename,
            content_type=image.content_type,
            expected_medication=expected_medication,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Medication identity verification error: {exc}"
        ) from exc

@router.post("/verify-medication-image", response_model=MedicationVerificationResponse)
async def verify_medication_image_route(
    image: UploadFile = File(...),
    identity_image: UploadFile | None = File(default=None),
    expected_medication: str = Form(...),
    expected_quantity: int = Form(...),
) -> MedicationVerificationResponse:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Quantity upload must be an image file.")

    if identity_image and (
        not identity_image.content_type or not identity_image.content_type.startswith("image/")
    ):
        raise HTTPException(status_code=400, detail="Identity upload must be an image file.")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Quantity image is empty.")

    identity_image_bytes = None
    if identity_image:
        identity_image_bytes = await identity_image.read()
        if not identity_image_bytes:
            raise HTTPException(status_code=400, detail="Identity image is empty.")

    try:
        return await verify_medication_image(
            image_bytes=image_bytes,
            filename=image.filename,
            content_type=image.content_type,
            identity_image_bytes=identity_image_bytes,
            identity_filename=identity_image.filename if identity_image else None,
            identity_content_type=identity_image.content_type if identity_image else None,
            expected_medication=expected_medication,
            expected_quantity=expected_quantity,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Medication verification error: {exc}") from exc
