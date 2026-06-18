import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class Settings(BaseModel):
    REKA_API_KEY: str
    OPENAI_API_KEY: str | None = None
    OPENAI_TTS_MODEL: str = "gpt-4o-mini-tts"
    OPENAI_TTS_VOICE: str = "marin"
    OPENAI_TTS_SPEED: float = 1.0
    OPENAI_QUANTITY_MODEL: str = "gpt-4.1"
    OPENAI_TRANSLATION_MODEL: str = "gpt-4.1"
    


reka_api_key = os.getenv("REKA_API_KEY")
if not reka_api_key:
    raise RuntimeError(
        "Missing REKA_API_KEY in environment. Set it in backend/.env before starting the server."
    )

openai_tts_speed_raw = os.getenv("OPENAI_TTS_SPEED", "1.0")
try:
    openai_tts_speed = float(openai_tts_speed_raw)
except ValueError:
    openai_tts_speed = 1.0

settings = Settings(
    REKA_API_KEY=reka_api_key,
    OPENAI_API_KEY=os.getenv("OPENAI_API_KEY"),
    OPENAI_TTS_MODEL=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
    OPENAI_TTS_VOICE=os.getenv("OPENAI_TTS_VOICE", "marin"),
    OPENAI_TTS_SPEED=max(0.25, min(4.0, openai_tts_speed)),
    OPENAI_QUANTITY_MODEL=os.getenv("OPENAI_QUANTITY_MODEL", "gpt-4o"),
    OPENAI_TRANSLATION_MODEL=os.getenv("OPENAI_TRANSLATION_MODEL", "gpt-4.1"),
)
