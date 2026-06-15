import ast
import base64
import hashlib
import io
import json
import mimetypes
import re

from openai import AsyncOpenAI
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.schemas.patient_medication_scan import PatientMedicationScanResponse


client = AsyncOpenAI(api_key=settings.REKA_API_KEY, base_url="https://api.reka.ai/v1")

SUPPORTED_LOCALES = {
    "en": "English",
    "zh": "Chinese",
    "ms": "Malay",
    "ta": "Tamil",
}

ALLOWED_PACKAGING_TYPES = {
    "bottle",
    "box",
    "blister_pack",
    "pharmacy_label",
    "warning_sticker",
    "packet",
    "unclear",
}

LOCALIZED_MESSAGES = {
    "en": {
        "parse_failed": "We couldn't read this label clearly. Please try again with the label upright, fully visible, and in better lighting.",
        "service_unavailable": "Medication scanning is temporarily unavailable. Please try again shortly.",
        "missing_fields": "Medication name, strength, dosage form, quantity, and refills are not visible.",
        "warning_only": "Only a warning sticker is visible, so the medication name cannot be confirmed.",
        "no_clear_text": "This image does not contain enough clear label text to identify the medication safely.",
    },
    "zh": {
        "parse_failed": "我们暂时无法清楚读取此标签。请将标签摆正、完整拍入画面，并在更明亮的光线下重试。",
        "service_unavailable": "药品扫描暂时不可用，请稍后再试。",
        "missing_fields": "药品名称、剂量、剂型、数量和续配信息无法清楚辨认。",
        "warning_only": "画面中只看得到警示贴纸，因此无法确认药品名称。",
        "no_clear_text": "此图片没有足够清晰的标签文字，无法安全识别药品。",
    },
    "ms": {
        "parse_failed": "Kami tidak dapat membaca label ini dengan jelas buat masa ini. Cuba lagi dengan label yang tegak, penuh kelihatan, dan pencahayaan yang lebih baik.",
        "service_unavailable": "Pengimbasan ubat tidak tersedia buat sementara waktu. Sila cuba sebentar lagi.",
        "missing_fields": "Nama ubat, kekuatan, bentuk dos, kuantiti, dan isi semula tidak kelihatan.",
        "warning_only": "Hanya pelekat amaran yang kelihatan, jadi nama ubat tidak dapat disahkan.",
        "no_clear_text": "Imej ini tidak mempunyai teks label yang cukup jelas untuk mengenal pasti ubat dengan selamat.",
    },
    "ta": {
        "parse_failed": "இந்த லேபிளை இப்போது தெளிவாக படிக்க முடியவில்லை. லேபிளை நேராக வைத்து, முழுவதும் தென்படுமாறு, நல்ல வெளிச்சத்தில் மீண்டும் முயற்சிக்கவும்.",
        "service_unavailable": "மருந்து ஸ்கேன் தற்போது கிடைக்கவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
        "missing_fields": "மருந்தின் பெயர், வலிமை, வடிவம், அளவு மற்றும் மீள் நிரப்பு தகவல் தெளிவாக தெரியவில்லை.",
        "warning_only": "எச்சரிக்கை ஸ்டிக்கர் மட்டும் தெரிகிறது; அதனால் மருந்தின் பெயரை உறுதிப்படுத்த முடியவில்லை.",
        "no_clear_text": "இந்த படத்தில் மருந்தை பாதுகாப்பாக அடையாளம் காண போதுமான தெளிவான லேபிள் உரை இல்லை.",
    },
}

KNOWN_REVIEW_REASON_KEYS = {
    "Medication name, strength, dosage form, quantity, and refills are not visible.": "missing_fields",
    "Only a warning sticker was visible, so the medication name could not be confirmed.": "warning_only",
    "Only a warning sticker is visible, so the medication name cannot be confirmed.": "warning_only",
    "The image did not contain enough clear label text to identify the medication safely.": "no_clear_text",
    "This image does not contain enough clear label text to identify the medication safely.": "no_clear_text",
}

MEDICATION_EDUCATION_KEYS = (
    "medication_overview_translated",
    "how_to_take_points_translated",
    "side_effects_translated",
    "precautions_translated",
    "storage_translated",
)

SYSTEM_PROMPT = """You are an AI assistant helping patients understand medication labels.

Your job:
- Read the medication label, packaging, prescription sticker, or warning sticker shown in the image.
- Extract every piece of information that is visible on the label, doing your best to read partially clear text, and capture all readable lines in detected_text_lines. Never invent text that is not shown.
- Identify the medicine name, strength, dosage form, directions, warnings, quantity, and refills when visible.
- Translate patient-facing directions and warnings into the requested target language.

Return only valid JSON with these exact keys:
packaging_type, medication_name, generic_name, strength, dosage_form,
quantity, refills, directions_original, directions_translated,
warnings_original, warnings_translated, summary_original, summary_translated,
medication_overview_translated, how_to_take_points_translated,
side_effects_translated, precautions_translated, storage_translated,
detected_language, target_language, confidence, needs_review, review_reason,
detected_text_lines, text_for_speech

Rules:
- packaging_type must be one of: bottle, box, blister_pack, pharmacy_label, warning_sticker, packet, unclear.
- confidence must be a number from 0 to 1.
- warnings_original, warnings_translated, detected_text_lines, how_to_take_points_translated, side_effects_translated, precautions_translated, and storage_translated must be arrays.
- Preserve medication names, strengths, numbers, dates, and units exactly as visible.
- Do not invent visible label text, diagnoses, or personalized advice.
- If multiple rotated versions of the same image are provided, use the version that makes the label easiest to read.
- If the image only shows a warning sticker or partial label, still translate the visible text and set needs_review to true if the medication identity is incomplete.
- summary_original and summary_translated should explain what the visible scanned label section means in short, patient-friendly language based only on visible label text.
- medication_overview_translated should explain what the medication is commonly used for, only when the medication identity is clearly visible. Otherwise return an empty string.
- how_to_take_points_translated, side_effects_translated, precautions_translated, and storage_translated should be short bullet-style points in the target language.
- You may use general medication knowledge for medication_overview_translated, how_to_take_points_translated, side_effects_translated, precautions_translated, and storage_translated only when the medication identity is clearly visible.
- If the medication identity is unclear or only part of the label is visible, leave the general medication education fields empty instead of guessing.
- directions_original and directions_translated must be plain strings, not arrays or bracketed text.
- review_reason must be in the target language.
- text_for_speech should match the displayed medication instructions and warnings, not a different summary.
- If a field is not visible, return an empty string or empty array.
"""

REPAIR_PROMPT = """Convert the medication scan output below into valid JSON only.

Rules:
- Return only JSON, with no markdown or commentary.
- Use these exact keys only:
packaging_type, medication_name, generic_name, strength, dosage_form,
quantity, refills, directions_original, directions_translated,
warnings_original, warnings_translated, summary_original, summary_translated,
medication_overview_translated, how_to_take_points_translated,
side_effects_translated, precautions_translated, storage_translated,
detected_language, target_language, confidence, needs_review, review_reason,
detected_text_lines, text_for_speech
- directions_original and directions_translated must be plain strings, not arrays or bracketed text.
- warnings_original, warnings_translated, detected_text_lines, how_to_take_points_translated, side_effects_translated, precautions_translated, and storage_translated must be arrays.
- Preserve the content already present. Do not invent new medication facts.
"""

ENRICHMENT_PROMPT = """You are an AI assistant helping patients understand what a medication does.

Return only valid JSON with these exact keys:
medication_overview_translated, how_to_take_points_translated,
side_effects_translated, precautions_translated, storage_translated

Rules:
- medication_overview_translated must be a short patient-friendly paragraph in the target language.
- how_to_take_points_translated, side_effects_translated, precautions_translated, and storage_translated must be arrays of short bullet-style points in the target language.
- Use general medication knowledge only if the medication identity is clear from the provided name or generic name.
- Respect the extracted label instructions and warnings when they are provided. Do not contradict them.
- Do not invent diagnoses, personalized dosing, or emergency advice.
- If the medication identity is unclear, return an empty string and empty arrays instead of guessing.
"""


class PatientMedicationScanError(Exception):
    pass


def get_localized_scan_message(key: str, language: str | None) -> str:
    locale = _normalize_locale(language)
    return LOCALIZED_MESSAGES.get(locale, LOCALIZED_MESSAGES["en"]).get(key, LOCALIZED_MESSAGES["en"][key])


def _as_data_url(image_bytes: bytes, filename: str | None, content_type: str | None) -> str:
    mime_type = content_type
    if not mime_type and filename:
        mime_type = mimetypes.guess_type(filename)[0]
    if not mime_type:
        mime_type = "image/jpeg"

    encoded = base64.b64encode(image_bytes).decode("utf-8")
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
    candidates = [text, _strip_trailing_commas(text)]

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            return parsed

        try:
            parsed = ast.literal_eval(_pythonize_json_literals(candidate))
        except (ValueError, SyntaxError):
            parsed = None
        if isinstance(parsed, dict):
            return parsed

    return None


def _parse_stringified_sequence(value: str) -> list[str] | None:
    stripped = value.strip()
    if not stripped.startswith("[") or not stripped.endswith("]"):
        return None

    parsed = _try_parse_mapping(stripped)
    if isinstance(parsed, dict):
        return None

    for parser_input in (stripped, _strip_trailing_commas(stripped)):
        try:
            result = json.loads(parser_input)
        except json.JSONDecodeError:
            result = None
        if isinstance(result, list):
            return [str(item).strip() for item in result if str(item).strip()]

        try:
            result = ast.literal_eval(_pythonize_json_literals(parser_input))
        except (ValueError, SyntaxError):
            result = None
        if isinstance(result, list):
            return [str(item).strip() for item in result if str(item).strip()]

    return None


def _extract_json(text: str) -> dict | None:
    cleaned = _strip_code_fences(text)
    direct = _try_parse_mapping(cleaned)
    if direct:
        return direct

    for candidate in _extract_braced_json_candidates(cleaned):
        parsed = _try_parse_mapping(candidate)
        if parsed:
            return parsed

    return None


def _normalize_locale(language: str | None) -> str:
    if not language:
        return "en"
    normalized = language.strip().lower()
    return normalized if normalized in SUPPORTED_LOCALES else "en"


def _normalize_string(value: object) -> str:
    if isinstance(value, list):
        return " ".join(str(item).strip() for item in value if str(item).strip()).strip()
    if isinstance(value, tuple):
        return " ".join(str(item).strip() for item in value if str(item).strip()).strip()
    if isinstance(value, str):
        parsed_sequence = _parse_stringified_sequence(value)
        if parsed_sequence is not None:
            return " ".join(parsed_sequence).strip()
    return str(value or "").strip()


def _normalize_list(value: object) -> list[str]:
    if isinstance(value, list):
        items = [str(item).strip() for item in value if str(item).strip()]
    elif isinstance(value, tuple):
        items = [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        parsed_sequence = _parse_stringified_sequence(value)
        if parsed_sequence is not None:
            items = parsed_sequence
        else:
            items = [part.strip(" -\u2022") for part in re.split(r"[\n;]+", value) if part.strip()]
    if not isinstance(value, (list, tuple, str)):
        items = []

    deduped: list[str] = []
    seen: set[str] = set()
    for item in items:
        normalized = item.strip()
        if not normalized or normalized in seen:
            continue
        deduped.append(normalized)
        seen.add(normalized)
    return deduped


def _normalize_confidence(value: object) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0
    return max(0, min(1, confidence))


def _normalize_packaging_type(value: object) -> str:
    normalized = _normalize_string(value).lower().replace(" ", "_").replace("-", "_")
    if normalized in {"blister", "blister_label"}:
        normalized = "blister_pack"
    elif normalized in {"label", "prescription_label", "rx_label"}:
        normalized = "pharmacy_label"
    elif normalized in {"warning", "caution_sticker"}:
        normalized = "warning_sticker"
    return normalized if normalized in ALLOWED_PACKAGING_TYPES else "unclear"


def _serialize_image_for_scan(image: Image.Image) -> tuple[bytes, str]:
    normalized = image.convert("RGB")
    buffer = io.BytesIO()
    normalized.save(buffer, format="JPEG", quality=92)
    return buffer.getvalue(), "image/jpeg"


def _prepare_scan_images(
    image_bytes: bytes,
    filename: str | None,
    content_type: str | None,
) -> list[tuple[str, str]]:
    try:
        with Image.open(io.BytesIO(image_bytes)) as raw_image:
            image = ImageOps.exif_transpose(raw_image).copy()
    except (UnidentifiedImageError, OSError):
        return [("Medication photo", _as_data_url(image_bytes, filename, content_type))]

    variants: list[tuple[str, Image.Image]] = [("Original photo", image)]
    if image.width > image.height * 1.1:
        variants.append(("Rotated 90 degrees clockwise", image.rotate(-90, expand=True)))
        variants.append(("Rotated 90 degrees counterclockwise", image.rotate(90, expand=True)))

    prepared: list[tuple[str, str]] = []
    seen_hashes: set[str] = set()
    for label, variant in variants:
        variant_bytes, variant_content_type = _serialize_image_for_scan(variant)
        digest = hashlib.sha1(variant_bytes).hexdigest()
        if digest in seen_hashes:
            continue
        seen_hashes.add(digest)
        prepared.append((label, _as_data_url(variant_bytes, filename, variant_content_type)))

    return prepared


def _translate_known_review_reason(review_reason: str, target_language: str) -> str:
    message_key = KNOWN_REVIEW_REASON_KEYS.get(review_reason.strip())
    if not message_key:
        return review_reason
    return get_localized_scan_message(message_key, target_language)


def _build_text_for_speech_payload(data: dict) -> str:
    speech_parts = [
        " ".join(
            part
            for part in [
                data.get("medication_name", ""),
                data.get("strength", ""),
                data.get("dosage_form", ""),
            ]
            if part
        ).strip(),
        data.get("medication_overview_translated", ""),
        data.get("summary_translated", ""),
        " ".join(data.get("how_to_take_points_translated", [])).strip(),
        " ".join(data.get("side_effects_translated", [])).strip(),
        " ".join(data.get("precautions_translated", [])).strip(),
        " ".join(data.get("storage_translated", [])).strip(),
    ]
    return " ".join(part for part in speech_parts if part).strip()


def _empty_medication_education() -> dict:
    return {
        "medication_overview_translated": "",
        "how_to_take_points_translated": [],
        "side_effects_translated": [],
        "precautions_translated": [],
        "storage_translated": [],
    }


def _normalize_medication_education_payload(data: dict) -> dict:
    return {
        "medication_overview_translated": _normalize_string(data.get("medication_overview_translated")),
        "how_to_take_points_translated": _normalize_list(data.get("how_to_take_points_translated")),
        "side_effects_translated": _normalize_list(data.get("side_effects_translated")),
        "precautions_translated": _normalize_list(data.get("precautions_translated")),
        "storage_translated": _normalize_list(data.get("storage_translated")),
    }


def _merge_missing_medication_education(base: dict, supplement: dict) -> dict:
    for key in MEDICATION_EDUCATION_KEYS:
        if base.get(key):
            continue
        value = supplement.get(key)
        if value:
            base[key] = value
    return base


def _needs_medication_education_enrichment(data: dict) -> bool:
    medication_identity = " ".join(
        part for part in [data.get("medication_name", ""), data.get("generic_name", "")] if part
    ).strip()
    if len(medication_identity) < 3:
        return False
    return any(not data.get(key) for key in MEDICATION_EDUCATION_KEYS)


def _normalize_result(data: dict, *, target_language: str) -> dict:
    normalized = {
        "packaging_type": _normalize_packaging_type(data.get("packaging_type")),
        "medication_name": _normalize_string(data.get("medication_name")),
        "generic_name": _normalize_string(data.get("generic_name")),
        "strength": _normalize_string(data.get("strength")),
        "dosage_form": _normalize_string(data.get("dosage_form")),
        "quantity": _normalize_string(data.get("quantity")),
        "refills": _normalize_string(data.get("refills")),
        "directions_original": _normalize_string(data.get("directions_original")),
        "directions_translated": _normalize_string(data.get("directions_translated")),
        "warnings_original": _normalize_list(data.get("warnings_original")),
        "warnings_translated": _normalize_list(data.get("warnings_translated")),
        "summary_original": _normalize_string(data.get("summary_original")),
        "summary_translated": _normalize_string(data.get("summary_translated")),
        "medication_overview_translated": _normalize_string(data.get("medication_overview_translated")),
        "how_to_take_points_translated": _normalize_list(data.get("how_to_take_points_translated")),
        "side_effects_translated": _normalize_list(data.get("side_effects_translated")),
        "precautions_translated": _normalize_list(data.get("precautions_translated")),
        "storage_translated": _normalize_list(data.get("storage_translated")),
        "detected_language": _normalize_locale(data.get("detected_language")),
        "target_language": target_language,
        "confidence": _normalize_confidence(data.get("confidence")),
        "needs_review": bool(data.get("needs_review")),
        "review_reason": _normalize_string(data.get("review_reason")),
        "detected_text_lines": _normalize_list(data.get("detected_text_lines"))[:10],
        "text_for_speech": _normalize_string(data.get("text_for_speech")),
    }

    normalized["review_reason"] = _translate_known_review_reason(
        normalized["review_reason"],
        target_language,
    )

    if not normalized["directions_translated"] and normalized["directions_original"]:
        normalized["directions_translated"] = normalized["directions_original"]

    if not normalized["warnings_translated"] and normalized["warnings_original"]:
        normalized["warnings_translated"] = normalized["warnings_original"]

    if not normalized["summary_translated"]:
        normalized["summary_translated"] = normalized["summary_original"]

    if not normalized["how_to_take_points_translated"] and normalized["directions_translated"]:
        normalized["how_to_take_points_translated"] = [normalized["directions_translated"]]

    if not normalized["precautions_translated"] and normalized["warnings_translated"]:
        normalized["precautions_translated"] = normalized["warnings_translated"]

    if (
        not normalized["medication_name"]
        and not normalized["directions_original"]
        and not normalized["warnings_original"]
        and not normalized["detected_text_lines"]
    ):
        normalized["needs_review"] = True
        if not normalized["review_reason"]:
            normalized["review_reason"] = get_localized_scan_message("no_clear_text", target_language)

    if (
        normalized["packaging_type"] == "warning_sticker"
        and not normalized["medication_name"]
        and not normalized["review_reason"]
    ):
        normalized["needs_review"] = True
        normalized["review_reason"] = get_localized_scan_message("warning_only", target_language)

    if normalized["needs_review"] and not normalized["review_reason"]:
        normalized["review_reason"] = get_localized_scan_message("missing_fields", target_language)

    if not normalized["text_for_speech"]:
        normalized["text_for_speech"] = _build_text_for_speech_payload(normalized)

    return normalized


async def _repair_json_with_model(raw_reply: str) -> str:
    response = await client.chat.completions.create(
        model="reka-flash",
        messages=[
            {"role": "system", "content": REPAIR_PROMPT},
            {"role": "user", "content": raw_reply},
        ],
        temperature=0,
        max_tokens=1400,
    )
    return (response.choices[0].message.content or "").strip()


async def _parse_response_payload(raw_reply: str, *, target_language: str) -> dict:
    parsed = _extract_json(raw_reply)
    if parsed is not None:
        return parsed

    try:
        repaired_reply = await _repair_json_with_model(raw_reply)
    except Exception as exc:
        raise PatientMedicationScanError(
            get_localized_scan_message("parse_failed", target_language)
        ) from exc

    repaired = _extract_json(repaired_reply)
    if repaired is not None:
        return repaired

    raise PatientMedicationScanError(get_localized_scan_message("parse_failed", target_language))


async def _enrich_medication_education(
    *,
    scan_result: dict,
    target_language: str,
) -> dict:
    target_language_name = SUPPORTED_LOCALES[target_language]
    context_payload = {
        "target_language": target_language,
        "target_language_name": target_language_name,
        "medication_name": scan_result.get("medication_name", ""),
        "generic_name": scan_result.get("generic_name", ""),
        "strength": scan_result.get("strength", ""),
        "dosage_form": scan_result.get("dosage_form", ""),
        "directions_original": scan_result.get("directions_original", ""),
        "directions_translated": scan_result.get("directions_translated", ""),
        "warnings_original": scan_result.get("warnings_original", []),
        "warnings_translated": scan_result.get("warnings_translated", []),
        "summary_translated": scan_result.get("summary_translated", ""),
    }

    try:
        response = await client.chat.completions.create(
            model="reka-flash",
            messages=[
                {"role": "system", "content": ENRICHMENT_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Target patient language: {target_language_name} ({target_language})\n\n"
                        "Use the extracted medication details below to fill in any missing patient-friendly education sections.\n"
                        "Keep the answer concise and practical for a patient.\n"
                        "Return only JSON.\n\n"
                        f"{json.dumps(context_payload, ensure_ascii=False)}"
                    ),
                },
            ],
            temperature=0.1,
            max_tokens=900,
        )
        raw_reply = (response.choices[0].message.content or "").strip()
        parsed = _extract_json(raw_reply)
        if parsed is None:
            return _empty_medication_education()
        return _normalize_medication_education_payload(parsed)
    except Exception:
        return _empty_medication_education()


async def scan_medication_label(
    *,
    image_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    language: str | None,
) -> PatientMedicationScanResponse:
    target_language = _normalize_locale(language)
    target_language_name = SUPPORTED_LOCALES[target_language]
    image_variants = _prepare_scan_images(image_bytes, filename, content_type)

    user_prompt = f"""Target patient language: {target_language_name} ({target_language})

Inspect the attached medication photo.
The photo may show a bottle label, prescription sticker, box label, blister pack label, or warning sticker.

Please:
1. Identify the medication if the name is visible.
2. Extract visible instructions, warnings, quantity, refills, and other key label text.
3. Explain what the scanned label section means in plain language.
4. If the medication identity is clear, add a short general explanation of what the medication is commonly used for, how to take it, possible side effects, precautions, and storage.
5. Translate the patient-facing content into {target_language_name}.

Return only JSON."""

    content: list[dict] = [{"type": "text", "text": user_prompt}]
    for label, image_url in image_variants:
        content.extend(
            [
                {"type": "text", "text": f"{label}: use this version if it makes the label easiest to read."},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]
        )

    response = await client.chat.completions.create(
        model="reka-flash",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": content,
            },
        ],
        temperature=0.1,
        max_tokens=1400,
    )

    raw_reply = (response.choices[0].message.content or "").strip()
    parsed_payload = await _parse_response_payload(raw_reply, target_language=target_language)
    parsed = _normalize_result(parsed_payload, target_language=target_language)
    if _needs_medication_education_enrichment(parsed):
        enrichment = await _enrich_medication_education(
            scan_result=parsed,
            target_language=target_language,
        )
        parsed = _merge_missing_medication_education(parsed, enrichment)
        parsed["text_for_speech"] = _build_text_for_speech_payload(parsed)
    return PatientMedicationScanResponse(**parsed)
