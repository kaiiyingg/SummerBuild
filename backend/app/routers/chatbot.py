from fastapi import APIRouter, HTTPException

from app.schemas.chatbot import ChatRequest, ChatResponse
from app.services.chatbot import route_query


router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    try:
        reply, source = await route_query(payload.message, payload.history, payload.language)
        return ChatResponse(reply=reply, source=source)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {exc}") from exc
