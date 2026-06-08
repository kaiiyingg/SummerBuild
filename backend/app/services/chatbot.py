from openai import AsyncOpenAI

from app.core.config import settings


FAQ_RESPONSES: list[tuple[set[str], str]] = [
    (
        {"opening hours", "operating hours", "what time"},
        "The pharmacy is open Monday to Friday, 8am to 6pm, and Saturday 8am to 1pm.",
    ),
    (
        {"location", "where", "counter", "how to find"},
        "The pharmacy counter is located at Level 2, Counter 3.",
    ),
    (
        {"queue", "wait time", "how long"},
        "Please check your real-time queue status on the Queue Tracking page.",
    ),
    (
        {"out of stock", "not available", "delay"},
        "If your medication is out of stock, you will receive an automatic notification with rescheduling options.",
    ),
]

REDIRECT_KEYWORDS = {
    "appointment",
    "my medication",
    "my record",
    "my history",
    "prescription",
}

SYSTEM_PROMPT = (
    "You are Pilly, a patient-facing pharmacy assistant. "
    "Only answer pharmacy and medication-related questions in a safe, concise way. "
    "Do not provide diagnosis. "
    "If a user asks for personal data, appointments, records, or prescriptions, "
    "tell them to log in to their Patient Dashboard."
)

client = AsyncOpenAI(api_key=settings.REKA_API_KEY, base_url="https://api.reka.ai/v1")


def _contains_any(text: str, keywords: set[str]) -> bool:
    return any(keyword in text for keyword in keywords)


async def route_query(message: str, history: list[dict]) -> tuple[str, str]:
    user_text = message.strip().lower()

    # Lane 1: Fast path for known FAQ intents.
    for keywords, reply in FAQ_RESPONSES:
        if _contains_any(user_text, keywords):
            return reply, "faq"

    # Lane 2: Redirect user for patient-specific data requests.
    if _contains_any(user_text, REDIRECT_KEYWORDS):
        return (
            "For personal records and appointments, please log in to your Patient Dashboard.",
            "redirect",
        )

    # Lane 3: Use Reka for everything else and keep multi-turn context.
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for item in history or []:
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role in {"user", "assistant", "system"} and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model="reka-flash",
        messages=messages,
        temperature=0.4,
        max_tokens=500,
    )

    reply = (response.choices[0].message.content or "").strip()
    if not reply:
        reply = "I am sorry, I could not generate a response right now. Please try again."

    return reply, "reka"
