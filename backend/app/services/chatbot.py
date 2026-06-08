from openai import AsyncOpenAI

from app.core.config import settings

# Lane 1: Public FAQ intents that do not require patient account data.
FAQ_RESPONSES: list[tuple[set[str], str]] = [
    (
        {"opening hours", "operating hours", "what time", "closing time", "open today"},
        "The pharmacy is open Monday to Friday, 8am to 6pm, and Saturday 8am to 1pm.",
    ),
    (
        {"location", "where", "counter", "how to find", "which level", "which floor"},
        "The pharmacy counter is located at Level 2, Counter 3.",
    ),
    (
        {"queue", "wait time", "how long", "queue status"},
        "Please check your real time queue status in the Queue tab.",
    ),
    (
        {"out of stock", "not available", "delay", "delayed", "shortage"},
        "If your medication is out of stock, you will receive an automatic notification with rescheduling options.",
    ),
    (
        {"contact", "phone number", "hotline", "call pharmacy"},
        "You can contact the pharmacy at +65 6123 4567 during operating hours.",
    ),
]

RESTOCK_REPLY = (
    "Your medication is currently being prepared or restocked. "
    "You will receive a notification once it is ready for collection. "
    "If you cannot wait, go to the Queue tab and tap Reschedule Collection to choose another day."
)

# Lane 2: Patient specific queries should redirect to the correct product area.
REDIRECT_TRIGGERS: list[tuple[set[str], str]] = [
    (
        {
            "missed my queue",
            "i missed my queue",
            "missed queue number",
            "my queue expired",
            "queue expired",
            "missed registration queue",
            "what if i miss my queue",
        },
        "If you missed your registration queue number, open the Patient App Queue tab and tap Re-register to get a new queue number.",
    ),
    (
        {
            "my medication list",
            "what medication am i on",
            "my medications",
            "medications i am taking",
            "my drugs",
            "my prescription list",
            "my meds",
            "my medicine",
        },
        "Go to the My Meds tab to view your current medication list.",
    ),
    (
        {
            "my queue number",
            "what is my queue",
            "my queue status",
            "my turn",
            "my number",
            "check my queue",
        },
        "Go to the Queue tab to view your current number and waiting status.",
    ),
    (
        {
            "my reminder",
            "my reminders",
            "set reminder",
            "medication reminder",
            "remind me",
        },
        "Go to the Reminders tab to view or set medication reminders.",
    ),
    (
        {
            "my record",
            "my medical record",
            "my history",
            "past visits",
            "my profile",
            "my details",
        },
        "Go to the Profile tab, then Past Visits, to view your visit and medication history.",
    ),
    (
        {
            "appointment",
            "my appointment",
            "booking",
            "reschedule appointment",
            "cancel appointment",
        },
        "For doctor appointment requests, please contact the clinic at +65 6123 4567. "
        "For medication collection timing, use the Queue tab and tap Reschedule Collection.",
    ),
    (
        {"prescription", "my prescription", "what was prescribed", "doctor prescribed"},
        "Go to the My Meds tab to review your active prescription.",
    ),
]

SYSTEM_PROMPT = """You are Pilly, a clinic pharmacy assistant.

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

client = AsyncOpenAI(api_key=settings.REKA_API_KEY, base_url="https://api.reka.ai/v1")


def _contains_any(text: str, keywords: set[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _is_restock_eta_query(user_text: str) -> bool:
    readiness_phrases = {
        "when will my",
        "when is my",
        "be ready",
        "ready for collection",
        "ready to collect",
        "ready yet",
        "restock",
        "restocked",
        "restocking",
        "out of stock",
    }
    medication_terms = {"medication", "medicine", "med", "prescription", "drug", "tablet", "capsule"}

    has_readiness_intent = _contains_any(user_text, readiness_phrases)
    has_medication_context = _contains_any(user_text, medication_terms) or "my " in user_text
    return has_readiness_intent and has_medication_context


def _redirect_match(user_text: str) -> str | None:
    for keywords, reply in REDIRECT_TRIGGERS:
        if _contains_any(user_text, keywords):
            return reply
    return None


def _faq_match(user_text: str) -> str | None:
    for keywords, reply in FAQ_RESPONSES:
        if _contains_any(user_text, keywords):
            return reply
    return None


async def route_query(message: str, history: list[dict]) -> tuple[str, str]:
    user_text = message.strip().lower()

    # Check redirect first so personal requests are not answered by generic FAQ.
    redirect_reply = _redirect_match(user_text)
    if redirect_reply:
        return redirect_reply, "redirect"

    # Fast lane for public FAQ questions.
    if _is_restock_eta_query(user_text):
        return RESTOCK_REPLY, "faq"

    faq_reply = _faq_match(user_text)
    if faq_reply:
        return faq_reply, "faq"

    # Complex lane for open ended questions.
    # Intentionally ignore history so the provider answers only the latest user input.
    _ = history
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.append({"role": "user", "content": message})

    try:
        response = await client.chat.completions.create(
            model="reka-flash",
            messages=messages,
            temperature=0.4,
            max_tokens=500,
        )
    except Exception:
        return (
            "I could not reach the AI assistant right now. Please try again in a moment. "
            "If this keeps happening, contact the pharmacy.",
            "reka",
        )

    reply = (response.choices[0].message.content or "").strip()
    if not reply:
        reply = "I could not generate a response right now. Please try again or contact the pharmacy."

    return reply, "reka"
