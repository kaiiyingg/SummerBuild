from pydantic import BaseModel


class PatientChatWithMediaResponse(BaseModel):
    reply: str
