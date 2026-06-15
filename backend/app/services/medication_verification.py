import base64
import json
import mimetypes
import re

from openai import AsyncOpenAI

from app.core.config import settings
from app.schemas.medication_verification import MedicationVerificationResponse

reka_client = AsyncOpenAI(
    api_key=settings.REKA_API_KEY,
    base_url="https://api.reka.ai/v1",
)

openai_client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
) if settings.OPENAI_API_KEY else None


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

General Rules:
- image_type must be "packaged", "loose", or "unclear".
- detected_quantity must be an integer or null.
- quantity_confidence must be a number from 0 to 1.
- medication_match and quantity_match must be booleans.
- medication_match must be true only if readable label text, barcode/QR evidence, prescription label text, or clearly readable pill imprint supports the expected medication and strength.
- If only loose pills are shown without readable imprint or separate identity evidence, medication_match must be false even if quantity_match is true.
- Do not infer medication identity from color, shape, container, or quantity alone.
- identity_evidence must quote or summarize the exact visible evidence used for medication identity. If no readable identity evidence is visible, set it to "".
- quantity_evidence must quote or summarize the exact visible evidence used for counting.
- quantity_match must be false whenever detected_quantity is not exactly equal to the expected quantity.
- Count only medication units that are directly visible.
- Never estimate, infer, reconstruct, or predict hidden medication units.
- Do not estimate counts.
- Only return a quantity when the count is clearly visible.
- If confidence is below 0.8, prefer detected_quantity = null rather than guessing.
- Pharmacy safety is more important than quantity detection.
- When uncertain, reject the count and request a rescan instead of estimating.

For loose pills:
- Count each visible pill, tablet, or capsule one by one.
- If tablets or capsules overlap, are partially hidden, blurry, cut off by the image edge, affected by glare, or cannot be clearly separated, set detected_quantity to null.
- If any pill is partially obscured or cannot be confidently separated from surrounding pills, set detected_quantity to null.
- Do not estimate missing pills.

For blister packs:

CRITICAL RULE:
- Count visible blister pop-ups, not rows, columns, blister layouts, or expected packaging patterns.
- Do not calculate quantity using rows × columns.
- Treat every visible blister pop-up as an individual object.

Finger / Obstruction Rules:
- If a finger, hand, object, label, glare, shadow, fold, reflection, packaging material, or image edge covers part of the blister pack, treat the covered area as invisible.
- Do not guess what is hidden under an obstruction.
- Do not infer hidden blister pop-ups.
- Hidden areas must be treated as unknown.
- If a blister pop-up is partially covered, partially cropped, blurry, or not fully visible, do not count it.

Layout Rules:
- Do not reconstruct the original blister-pack layout.
- Do not assume symmetry.
- Do not assume a regular grid.
- Do not assume additional blister pop-ups exist outside the visible image.
- Do not complete partially visible rows.
- Do not complete partially visible columns.
- Do not estimate the total size of the blister pack.

Counting Method:
1. Locate every visible blister pop-up that clearly contains medication.
2. Treat each visible blister pop-up as a separate object.
3. Number every visible blister pop-up individually.
4. Count the numbered blister pop-ups.
5. Verify that the final quantity equals the number of numbered blister pop-ups.
6. Return a quantity only when every counted blister pop-up is clearly visible.

Example:

Visible blister pop-ups:
1. Top center
2. Top right
3. Middle left
4. Middle center
5. Middle right

Total visible blister pop-ups: 5

Requirements:
- detected_quantity must equal the number of individually numbered visible blister pop-ups.
- quantity_evidence must include the numbered blister pop-ups and the final total.
- If a numbered breakdown cannot be provided, set detected_quantity to null.
- If uncertain, set detected_quantity to null and quantity_confidence below 0.8.
- It is better to reject an uncertain blister-pack count than to provide an incorrect count.

Notes:
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

    confidence = float(data.get("quantity_confidence") or 0)

    if detected_quantity is None:
        data["quantity_match"] = False

        _append_note(
            data,
            "Quantity was not verified because no clear count was detected."
        )

    elif detected_quantity != expected_quantity:
        data["quantity_match"] = False

        _append_note(
            data,
            f"Quantity mismatch: detected {detected_quantity}, expected {expected_quantity}.",
        )

    elif confidence < 0.8:
        data["quantity_match"] = False
        data["detected_quantity"] = None

        _append_note(
            data,
            f"Quantity confidence too low ({confidence:.2f}). Please rescan with medication clearly separated."
        )

    else:
        data["quantity_match"] = True

    detected_medication = _normalize_text(
        str(data.get("detected_medication") or "")
    )

    expected = _normalize_text(expected_medication)

    identity_evidence = str(
        data.get("identity_evidence") or ""
    ).strip()

    if not has_identity_image:
        data["medication_match"] = False

        _append_note(
            data,
            "Medication identity requires a separate label, barcode, or imprint evidence image."
        )

    elif not identity_evidence:
        data["medication_match"] = False

        _append_note(
            data,
            "Medication identity was not verified because no readable identity evidence was reported."
        )

    elif (
        expected not in detected_medication
        and detected_medication not in expected
    ):
        data["medication_match"] = False

        _append_note(
            data,
            f"Medication mismatch: detected '{data.get('detected_medication') or 'unknown'}', expected '{expected_medication}'.",
        )

    data.setdefault("identity_evidence", "")
    data.setdefault("quantity_evidence", "")

    return data

async def verify_medication_identity(
    *,
    image_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    expected_medication: str,
) -> dict:
    image_url = _as_data_url(image_bytes, filename, content_type)

    prompt = f"""
Expected medication: {expected_medication}

Read the medication label from the image.

Return ONLY valid JSON with these exact keys:
{{
  "detected_medication": "",
  "detected_strength": "",
  "medication_match": false,
  "identity_evidence": "",
  "notes": ""
}}

Rules:
- medication_match should be true if the detected medication name and strength match the expected medication.
- Ignore brand name differences unless the expected medication includes a specific brand.
- If the label is unreadable, medication_match must be false.
- Do not include markdown.
- Do not explain outside the JSON.
"""

    try:
        response = await reka_client.chat.completions.create(
            model="reka-flash",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=300,
        )

        raw_reply = (response.choices[0].message.content or "").strip()

        if not raw_reply:
            return {
                "detected_medication": "",
                "detected_strength": "",
                "medication_match": False,
                "identity_evidence": "",
                "notes": "AI returned an empty response. Please rescan the label.",
            }

        data = _extract_json(raw_reply)

        return {
            "detected_medication": data.get("detected_medication", ""),
            "detected_strength": data.get("detected_strength", ""),
            "medication_match": bool(data.get("medication_match", False)),
            "identity_evidence": data.get("identity_evidence", ""),
            "notes": data.get("notes", ""),
        }

    except Exception as exc:
        return {
            "detected_medication": "",
            "detected_strength": "",
            "medication_match": False,
            "identity_evidence": "",
            "notes": f"Unable to verify medication identity from this image. Please rescan. Details: {exc}",
        }

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

    The identity image is for medication name and strength verification.
    The quantity image is for counting the visible medication quantity.

    Important counting instruction:
    - First count visible medication units WITHOUT using the expected quantity.
    - Only after counting, compare your detected quantity against the expected quantity.
    - Count only fully visible medication units.
    - Do not infer hidden, covered, or partially obscured units.
    - If a finger, hand, glare, shadow, label, or image edge covers a medication unit, do not count that unit.
    - If the image shows a blister pack, count each fully visible blister compartment one by one.
    - If unsure, set detected_quantity to null and quantity_confidence below 0.8.
    - It is better to reject an uncertain count than to guess.

    For quantity_evidence, provide a short counting breakdown.
    Example:
    "Top row: 2 visible, middle row: 2 visible, bottom row: 2 visible. Total: 6."

    Return only JSON with:
    image_type, detected_medication, detected_strength, detected_quantity,
    quantity_confidence, medication_match, quantity_match,
    identity_evidence, quantity_evidence, notes."""

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

    response = await reka_client.chat.completions.create(
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

    openai_quantity = await count_quantity_with_openai(
    image_bytes=image_bytes,
    filename=filename,
    content_type=content_type,
    expected_quantity=expected_quantity,
    )

    parsed["detected_quantity"] = openai_quantity["detected_quantity"]
    parsed["quantity_confidence"] = openai_quantity["quantity_confidence"]
    parsed["quantity_match"] = openai_quantity["quantity_match"]
    parsed["quantity_evidence"] = openai_quantity["quantity_evidence"]

    parsed["notes"] = openai_quantity["notes"] or parsed.get("notes", "")

    return MedicationVerificationResponse(**parsed)

async def count_quantity_with_openai(
    *,
    image_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    expected_quantity: int,
) -> dict:
    if not openai_client:
        return {
            "detected_quantity": None,
            "quantity_confidence": 0,
            "quantity_match": False,
            "quantity_evidence": "",
            "notes": "OpenAI quantity counting is not configured.",
        }

    image_url = _as_data_url(image_bytes, filename, content_type)

    prompt = """
You are a pharmacy medication quantity verification assistant.

Your task is to count the visible medication quantity shown in the image.

==================================================
PRIMARY OBJECTIVE
==================================================

Count what is visible.

Use the image itself.

Do not estimate hidden items.

Do not reconstruct missing portions.

Do not complete patterns.

Do not use packaging layouts to predict missing items.

Count what can actually be seen.

==================================================
EXPECTED QUANTITY
==================================================

Ignore any expected quantity.

Determine the count independently from the image.

Never modify the count to match an expected quantity.

==================================================
BLISTER PACK COUNTING
==================================================

For blister packs:

The item being counted is the visible blister pop-up.

A visible blister pop-up counts as 1.

Count every visible blister pop-up individually.

Do NOT count:
- missing positions
- blank spaces
- flat foil areas
- theoretical compartments
- expected compartments
- invisible compartments
- reconstructed compartments

IMPORTANT:

Only count visible blister pop-ups.

Do not determine how many pop-ups should exist.

Do not reconstruct the original blister layout.

Do not complete rows.

Do not complete columns.

Do not assume symmetry.

==================================================
EXAMPLE
==================================================

Visible blister pop-ups:

● ●
●
● ●
● ●

Count:

1. Top-left
2. Top-right
3. Middle-left
4. Lower-left
5. Lower-right
6. Bottom-left
7. Bottom-right

Detected quantity = 7

NOT 8.

The missing position is not counted.

==================================================
EMPTY SPACE RULE
==================================================

Do NOT count:

- blank foil
- flat packaging
- gaps
- empty spaces
- missing positions
- invisible locations
- theoretical locations

Only count visible blister pop-ups.

==================================================
OBSTRUCTIONS
==================================================

Fingers, hands, shadows, glare, labels, blur, reflections, folds, and image edges may appear.

A finger appearing in the image does NOT automatically invalidate the count.

Count a blister pop-up if the pop-up itself remains mostly visible and identifiable.

Only exclude a pop-up when it cannot be visually identified.

Do not guess what exists behind an obstruction.

==================================================
LOOSE PILLS
==================================================

For loose tablets or capsules:

Count each visible pill individually.

Do not estimate pills hidden underneath other pills.

Do not estimate pills outside the image.

==================================================
COUNTING PROCEDURE
==================================================

1. Locate every visible blister pop-up or visible pill.
2. Assign a number to each visible item.
3. Create a numbered list.
4. Count the numbered entries.
5. Set detected_quantity equal to the number of numbered entries.
6. Verify that the count matches the numbered list.

==================================================
IMPORTANT
==================================================

Do NOT return 0 unless:

- no visible blister pop-ups exist
OR
- no visible pills exist

If visible blister pop-ups are present, count them.

If some pop-ups are visible, return the best count based on visible evidence.

==================================================
CONFIDENCE RULES
==================================================

quantity_confidence must be a number between 0 and 1.

Use:

0.95 - 1.00
When most visible items are clear.

0.80 - 0.94
When minor glare, shadows, fingers, or image imperfections exist.

0.60 - 0.79
When visibility is reduced but a count is still possible.

Below 0.60
Only when the image genuinely prevents counting.

Do NOT automatically return null because confidence is below 0.80.

Only return null if the image genuinely cannot be counted.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON:

{
  "detected_quantity": 0,
  "quantity_confidence": 0.0,
  "quantity_match": false,
  "quantity_evidence": "",
  "notes": ""
}

==================================================
QUANTITY EVIDENCE
==================================================

quantity_evidence must contain the numbered list used to determine the count.

Example:

1. Top-left pop-up
2. Top-right pop-up
3. Middle-left pop-up
4. Bottom-left pop-up
5. Bottom-right pop-up

Total visible pop-ups: 5

detected_quantity must equal the number of numbered entries.
"""

    response = await openai_client.chat.completions.create(
        model=settings.OPENAI_QUANTITY_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ],
        max_completion_tokens=1500,
        response_format={"type": "json_object"},
    )

    raw_reply = (response.choices[0].message.content or "").strip()

    print("RAW OPENAI RESPONSE:", repr(raw_reply))

    if not raw_reply:
        raise ValueError("OpenAI returned an empty response. Try increasing max_completion_tokens or use another model.")

    try:
        data = _extract_json(raw_reply)
    except Exception as e:
        raise ValueError(f"OpenAI did not return valid JSON. Raw response: {raw_reply}") from e

    detected_quantity = data.get("detected_quantity")

    try:
        detected_quantity = int(detected_quantity)
    except (TypeError, ValueError):
        detected_quantity = None

    raw_confidence = data.get("quantity_confidence", 0)

    if isinstance(raw_confidence, str):
        confidence_text = raw_confidence.strip().lower()

        if confidence_text in {"high", "very high"}:
            confidence = 0.95
        elif confidence_text in {"medium", "moderate"}:
            confidence = 0.7
        elif confidence_text == "low":
            confidence = 0.4
        else:
            confidence = 0.0
    else:
        confidence = float(raw_confidence or 0)

    return {
        "detected_quantity": detected_quantity,
        "quantity_confidence": confidence,
        "quantity_match": detected_quantity == expected_quantity,
        "quantity_evidence": data.get("quantity_evidence", ""),
        "notes": data.get("notes", ""),
    }
