import io

from openai import AsyncOpenAI

from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

# Whisper BCP-47 language codes
_LANG_CODES: dict[str, str] = {
    "en": "en",
    "zh": "zh",
    "ms": "ms",
    "ta": "ta",
}


async def transcribe_audio(*, audio_bytes: bytes, filename: str, language: str | None) -> str:
    if not client:
        raise RuntimeError("OpenAI API key not configured. Add OPENAI_API_KEY to backend/.env.")

    lang = _LANG_CODES.get((language or "en").strip().lower())

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    kwargs: dict = dict(model="whisper-1", file=audio_file)
    if lang:
        kwargs["language"] = lang

    response = await client.audio.transcriptions.create(**kwargs)
    return response.text.strip()
