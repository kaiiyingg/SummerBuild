from typing import Literal

from pydantic import BaseModel, Field


class MedicationVerificationResponse(BaseModel):
    image_type: Literal["packaged", "loose", "unclear"] = "unclear"
    detected_medication: str = ""
    detected_strength: str = ""
    detected_quantity: int | None = Field(default=None, ge=0)
    quantity_confidence: float = Field(default=0, ge=0, le=1)
    medication_match: bool = False
    quantity_match: bool = False
    identity_evidence: str = ""
    quantity_evidence: str = ""
    notes: str = ""
