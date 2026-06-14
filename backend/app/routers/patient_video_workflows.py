import json
import mimetypes

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.patient_video_workflows import PatientChatWithMediaResponse
from app.services.patient_video_workflows import (
    PatientVideoWorkflowError,
    chat_with_media_using_reka,
)


router = APIRouter()

CHAT_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
CHAT_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _validate_upload_size(file_bytes: bytes, field_name: str) -> None:
    if not file_bytes:
        raise HTTPException(status_code=400, detail=f"Uploaded {field_name} is empty.")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail=f"{field_name} exceeds 25MB limit.")


def _normalized_content_type(upload: UploadFile) -> str:
    raw_type = (upload.content_type or "").split(";")[0].strip().lower()
    if raw_type:
        return raw_type
    guessed = mimetypes.guess_type(upload.filename or "")[0]
    return (guessed or "").strip().lower()


@router.post("/chat-with-media", response_model=PatientChatWithMediaResponse)
async def chat_with_media_route(
    message: str = Form(default=""),
    language: str = Form(default="en"),
    history_json: str = Form(default="[]"),
    image: UploadFile | None = File(default=None),
    video: UploadFile | None = File(default=None),
) -> PatientChatWithMediaResponse:
    normalized_message = message.strip()
    if not normalized_message and image is None and video is None:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if image is not None and video is not None:
        raise HTTPException(status_code=400, detail="Attach either one image or one video, not both.")

    history: list[dict] = []
    try:
        parsed_history = json.loads(history_json) if history_json.strip() else []
        if isinstance(parsed_history, list):
            history = [entry for entry in parsed_history if isinstance(entry, dict)]
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="history_json must be valid JSON array.") from exc

    image_bytes = None
    video_bytes = None
    if image is not None:
        image_type = _normalized_content_type(image)
        if not image_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Unsupported image format. Use JPG, PNG, or WEBP.")
        image_bytes = await image.read()
        _validate_upload_size(image_bytes, "image")

    if video is not None:
        video_type = _normalized_content_type(video)
        if not video_type.startswith("video/"):
            raise HTTPException(status_code=400, detail="Unsupported video format. Use MP4, WEBM, or MOV.")
        video_bytes = await video.read()
        _validate_upload_size(video_bytes, "video")

    try:
        return await chat_with_media_using_reka(
            message=normalized_message,
            language=language,
            history=history,
            image_bytes=image_bytes,
            image_filename=image.filename if image else None,
            image_content_type=_normalized_content_type(image) if image else None,
            video_bytes=video_bytes,
            video_filename=video.filename if video else None,
            video_content_type=_normalized_content_type(video) if video else None,
        )
    except PatientVideoWorkflowError as exc:
        raise HTTPException(status_code=getattr(exc, "status_code", 422), detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Media chat failed upstream.") from exc
