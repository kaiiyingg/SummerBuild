import base64
import json
import mimetypes
import re

from openai import AsyncOpenAI

from app.core.config import settings
from app.schemas.medication_verification import MedicationVerificationResponse


client = AsyncOpenAI(api_key=settings.REKA_API_KEY, base_url="https://api.reka.ai/v1")


SYSTEM_PROMPT = """You are an AI assistant helping a pharmacist verify medication packing.

You must inspect the provided image or images and decide whether the quantity image shows:
- packaged medication, such as a box, bottle, blister pack, sachet, or labeled packet
- loose pills, tablets, or capsules
- unclear, if the image cannot be interpreted safely

The pharmacist may provide:
- an identity image: packaging label, prescription label, barcode/QR evidence, or readable pill imprint evidence
- a quantity image: the full packed or loose quantity to count

Compare identity evidence against the expected medication.
Compare visible count evidence against the expected quantity.

Return only valid JSON with these exact keys:
image_type, detected_medication, detected_strength, detected_quantity,
quantity_confidence, medication_match, quantity_match, identity_evidence,
quantity_evidence, notes.

Rules:
- image_type must be "packaged", "loose", or "unclear".
- detected_quantity must be an integer or null.
- quantity_confidence must be a number from 0 to 1.
- medication_match and quantity_match must be booleans.
- medication_match must be true only if readable label text, barcode/QR evidence, prescription label text, or a clearly readable pill imprint supports the expected medication and strength.
- If only loose pills are shown without readable imprint or separate identity evidence, medication_match must be false even if quantity_match is true.
- Do not infer medication identity from color, shape, container, or quantity alone.
- identity_evidence must quote or summarize the exact visible evidence used for medication identity. If no readable identity evidence is visible, set it to "".
- quantity_evidence must quote or summarize the exact visible evidence used for counting, such as "label says 21 capsules" or "15 loose tablets visible".
- quantity_match must be false whenever detected_quantity is not exactly equal to the expected quantity.
- If pills overlap, labels are unreadable, or quantity is uncertain, lower quantity_confidence and explain in notes.
- Do not approve a medication match unless the label or visible evidence supports it.
"""


def _as_data_url(image_bytes: bytes, filename: str | None, content_type: str | None) -> str:
    mime_type = content_type
    if not mime_type and filename:
        mime_type = mimetypes.guess_type(filename)[0]
    if not mime_type:
        mime_type = "image/jpeg"

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def _extract_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def _normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _append_note(data: dict, note: str) -> None:
    existing = str(data.get("notes") or "").strip()
    data["notes"] = f"{existing} {note}".strip() if existing else note


def _normalize_result(
    data: dict,
    *,
    expected_medication: str,
    expected_quantity: int,
    has_identity_image: bool,
) -> dict:
    image_type = str(data.get("image_type", "unclear")).lower().strip()
    if image_type in {"package", "packaging", "packed", "label", "labeled"}:
        image_type = "packaged"
    elif image_type in {"pill", "pills", "tablet", "tablets", "capsule", "capsules"}:
        image_type = "loose"
    elif image_type not in {"packaged", "loose", "unclear"}:
        image_type = "unclear"

    data["image_type"] = image_type

    detected_quantity = data.get("detected_quantity")
    if detected_quantity in {"", "unknown", "unclear", "null"}:
        detected_quantity = None
    if detected_quantity is not None:
        try:
            detected_quantity = int(detected_quantity)
        except (TypeError, ValueError):
            detected_quantity = None
    data["detected_quantity"] = detected_quantity

    if detected_quantity is None:
        data["quantity_match"] = False
        _append_note(data, "Quantity was not verified because no clear count was detected.")
    elif detected_quantity != expected_quantity:
        data["quantity_match"] = False
        _append_note(
            data,
            f"Quantity mismatch: detected {detected_quantity}, expected {expected_quantity}.",
        )
    else:
        data["quantity_match"] = True

    detected_medication = _normalize_text(str(data.get("detected_medication") or ""))
    expected = _normalize_text(expected_medication)
    identity_evidence = str(data.get("identity_evidence") or "").strip()

    if not has_identity_image:
        data["medication_match"] = False
        _append_note(data, "Medication identity requires a separate label, barcode, or imprint evidence image.")
    elif not identity_evidence:
        data["medication_match"] = False
        _append_note(data, "Medication identity was not verified because no readable identity evidence was reported.")
    elif expected not in detected_medication and detected_medication not in expected:
        data["medication_match"] = False
        _append_note(
            data,
            f"Medication mismatch: detected '{data.get('detected_medication') or 'unknown'}', expected '{expected_medication}'.",
        )

    data.setdefault("identity_evidence", "")
    data.setdefault("quantity_evidence", "")
    return data


async def verify_medication_image(
    *,
    image_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    identity_image_bytes: bytes | None,
    identity_filename: str | None,
    identity_content_type: str | None,
    expected_medication: str,
    expected_quantity: int,
) -> MedicationVerificationResponse:
    quantity_image_url = _as_data_url(image_bytes, filename, content_type)
    identity_image_url = (
        _as_data_url(identity_image_bytes, identity_filename, identity_content_type)
        if identity_image_bytes
        else None
    )

    user_prompt = f"""Expected medication: {expected_medication}
Expected quantity: {expected_quantity}

Inspect the attached image(s).
The first image, if present and labelled identity image, is for medication identity verification.
The quantity image is for counting the full quantity.

If no identity image is provided and the quantity image does not contain readable medication identity evidence, set medication_match to false.
Quantity may still match even when medication identity is not verified.
Return only JSON."""

    content = [{"type": "text", "text": user_prompt}]
    if identity_image_url:
        content.extend(
            [
                {"type": "text", "text": "Identity image: verify medication name, strength, label, barcode, or imprint evidence from this image."},
                {"type": "image_url", "image_url": {"url": identity_image_url}},
            ]
        )
    content.extend(
        [
            {"type": "text", "text": "Quantity image: classify as packaged, loose, or unclear and count the visible quantity from this image."},
            {"type": "image_url", "image_url": {"url": quantity_image_url}},
        ]
    )

    response = await client.chat.completions.create(
        model="reka-flash",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        temperature=0.1,
        max_tokens=500,
    )

    raw_reply = (response.choices[0].message.content or "").strip()
    parsed = _normalize_result(
        _extract_json(raw_reply),
        expected_medication=expected_medication,
        expected_quantity=expected_quantity,
        has_identity_image=identity_image_bytes is not None,
    )

    return MedicationVerificationResponse(**parsed)
