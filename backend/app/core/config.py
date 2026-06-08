import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class Settings(BaseModel):
    REKA_API_KEY: str


reka_api_key = os.getenv("REKA_API_KEY")
if not reka_api_key:
    raise RuntimeError(
        "Missing REKA_API_KEY in environment. Set it in backend/.env before starting the server."
    )

settings = Settings(REKA_API_KEY=reka_api_key)
