import re

from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()

_client = AsyncOpenAI(api_key=settings.REKA_API_KEY, base_url="https://api.reka.ai/v1")

SUPPORTED_LOCALES = {
    "en": "English",
    "zh": "Chinese",
    "ms": "Malay",
    "ta": "Tamil",
}


class TranslateTextRequest(BaseModel):
    texts: list[str]
    language: str = "en"


class TranslateTextResponse(BaseModel):
    translations: list[str]


@router.post("/translate-text", response_model=TranslateTextResponse)
async def translate_text_route(body: TranslateTextRequest) -> TranslateTextResponse:
    if not body.texts:
        return TranslateTextResponse(translations=[])

    if body.language == "en" or body.language not in SUPPORTED_LOCALES:
        return TranslateTextResponse(translations=list(body.texts))

    target = SUPPORTED_LOCALES[body.language]
    numbered = "\n".join(f"{i + 1}. {text}" for i, text in enumerate(body.texts))

    prompt = (
        f"Translate the following medication instruction texts into {target}.\n\n"
        "Return ONLY a numbered list in this exact format:\n"
        "1. [translation]\n"
        "2. [translation]\n"
        "...\n\n"
        "Rules:\n"
        "- Keep medication names, dosages, numbers, and units unchanged.\n"
        "- Do not add explanations or commentary.\n"
        "- Preserve the original meaning precisely.\n\n"
        f"Texts to translate:\n{numbered}"
    )

    try:
        response = await _client.chat.completions.create(
            model="reka-flash",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.1,
        )
        raw = response.choices[0].message.content or ""
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Translation service error.") from exc

    translations: list[str] = []
    for line in raw.strip().splitlines():
        match = re.match(r"^\d+\.\s*(.+)$", line.strip())
        if match:
            translations.append(match.group(1).strip())

    if len(translations) != len(body.texts):
        return TranslateTextResponse(translations=list(body.texts))

    return TranslateTextResponse(translations=translations)
