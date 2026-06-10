from typing import Literal

from pydantic import BaseModel, Field


PackagingType = Literal[
    "bottle",
    "box",
    "blister_pack",
    "pharmacy_label",
    "warning_sticker",
    "packet",
    "unclear",
]


class PatientMedicationScanResponse(BaseModel):
    packaging_type: PackagingType = "unclear"
    medication_name: str = ""
    generic_name: str = ""
    strength: str = ""
    dosage_form: str = ""
    quantity: str = ""
    refills: str = ""
    directions_original: str = ""
    directions_translated: str = ""
    warnings_original: list[str] = Field(default_factory=list)
    warnings_translated: list[str] = Field(default_factory=list)
    summary_original: str = ""
    summary_translated: str = ""
    detected_language: str = "en"
    target_language: str = "en"
    confidence: float = Field(default=0, ge=0, le=1)
    needs_review: bool = False
    review_reason: str = ""
    detected_text_lines: list[str] = Field(default_factory=list)
    text_for_speech: str = ""
