import { useState, useRef, useEffect } from "react";
import { Mic, Send, Pill } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";

const C = {
  teal: "#45C5BC",
  tealLight: "#F0FDFA",
  bg: "#F8FAFC",
  muted: "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond: "#64748B",
  textDisabled: "#94A3B8",
  border: "#E2E8F0",
};

type Message = { id: number; role: "bot" | "user"; text: string; time: string };
type ChatApiResponse = { reply: string; source: "faq" | "redirect" | "reka" };

const GREETING_REPLIES: Record<string, string> = {
  en:
    "Hello Mdm. Tan! I'm Pilly, your hospital pharmacy assistant. I can help with medication usage, dosage guidance, side effects, interactions, storage, and pharmacy services like queue, collection, and opening hours. How can I help you today?",
  zh:
    "您好，陈女士！我是 Pilly，您的医院药房助手。我可以协助您了解用药方式、剂量建议、副作用、药物相互作用、储存方式，以及排队、取药和营业时间等药房服务。请问今天我可以怎么帮助您？",
  ta:
    "வணக்கம் டான் மேடம்! நான் உங்கள் மருத்துவமனை மருந்தக உதவியாளர் Pilly. மருந்து பயன்படுத்தும் முறை, அளவு வழிகாட்டல், பக்கவிளைவுகள், மருந்துகள் இடையிலான தொடர்புகள், சேமிப்பு, மேலும் வரிசை, பெறுதல், திறப்பு நேரம் போன்ற சேவைகளில் உதவ முடியும். இன்று உங்களுக்கு என்ன உதவி வேண்டும்?",
  ms:
    "Hai Puan Tan! Saya Pilly, pembantu farmasi hospital anda. Saya boleh bantu tentang penggunaan ubat, panduan dos, kesan sampingan, interaksi ubat, penyimpanan, serta perkhidmatan farmasi seperti giliran, pengambilan ubat, dan waktu operasi. Bagaimana saya boleh bantu anda hari ini?",
};

const GREETING_KEYWORDS: Record<string, string[]> = {
  en: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
  zh: ["你好", "您好", "哈喽", "嗨", "早上好", "下午好", "晚上好"],
  ta: ["வணக்கம்", "ஹலோ", "ஹாய்", "காலை வணக்கம்", "மதிய வணக்கம்", "மாலை வணக்கம்"],
  ms: ["hai", "helo", "hello", "selamat pagi", "selamat tengah hari", "selamat petang", "selamat malam"],
};

const ENDING_REPLIES: Record<string, string> = {
  en: "You're welcome. Glad I could help. If you need support later, just message me anytime.",
  zh: "不客气。很高兴帮到您。如果之后还需要帮助，随时发消息给我。",
  ta: "பரவாயில்லை. உதவியதில் மகிழ்ச்சி. பிறகு உதவி தேவைப்பட்டால் எப்போது வேண்டுமானாலும் எனக்கு எழுதுங்கள்.",
  ms: "Sama-sama. Gembira dapat membantu. Jika perlukan bantuan lagi nanti, mesej saya pada bila-bila masa.",
};

const ENDING_KEYWORDS: Record<string, string[]> = {
  en: [
    "thanks",
    "thank you",
    "thx",
    "bye",
    "goodbye",
    "see you",
    "see ya",
    "thats all",
    "that's all",
    "thats it",
    "that's it",
    "all good",
    "no more questions",
    "nothing else",
    "ok got it",
    "okay got it",
    "understood",
    "noted",
    "im done",
    "i'm done",
  ],
  zh: ["谢谢", "多谢", "感谢", "再见", "拜拜", "就这样", "没有了", "没问题了", "明白了", "知道了"],
  ta: ["நன்றி", "மிக்க நன்றி", "பை", "பிரியாவிடை", "அவ்வளவுதான்", "வேறு கேள்வி இல்லை", "புரிந்தது", "இப்போதைக்கு போதும்"],
  ms: ["terima kasih", "bye", "selamat tinggal", "jumpa lagi", "itu sahaja", "tiada soalan lagi", "faham", "sudah cukup", "dah settle"],
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const DEFAULT_LANGUAGE = "en";

const FAQ_CHIP_KEYS = [
  "chat.suggestionOne",
  "chat.suggestionTwo",
  "chat.suggestionThree",
  "chat.suggestionFour",
  "chat.suggestionFive",
] as const;

const FAQ_CHIP_FALLBACKS = [
  "What is my queue status?",
  "Where can I see my medication list?",
  "How do I set medication reminders?",
  "What are common side effects?",
  "What are the pharmacy opening hours?",
];

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return <strong key={idx}>{boldMatch[1]}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
}

function renderBotFormattedText(rawText: string) {
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/(\*\*[^*]+\*\*:?)\s*-\s+/g, "$1\n- ")
    .replace(/([.:!?])\s+-\s+/g, "$1\n- ");

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: { type: "p" | "ul"; items: string[] }[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ type: "ul", items: listBuffer });
      listBuffer = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2).trim());
      continue;
    }
    flushList();
    blocks.push({ type: "p", items: [line] });
  }
  flushList();

  return (
    <div className="space-y-2">
      {blocks.map((block, idx) =>
        block.type === "p" ? (
          <p key={idx}>{renderInlineMarkdown(block.items[0])}</p>
        ) : (
          <ul key={idx} className="list-disc pl-5 space-y-1">
            {block.items.map((item, itemIdx) => (
              <li key={itemIdx}>{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

export function AskPillyScreen() {
  const { language, t } = useTranslation();
  const greetingForLanguage = GREETING_REPLIES[language] ?? GREETING_REPLIES[DEFAULT_LANGUAGE];
  const endingForLanguage = ENDING_REPLIES[language] ?? ENDING_REPLIES[DEFAULT_LANGUAGE];

  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "bot", text: greetingForLanguage, time: "2:34 PM" }]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ id: 1, role: "bot", text: greetingForLanguage, time: "2:34 PM" }]);
  }, [greetingForLanguage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const isAsciiKeyword = (keyword: string) => /^[a-z0-9\s'’-]+$/i.test(keyword);

  const matchesAnyKeyword = (normalizedText: string, keywords: string[]) =>
    keywords.some((keyword) => {
      const normalizedKeyword = keyword.trim().toLowerCase();
      if (!normalizedKeyword) return false;

      // For latin keywords, match as whole words/phrases to avoid false positives like "hi" in "which".
      if (isAsciiKeyword(normalizedKeyword)) {
        const pattern = new RegExp(`(^|\\W)${escapeRegExp(normalizedKeyword)}(?=\\W|$)`, "i");
        return pattern.test(normalizedText);
      }

      // For non-latin scripts, keep phrase containment.
      return normalizedText.includes(normalizedKeyword);
    });

  const detectSmallTalkIntent = (text: string): "greeting" | "ending" | null => {
    const normalized = text.trim().toLowerCase();
    const greetingKeywords = GREETING_KEYWORDS[language] ?? GREETING_KEYWORDS[DEFAULT_LANGUAGE];
    if (matchesAnyKeyword(normalized, greetingKeywords)) return "greeting";

    const endingKeywords = ENDING_KEYWORDS[language] ?? ENDING_KEYWORDS[DEFAULT_LANGUAGE];
    if (matchesAnyKeyword(normalized, endingKeywords)) return "ending";

    return null;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;

    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
    const userMessage: Message = { id: messages.length + 1, role: "user", text, time: now };
    const history = messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text,
    }));

    setMessages((m) => [...m, userMessage]);
    setInputText("");

    const smallTalkIntent = detectSmallTalkIntent(text);
    if (smallTalkIntent) {
      const smallTalkReply = smallTalkIntent === "greeting" ? greetingForLanguage : endingForLanguage;
      setMessages((m) => [...m, { id: m.length + 1, role: "bot", text: smallTalkReply, time: now }]);
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, language }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const errData = (await res.json()) as { detail?: string };
          detail = errData.detail?.trim() || "";
        } catch {
          // Ignore parse failures and fall back to status text.
        }
        throw new Error(detail || `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as ChatApiResponse;
      const reply = data.reply?.trim() || "I could not generate a response right now. Please try again.";
      setMessages((m) => [...m, { id: m.length + 1, role: "bot", text: reply, time: now }]);
    } catch (err) {
      const errorText =
        err instanceof Error && err.message
          ? err.message
          : "I am unable to connect right now. Please check that the backend server is running and try again.";
      setMessages((m) => [
        ...m,
        {
          id: m.length + 1,
          role: "bot",
          text: errorText,
          time: now,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <style>{`
        @keyframes pilly-dot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
      <div className="px-4 pt-5 pb-3 shrink-0">
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: C.textPrimary }}>
          {t('chat.title')}
        </h1>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond }}>
          Powered by Reka AI
        </p>
      </div>

      <div className="px-4 pb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FAQ_CHIP_FALLBACKS.map((fallback, i) => {
            const label = FAQ_CHIP_KEYS[i] ? t(FAQ_CHIP_KEYS[i] as string) : fallback;
            return (
              <button
                key={i}
                onClick={() => sendMessage(label)}
                className="shrink-0 px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
                style={{
                  background: C.tealLight,
                  color: C.teal,
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  border: `1px solid ${C.teal}25`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
        {messages.map((msg, idx) => {
          const showTime = !messages[idx - 1] || messages[idx - 1].time !== msg.time;
          return (
            <div key={msg.id}>
              {showTime && (
                <p
                  className="text-center mb-2"
                  style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textDisabled }}
                >
                  {msg.time}
                </p>
              )}
              <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "bot" && (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{ background: C.teal }}
                  >
                    <Pill size={17} color="white" />
                  </div>
                )}
                <div
                  className="max-w-[78%] px-4 py-3"
                  style={{
                    background: msg.role === "bot" ? "white" : C.teal,
                    color: msg.role === "bot" ? C.textPrimary : "white",
                    borderRadius: msg.role === "bot" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    boxShadow: msg.role === "bot" ? "0 1px 6px rgba(0,0,0,0.07)" : "none",
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: "15px",
                    lineHeight: "1.6",
                    border: msg.role === "bot" ? `1px solid ${C.border}` : "none",
                  }}
                >
                  {msg.role === "bot" ? renderBotFormattedText(msg.text) : msg.text}
                </div>
              </div>
            </div>
          );
        })}
        {isSending && (
          <div className="flex gap-2 justify-start">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1"
              style={{ background: C.teal }}
            >
              <Pill size={17} color="white" />
            </div>
            <div
              className="px-4 py-3"
              style={{
                background: "white",
                borderRadius: "4px 16px 16px 16px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                border: `1px solid ${C.border}`,
              }}
              aria-label="Pilly is typing"
            >
              <span style={{ display: "inline-flex", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.textSecond, animation: "pilly-dot 1.2s infinite" }} />
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.textSecond, animation: "pilly-dot 1.2s infinite 0.2s" }} />
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.textSecond, animation: "pilly-dot 1.2s infinite 0.4s" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-4 py-3 bg-white" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <button aria-label="Voice input">
            <Mic size={22} color={C.textSecond} />
          </button>
          <div className="flex-1 flex items-center px-4 py-2.5 rounded-3xl" style={{ background: C.muted }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(inputText)}
              placeholder={t('chat.placeholder')}
              className="flex-1 bg-transparent outline-none"
              style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary }}
            />
          </div>
          <button
            onClick={() => sendMessage(inputText)}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSending}
            style={{ background: C.teal }}
            aria-label="Send"
          >
            <Send size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
