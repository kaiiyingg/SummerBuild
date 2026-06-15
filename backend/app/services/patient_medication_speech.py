from openai import AsyncOpenAI

from app.core.config import settings


client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

SUPPORTED_LOCALES = {
    "en": "English",
    "zh": "Chinese",
    "ms": "Malay",
    "ta": "Tamil",
}

VOICE_INSTRUCTIONS = {
    "en": "Read the text exactly as written in English. Speak calmly, clearly, and at a patient-friendly pace.",
    "zh": "Read the text exactly as written in Chinese. Speak calmly, clearly, and at a patient-friendly pace.",
    "ms": "Read the text exactly as written in Malay. Speak calmly, clearly, and at a patient-friendly pace.",
    "ta": "Read the text exactly as written in Tamil. Speak calmly, clearly, and at a patient-friendly pace.",
}

LOCALIZED_MESSAGES = {
    "en": {
        "tts_empty": "There is nothing to read aloud yet.",
        "tts_not_configured": "Audio readout is not configured yet. Add OPENAI_API_KEY to backend/.env.",
        "tts_unavailable": "Audio readout is temporarily unavailable. Please try again shortly.",
    },
    "zh": {
        "tts_empty": "目前没有可朗读的内容。",
        "tts_not_configured": "语音朗读尚未配置，请在 backend/.env 中加入 OPENAI_API_KEY。",
        "tts_unavailable": "语音朗读暂时不可用，请稍后再试。",
    },
    "ms": {
        "tts_empty": "Tiada kandungan untuk dibacakan buat masa ini.",
        "tts_not_configured": "Bacaan audio belum dikonfigurasi. Tambah OPENAI_API_KEY ke dalam backend/.env.",
        "tts_unavailable": "Bacaan audio tidak tersedia buat sementara waktu. Sila cuba sebentar lagi.",
    },
    "ta": {
        "tts_empty": "இப்போது ஒலியாகப் படிக்க எந்த உரையும் இல்லை.",
        "tts_not_configured": "ஒலி வாசிப்பு இன்னும் அமைக்கப்படவில்லை. backend/.env இல் OPENAI_API_KEY ஐ சேர்க்கவும்.",
        "tts_unavailable": "ஒலி வாசிப்பு தற்போது கிடைக்கவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
    },
}


class PatientMedicationSpeechError(Exception):
    pass


def _normalize_locale(language: str | None) -> str:
    if not language:
        return "en"
    normalized = language.strip().lower()
    return normalized if normalized in SUPPORTED_LOCALES else "en"


def get_localized_speech_message(key: str, language: str | None) -> str:
    locale = _normalize_locale(language)
    return LOCALIZED_MESSAGES.get(locale, LOCALIZED_MESSAGES["en"]).get(key, LOCALIZED_MESSAGES["en"][key])


async def synthesize_patient_medication_speech(*, text: str, language: str | None) -> bytes:
    locale = _normalize_locale(language)
    normalized_text = " ".join(text.split()).strip()

    if not normalized_text:
        raise PatientMedicationSpeechError(get_localized_speech_message("tts_empty", locale))

    if not client:
        raise PatientMedicationSpeechError(get_localized_speech_message("tts_not_configured", locale))

    try:
        response = await client.audio.speech.create(
            model=settings.OPENAI_TTS_MODEL,
            voice=settings.OPENAI_TTS_VOICE,
            input=normalized_text[:4096],
            instructions=VOICE_INSTRUCTIONS.get(locale, VOICE_INSTRUCTIONS["en"]),
            response_format="mp3",
            speed=settings.OPENAI_TTS_SPEED,
        )
        return await response.aread()
    except Exception as exc:
        raise PatientMedicationSpeechError(
            get_localized_speech_message("tts_unavailable", locale)
        ) from exc
