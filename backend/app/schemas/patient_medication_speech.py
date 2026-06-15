from pydantic import BaseModel, Field


class PatientMedicationSpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    language: str = Field(default="en", min_length=2, max_length=10)
