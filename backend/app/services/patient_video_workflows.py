import ast
import base64
import json
import mimetypes
import re

from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI

from app.core.config import settings
from app.schemas.patient_medication_scan import PatientMedicationScanResponse
from app.schemas.patient_video_workflows import PatientChatWithMediaResponse


client = AsyncOpenAI(api_key=settings.REKA_API_KEY, base_url="https://api.reka.ai/v1")

SUPPORTED_LOCALES = {
    "en": "English",
    "zh": "Chinese",
    "ms": "Malay",
    "ta": "Tamil",
}

SCAN_SYSTEM_PROMPT = """You are Pilly's Medication Label Scanner. Read the medication shown in the video and report what is on it. Do your best to read as much as you can, then fill in the result format below.

STEP 1 — TRANSCRIBE (this drives the scan results shown to the patient):
- Read every readable line of text across all visible frames of the video.
- Put each line, exactly as printed, into detected_text_lines — verbatim, character for character.
- Do NOT correct spelling, expand abbreviations, translate, reorder, or "clean up" the text in detected_text_lines.
- Include every line you can reasonably read across the frames. If a few characters are slightly blurry or glared, use your best reading rather than dropping the whole line; only omit text that is genuinely illegible. Never invent text that is not shown.
- If no text is clearly readable, return detected_text_lines as an empty array.

STEP 2 — EXTRACT:
- Use the text you read to fill medication_name, generic_name, strength, dosage_form, quantity, refills,
  directions_original, warnings_original, and summary_original.
- Fill in every field you can; leave a field empty only if you truly have nothing for it.
- Do not invent label text that is not actually shown on the medication.

STEP 3 — TRANSLATE:
- *_translated fields are translations of the corresponding *_original field into the target language only.
- If the original field is empty, its translation must also be empty.

KNOWLEDGE-BASED FIELDS:
- medication_overview_translated, how_to_take_points_translated, side_effects_translated,
  precautions_translated, and storage_translated may use general medication knowledge
  to briefly help the patient understand the medicine when you can identify it.
- Keep them short, general, and never patient-specific.

CONFIDENCE & REVIEW:
- confidence (0–1) reflects how much of the label you could read clearly, not how confident you are about the medication in general.
- Fill in every field that is supported by readable text — do not leave a field empty when the label clearly shows it.
- Use needs_review = true only as a gentle flag when part of the label was unclear, and keep review_reason to a short "please double-check with your pharmacist" note. Always return all the information you could read; never refuse or withhold readable fields.

OUTPUT:
- Return strict JSON only, with exactly these keys and no others:
  packaging_type, medication_name, generic_name, strength, dosage_form,
  quantity, refills, directions_original, directions_translated,
  warnings_original, warnings_translated, summary_original, summary_translated,
  medication_overview_translated, how_to_take_points_translated,
  side_effects_translated, precautions_translated, storage_translated,
  detected_language, target_language, confidence, needs_review, review_reason,
  detected_text_lines, text_for_speech
- packaging_type ∈ {bottle, box, blister_pack, pharmacy_label, warning_sticker, packet, unclear}.
- Strings: medication_name, generic_name, strength, dosage_form, quantity, refills, directions_original, directions_translated, summary_original, summary_translated, medication_overview_translated, detected_language, target_language, review_reason, text_for_speech.
- Arrays of strings: warnings_original, warnings_translated, detected_text_lines, how_to_take_points_translated, side_effects_translated, precautions_translated, storage_translated.
"""

SCAN_REPAIR_PROMPT = """Convert the medication scan output below into valid JSON only.

Rules:
- Return only JSON, with no markdown or commentary.
- Keep existing meaning; do not invent new medication facts.
- Use these exact keys only:
  packaging_type, medication_name, generic_name, strength, dosage_form,
  quantity, refills, directions_original, directions_translated,
  warnings_original, warnings_translated, summary_original, summary_translated,
  medication_overview_translated, how_to_take_points_translated,
  side_effects_translated, precautions_translated, storage_translated,
  detected_language, target_language, confidence, needs_review, review_reason,
  detected_text_lines, text_for_speech
"""

PILLY_MEDICATION_ASSISTANT_SYSTEM_PROMPT = """You are Pilly, a hospital pharmacy assistant for media-based questions.

Goal:
- Give accurate, concise, patient-friendly answers on medicines and pharmacy basics:
  uses, dose timing, side effects, interactions, precautions, storage, and terms like "take with food".
- Help identify medications from images/videos when possible.
- Review medication handling shown in media and explain whether it appears correct.
- Give general wellness advice for mild symptoms and when to seek care.

Safety rules:
- Do not diagnose conditions.
- Do not prescribe or choose prescription medicines for the user.
- If unsafe handling is suspected (for example crushing/splitting extended-release or enteric-coated medicine), start with a clear warning and safer next step.
- If unsure, media is unclear, or risk is meaningful, say so clearly and advise contacting a pharmacist or doctor.
- Never invent facts, policies, or patient-specific details.

Style:
- Keep replies short, clear, and practical.
- Avoid jargon; use simple language.
- If the user intent is unclear (including when no typed text is provided), ask one concise clarifying question.
"""

MEDIA_CONTEXT_GUIDANCE = """Media handling guidance:
- The user may upload an image or short video.
- For image uploads: analyze the visible medication, label, packaging, and handling context.
- For video uploads: analyze the full clip for handling steps and safety risks. The user may ask their question inside the video.
- If the question seems to be spoken in the video but intent is still unclear from available signals, ask the user to type the question clearly.
"""


class PatientVideoWorkflowError(Exception):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


def _extract_status_error_detail(exc: APIStatusError) -> str:
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        error_obj = body.get("error")
        if isinstance(error_obj, dict):
            message = error_obj.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()
        message = body.get("message")
        if isinstance(message, str) and message.strip():
            return message.strip()
    response = getattr(exc, "response", None)
    if response is not None:
        text = getattr(response, "text", None)
        if isinstance(text, str) and text.strip():
            return text.strip()
    return str(exc).strip()


def _humanize_reka_error(exc: Exception, *, workflow: str) -> str:
    if isinstance(exc, APITimeoutError):
        return f"Reka {workflow} timed out. Try a shorter clip or retry."
    if isinstance(exc, APIConnectionError):
        return f"Cannot connect to Reka {workflow} service. Check internet and API base URL."
    if isinstance(exc, APIStatusError):
        detail = _extract_status_error_detail(exc)
        status = exc.status_code
        if status == 400:
            return f"Reka rejected the request: {detail or 'invalid media or parameters.'}"
        if status == 401:
            return "Reka API key is invalid or missing."
        if status == 403:
            return "Reka request was forbidden. Check API key permissions."
        if status == 413:
            return "Uploaded media is too large for Reka processing."
        if status == 415:
            return "Unsupported media format for Reka. Use MP4, WEBM, or MOV."
        if status == 429:
            return "Reka rate limit reached. Please retry shortly."
        if status >= 500:
            return f"Reka service error ({status}). Please retry."
        return f"Reka request failed ({status}): {detail or 'unknown error.'}"
    return f"Reka {workflow} service is unavailable."


def _status_for_reka_error(exc: Exception) -> int:
    if isinstance(exc, APITimeoutError | APIConnectionError):
        return 502
    if isinstance(exc, APIStatusError):
        status = exc.status_code
        if status in {400, 401, 403, 413, 415, 429}:
            return 400
        if status >= 500:
            return 502
    return 502


def _normalize_locale(language: str | None) -> str:
    if not language:
        return "en"
    normalized = language.strip().lower()
    return normalized if normalized in SUPPORTED_LOCALES else "en"


def _as_data_url(media_bytes: bytes, filename: str | None, content_type: str | None) -> str:
    mime_type = content_type
    if not mime_type and filename:
        mime_type = mimetypes.guess_type(filename)[0]
    if not mime_type:
        mime_type = "application/octet-stream"
    encoded = base64.b64encode(media_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned


def _extract_braced_json_candidates(text: str) -> list[str]:
    candidates: list[str] = []
    for start_index, char in enumerate(text):
        if char != "{":
            continue
        depth = 0
        in_string = False
        escape = False
        for cursor in range(start_index, len(text)):
            current = text[cursor]
            if in_string:
                if escape:
                    escape = False
                elif current == "\\":
                    escape = True
                elif current == '"':
                    in_string = False
                continue

            if current == '"':
                in_string = True
            elif current == "{":
                depth += 1
            elif current == "}":
                depth -= 1
                if depth == 0:
                    candidates.append(text[start_index : cursor + 1])
                    break
    return candidates


def _pythonize_json_literals(text: str) -> str:
    normalized = re.sub(r"\btrue\b", "True", text)
    normalized = re.sub(r"\bfalse\b", "False", normalized)
    normalized = re.sub(r"\bnull\b", "None", normalized)
    return normalized


def _strip_trailing_commas(text: str) -> str:
    return re.sub(r",(\s*[}\]])", r"\1", text)


def _try_parse_mapping(text: str) -> dict | None:
    for candidate in (text, _strip_trailing_commas(text)):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            return parsed
        if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
            return parsed[0]

        try:
            parsed = ast.literal_eval(_pythonize_json_literals(candidate))
        except (ValueError, SyntaxError):
            parsed = None
        if isinstance(parsed, dict):
            return parsed
        if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
            return parsed[0]

    return None


def _extract_json_object(text: str) -> dict:
    cleaned = _strip_code_fences(text)

    direct = _try_parse_mapping(cleaned)
    if direct:
        return direct

    for candidate in _extract_braced_json_candidates(cleaned):
        parsed = _try_parse_mapping(candidate)
        if parsed:
            return parsed

    raise PatientVideoWorkflowError("Model did not return valid JSON for medication scan.")


async def _repair_scan_json(raw_content: str) -> dict:
    repair_messages = [
        {"role": "system", "content": SCAN_REPAIR_PROMPT},
        {"role": "user", "content": raw_content},
    ]
    try:
        repair_response = await client.chat.completions.create(
            model="reka-flash",
            messages=repair_messages,
            temperature=0.0,
            max_tokens=700,
        )
    except Exception as exc:
        raise PatientVideoWorkflowError(
            _humanize_reka_error(exc, workflow="video scan JSON repair"),
            status_code=_status_for_reka_error(exc),
        ) from exc

    repaired_content = (repair_response.choices[0].message.content or "").strip()
    if not repaired_content:
        raise PatientVideoWorkflowError("Video scan returned unparsable JSON and repair produced no output.")
    return _extract_json_object(repaired_content)


ALLOWED_PACKAGING_TYPES = {
    "bottle",
    "box",
    "blister_pack",
    "pharmacy_label",
    "warning_sticker",
    "packet",
    "unclear",
}


def _normalize_string(value: object) -> str:
    if isinstance(value, list):
        return " ".join(str(item).strip() for item in value if str(item).strip()).strip()
    return str(value or "").strip()


def _normalize_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, tuple):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        parts = [part.strip(" -\u2022") for part in re.split(r"[\n;]+", value) if part.strip()]
        return [part for part in parts if part]
    return []


def _normalize_packaging_type(value: object) -> str:
    raw = _normalize_string(value).lower().replace(" ", "_")
    return raw if raw in ALLOWED_PACKAGING_TYPES else "unclear"


def _coerce_scan_payload(raw: dict, target_language: str) -> PatientMedicationScanResponse:
    confidence_value = raw.get("confidence", 0.0)
    try:
        confidence = float(confidence_value)
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    warnings_original = _normalize_list(raw.get("warnings_original", raw.get("warnings", [])))
    warnings_translated = _normalize_list(raw.get("warnings_translated", warnings_original))
    detected_text_lines = _normalize_list(raw.get("detected_text_lines", []))

    directions_original = _normalize_string(raw.get("directions_original", raw.get("dosage_instructions", "")))
    directions_translated = _normalize_string(raw.get("directions_translated", directions_original))
    summary_original = _normalize_string(raw.get("summary_original", directions_original))
    summary_translated = _normalize_string(raw.get("summary_translated", directions_translated))
    medication_overview = _normalize_string(raw.get("medication_overview_translated"))

    how_to_take = _normalize_list(raw.get("how_to_take_points_translated", []))
    side_effects = _normalize_list(raw.get("side_effects_translated", []))
    precautions = _normalize_list(raw.get("precautions_translated", warnings_translated))
    storage = _normalize_list(raw.get("storage_translated", []))

    text_for_speech = _normalize_string(raw.get("text_for_speech"))
    if not text_for_speech:
        text_for_speech = " ".join(
            part for part in [directions_translated, *warnings_translated] if part
        ).strip()

    medicine_name = _normalize_string(raw.get("medication_name", raw.get("medicine_name", "")))
    generic_name = _normalize_string(raw.get("generic_name"))
    packaging_type = _normalize_packaging_type(raw.get("packaging_type"))
    detected_language = _normalize_string(raw.get("detected_language")) or target_language
    review_reason = _normalize_string(raw.get("review_reason"))
    needs_review = bool(raw.get("needs_review", False))
    if needs_review and not review_reason:
        review_reason = "Please double-check this label with a pharmacist."

    return PatientMedicationScanResponse(
        packaging_type=packaging_type,
        medication_name=medicine_name,
        generic_name=generic_name,
        strength=_normalize_string(raw.get("strength")),
        dosage_form=_normalize_string(raw.get("dosage_form")),
        quantity=_normalize_string(raw.get("quantity")),
        refills=_normalize_string(raw.get("refills")),
        directions_original=directions_original,
        directions_translated=directions_translated,
        warnings_original=warnings_original,
        warnings_translated=warnings_translated,
        summary_original=summary_original,
        summary_translated=summary_translated,
        medication_overview_translated=medication_overview,
        how_to_take_points_translated=how_to_take,
        side_effects_translated=side_effects,
        precautions_translated=precautions,
        storage_translated=storage,
        detected_language=detected_language,
        target_language=target_language,
        confidence=confidence,
        needs_review=needs_review,
        review_reason=review_reason,
        detected_text_lines=detected_text_lines,
        text_for_speech=text_for_speech,
    )


def _build_multimodal_content(
    *,
    text: str,
    image_data_url: str | None = None,
    video_data_url: str | None = None,
) -> list[dict]:
    content: list[dict] = []
    if text.strip():
        content.append({"type": "text", "text": text.strip()})
    if image_data_url:
        content.append({"type": "image_url", "image_url": {"url": image_data_url}})
    if video_data_url:
        content.append({"type": "video_url", "video_url": {"url": video_data_url}})
    return content


def _sanitize_history_for_reka(history: list[dict] | None) -> list[dict]:
    raw: list[dict] = []
    for item in history or []:
        role = str(item.get("role", "")).strip()
        content = str(item.get("content", "")).strip()
        if role in {"user", "assistant"} and content:
            raw.append({"role": role, "content": content})

    # Reka requires the first non-system turn to be a user message.
    while raw and raw[0]["role"] != "user":
        raw.pop(0)

    if not raw:
        return []

    # Keep strict alternation by dropping consecutive same-role turns.
    normalized: list[dict] = [raw[0]]
    for message in raw[1:]:
        if message["role"] == normalized[-1]["role"]:
            continue
        normalized.append(message)

    return normalized


async def scan_medication_video_with_reka_chat(
    *,
    video_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    language: str | None,
) -> PatientMedicationScanResponse:
    locale = _normalize_locale(language)
    video_data_url = _as_data_url(video_bytes, filename, content_type)
    locale_name = SUPPORTED_LOCALES.get(locale, "English")

    messages = [
        {"role": "system", "content": SCAN_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": _build_multimodal_content(
                text=(
                    f"Target language for translated patient-facing fields: {locale_name}.\n"
                    "Analyze the full video and return strict JSON only. "
                    "Detect packaging type accurately from what is visible."
                ),
                video_data_url=video_data_url,
            ),
        },
    ]

    try:
        response = await client.chat.completions.create(
            model="reka-flash",
            messages=messages,
            temperature=0.1,
            max_tokens=1200,
        )
    except Exception as exc:
        raise PatientVideoWorkflowError(
            _humanize_reka_error(exc, workflow="video scan"),
            status_code=_status_for_reka_error(exc),
        ) from exc

    content = (response.choices[0].message.content or "").strip()
    if not content:
        raise PatientVideoWorkflowError("Empty response from video scan model.")

    try:
        parsed = _extract_json_object(content)
    except PatientVideoWorkflowError:
        parsed = await _repair_scan_json(content)
    return _coerce_scan_payload(parsed, locale)


async def chat_with_media_using_reka(
    *,
    message: str,
    language: str | None,
    history: list[dict] | None = None,
    image_bytes: bytes | None = None,
    image_filename: str | None = None,
    image_content_type: str | None = None,
    video_bytes: bytes | None = None,
    video_filename: str | None = None,
    video_content_type: str | None = None,
) -> PatientChatWithMediaResponse:
    locale = _normalize_locale(language)
    locale_name = SUPPORTED_LOCALES.get(locale, "English")
    image_data_url = None
    video_data_url = None
    if image_bytes:
        image_data_url = _as_data_url(image_bytes, image_filename, image_content_type)
    if video_bytes:
        video_data_url = _as_data_url(video_bytes, video_filename, video_content_type)

    history_messages = _sanitize_history_for_reka(history)

    has_video = bool(video_bytes)
    has_image = bool(image_bytes)
    media_mode = "video" if has_video else "image" if has_image else "text"
    media_instruction = (
        "Current media input: video."
        if media_mode == "video"
        else "Current media input: image."
        if media_mode == "image"
        else "Current media input: text only."
    )

    messages: list[dict] = [
        {
            "role": "system",
            "content": (
                f"{PILLY_MEDICATION_ASSISTANT_SYSTEM_PROMPT}\n\n"
                f"{MEDIA_CONTEXT_GUIDANCE}\n"
                f"{media_instruction}\n"
                f"Respond in {locale_name}."
            ),
        },
    ]
    effective_message = message.strip() or (
        "Please analyze the attached media. If the user's intent or question is unclear, "
        "ask a concise follow-up question to clarify what they want to verify."
    )
    context_messages = history_messages[-8:]
    if context_messages and context_messages[-1]["role"] == "user":
        context_messages = context_messages[:-1]
    messages.extend(context_messages)

    messages.append(
        {
            "role": "user",
            "content": _build_multimodal_content(
                text=effective_message,
                image_data_url=image_data_url,
                video_data_url=video_data_url,
            ),
        }
    )

    try:
        response = await client.chat.completions.create(
            model="reka-flash",
            messages=messages,
            temperature=0.2,
            max_tokens=500,
        )
    except Exception as exc:
        raise PatientVideoWorkflowError(
            _humanize_reka_error(exc, workflow="media chat"),
            status_code=_status_for_reka_error(exc),
        ) from exc

    reply = (response.choices[0].message.content or "").strip()
    if not reply:
        raise PatientVideoWorkflowError("The assistant could not generate a reply.")

    return PatientChatWithMediaResponse(reply=reply)
