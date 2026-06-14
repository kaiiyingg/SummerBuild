import json
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings

SYSTEM_PROMPT = """You are Pilly, a hospital pharmacy assistant.

Goal:
- Give accurate, concise, patient-friendly answers on medicines and pharmacy basics:
  uses, dose timing, side effects, interactions, precautions, storage, and terms like "take with food".
- Give general wellness advice for mild symptoms and when to seek care.

Safety rules:
- Do not diagnose conditions.
- Do not prescribe or choose prescription medicines for the user.
- If unsure or risk is meaningful, say so clearly and advise contacting a pharmacist or doctor.
- Never invent facts, policies, or patient-specific details.

Style:
- Keep replies short, clear, and practical.
- Avoid jargon; use simple language.
"""

DEFAULT_LOCALE = "en"
SUPPORTED_LOCALES = {"en", "zh", "ta", "ms"}
LOCALE_DIR = Path(__file__).resolve().parent / "locale"

client = AsyncOpenAI(api_key=settings.REKA_API_KEY, base_url="https://api.reka.ai/v1")


def _load_locale(locale_code: str) -> dict[str, Any]:
    locale_path = LOCALE_DIR / f"chatbot_{locale_code}.json"
    with locale_path.open("r", encoding="utf-8") as file:
        return json.load(file)


LOCALES: dict[str, dict[str, Any]] = {code: _load_locale(code) for code in SUPPORTED_LOCALES}

LANGUAGE_TO_LOCALE: dict[str, str] = {}
for code, data in LOCALES.items():
    LANGUAGE_TO_LOCALE[code] = code
    for alias in data.get("language_aliases", []):
        normalized_alias = str(alias).strip().lower()
        if normalized_alias:
            LANGUAGE_TO_LOCALE[normalized_alias] = code


def _normalize_locale(language: str | None) -> str:
    if not language:
        return DEFAULT_LOCALE
    normalized = language.strip().lower()
    return LANGUAGE_TO_LOCALE.get(normalized, DEFAULT_LOCALE)


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _is_restock_eta_query(user_text: str, locale_data: dict[str, Any]) -> bool:
    restock_data = locale_data["restock"]
    readiness_phrases = restock_data["readiness_phrases"]
    medication_terms = restock_data["medication_terms"]

    has_readiness_intent = _contains_any(user_text, readiness_phrases)
    has_medication_context = _contains_any(user_text, medication_terms) or "my " in user_text
    return has_readiness_intent and has_medication_context


def _redirect_match(user_text: str, locale_data: dict[str, Any]) -> str | None:
    for entry in locale_data["redirect_triggers"]:
        if _contains_any(user_text, entry["keywords"]):
            return entry["reply"]
    return None


def _faq_match(user_text: str, locale_data: dict[str, Any]) -> str | None:
    for entry in locale_data["faq_responses"]:
        if _contains_any(user_text, entry["keywords"]):
            return entry["reply"]
    return None


def _system_prompt_for_locale(locale_data: dict[str, Any]) -> str:
    language_instruction = locale_data.get("assistant_language_instruction", "")
    return SYSTEM_PROMPT if not language_instruction else f"{SYSTEM_PROMPT}\n\n{language_instruction}"


def _sanitize_history_for_reka(history: list[dict] | None) -> list[dict[str, str]]:
    raw: list[dict[str, str]] = []
    for item in history or []:
        role = str(item.get("role", "")).strip()
        content = str(item.get("content", "")).strip()
        if role in {"user", "assistant"} and content:
            raw.append({"role": role, "content": content})

    # Reka requires the first non-system turn to be a user message.
    while raw and raw[0]["role"] != "user":
        raw.pop(0)

    if not raw:
        return []

    # Keep strict alternation by dropping consecutive same-role turns.
    normalized: list[dict[str, str]] = [raw[0]]
    for msg in raw[1:]:
        if msg["role"] == normalized[-1]["role"]:
            continue
        normalized.append(msg)

    return normalized


async def route_query(message: str, history: list[dict], language: str | None = None) -> tuple[str, str]:
    locale_code = _normalize_locale(language)
    locale_data = LOCALES[locale_code]
    user_text = message.strip().lower()

    # Check redirect first so personal requests are not answered by generic FAQ.
    redirect_reply = _redirect_match(user_text, locale_data)
    if redirect_reply:
        return redirect_reply, "redirect"

    # Fast lane for public FAQ questions.
    if _is_restock_eta_query(user_text, locale_data):
        return locale_data["restock"]["reply"], "faq"

    faq_reply = _faq_match(user_text, locale_data)
    if faq_reply:
        return faq_reply, "faq"

    # Complex lane for open ended questions.
    history_messages = _sanitize_history_for_reka(history)
    # Keep only recent turns to bound token usage.
    context_messages = history_messages[-8:]
    # If latest history message is already user text, drop it and use current message as final user turn.
    if context_messages and context_messages[-1]["role"] == "user":
        context_messages = context_messages[:-1]

    messages: list[dict[str, str]] = [{"role": "system", "content": _system_prompt_for_locale(locale_data)}]
    messages.extend(context_messages)
    messages.append({"role": "user", "content": message.strip()})

    try:
        response = await client.chat.completions.create(
            model="reka-flash",
            messages=messages,
            temperature=0.4,
            max_tokens=500,
        )
    except Exception:
        return locale_data["fallbacks"]["ai_unavailable"], "reka"

    reply = (response.choices[0].message.content or "").strip()
    if not reply:
        reply = locale_data["fallbacks"]["empty_reply"]

    return reply, "reka"
