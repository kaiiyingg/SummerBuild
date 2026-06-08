from typing import Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    source: Literal["faq", "redirect", "reka"]
