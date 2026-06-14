import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Paperclip, Pill, Send, Video, X } from "lucide-react";
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
type ChatApiResponse = { reply: string; source?: "faq" | "redirect" | "reka" };
type AttachmentType = "image" | "video";
type MediaAttachment = { file: File; kind: AttachmentType; previewUrl: string };

const GREETING_TEMPLATES: Record<string, string> = {
  en:
    "Hello {{name}}! I'm Pilly, your hospital pharmacy assistant. I can help with medication usage, dosage guidance, side effects, interactions, storage, and pharmacy services such as queue status, medication collection, and opening hours.\n\nYou can also upload or capture photos and short videos of your medications. I can help identify medications, explain how to use them, check whether they are being taken correctly, and provide guidance on proper medication handling and storage. You can also ask your question directly in the video.\n\nHow can I help you today?",
  zh:
    "您好，{{name}}！我是 Pilly，您的医院药房助手。我可以协助您了解用药方式、剂量建议、副作用、药物相互作用、储存方式，以及排队状态、取药和营业时间等药房服务。\n\n您也可以上传或拍摄药物照片和短视频。我可以帮助识别药物、解释用法、检查是否服用正确，并提供药物处理与储存的安全建议。您也可以直接在视频里提出问题。\n\n请问今天我可以怎么帮助您？",
  ta:
    "வணக்கம் {{name}}! நான் உங்கள் மருத்துவமனை மருந்தக உதவியாளர் Pilly. மருந்தைப் பயன்படுத்தும் முறை, அளவு வழிகாட்டல், பக்கவிளைவுகள், மருந்து தொடர்புகள், சேமிப்பு மற்றும் வரிசை நிலை, மருந்து பெறுதல், திறப்பு நேரம் போன்ற மருந்தக சேவைகளில் உதவ முடியும்.\n\nஉங்கள் மருந்துகளின் புகைப்படம் அல்லது குறும் வீடியோவை பதிவேற்றலாம் அல்லது எடுக்கலாம். மருந்தை அடையாளம் காண, பயன்படுத்தும் முறையை விளக்க, சரியாக எடுத்துக்கொள்கிறீர்களா என்று சரிபார்க்க, மருந்தை பாதுகாப்பாக கையாளவும் சேமிக்கவும் வழிகாட்ட முடியும். உங்கள் கேள்வியை வீடியோவிலேயே நேரடியாக கேட்கவும் முடியும்.\n\nஇன்று உங்களுக்கு என்ன உதவி வேண்டும்?",
  ms:
    "Hai {{name}}! Saya Pilly, pembantu farmasi hospital anda. Saya boleh bantu tentang penggunaan ubat, panduan dos, kesan sampingan, interaksi ubat, penyimpanan, serta perkhidmatan farmasi seperti status giliran, pengambilan ubat, dan waktu operasi.\n\nAnda juga boleh memuat naik atau merakam foto dan video pendek ubat anda. Saya boleh bantu kenal pasti ubat, terangkan cara penggunaan, semak sama ada ubat diambil dengan betul, dan beri panduan pengendalian serta penyimpanan ubat yang selamat. Anda juga boleh tanya soalan terus dalam video.\n\nBagaimana saya boleh bantu anda hari ini?",
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
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

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

function getUserDisplayName() {
  const stored = localStorage.getItem("pilly-user-name")?.trim();
  return stored || "Patient";
}

function greetingFor(language: string, name: string) {
  const template = GREETING_TEMPLATES[language] ?? GREETING_TEMPLATES[DEFAULT_LANGUAGE];
  return template.replace("{{name}}", name);
}

export function AskPillyScreen() {
  const { language, t } = useTranslation();
  const greetingForLanguage = greetingFor(language, getUserDisplayName());
  const endingForLanguage = ENDING_REPLIES[language] ?? ENDING_REPLIES[DEFAULT_LANGUAGE];

  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "bot", text: greetingForLanguage, time: "2:34 PM" }]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const [composerError, setComposerError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setMessages([{ id: 1, role: "bot", text: greetingForLanguage, time: "2:34 PM" }]);
  }, [greetingForLanguage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [attachment, cameraStream]);

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isAsciiKeyword = (keyword: string) => /^[a-z0-9\s'’-]+$/i.test(keyword);

  const matchesAnyKeyword = (normalizedText: string, keywords: string[]) =>
    keywords.some((keyword) => {
      const normalizedKeyword = keyword.trim().toLowerCase();
      if (!normalizedKeyword) return false;
      if (isAsciiKeyword(normalizedKeyword)) {
        const pattern = new RegExp(`(^|\\W)${escapeRegExp(normalizedKeyword)}(?=\\W|$)`, "i");
        return pattern.test(normalizedText);
      }
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

  function clearAttachment() {
    setAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  }

  function setAttachmentFile(file: File) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setComposerError(t("chat.attachUnsupported"));
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setComposerError(t("chat.attachTooLarge"));
      return;
    }

    setComposerError("");
    setAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return {
        file,
        kind: isVideo ? "video" : "image",
        previewUrl: URL.createObjectURL(file),
      };
    });
  }

  async function openLiveCamera() {
    setComposerError("");
    setCameraError("");
    setCameraOpen(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("chat.cameraNotSupported"));
      return;
    }

    try {
      cameraStream?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });
      setCameraStream(stream);
    } catch {
      setCameraError(t("chat.cameraOpenError"));
    }
  }

  function closeCamera() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraError("");
    setCameraOpen(false);
  }

  async function captureCameraPhoto() {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError(t("chat.cameraNotReady"));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError(t("chat.cameraCapturePhotoError"));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError(t("chat.cameraCapturePhotoError"));
      return;
    }

    const file = new File([blob], `ask-pilly-${Date.now()}.jpg`, { type: "image/jpeg" });
    setAttachmentFile(file);
    closeCamera();
  }

  function pickRecorderMimeType() {
    const candidates = [
      "video/mp4;codecs=h264",
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const mimeType of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return "";
  }

  function toggleVideoRecording() {
    if (!cameraStream) {
      setCameraError(t("chat.cameraNotReady"));
      return;
    }

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(cameraStream, { mimeType }) : new MediaRecorder(cameraStream);
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        const outputType = recorder.mimeType || "video/webm";
        const blob = new Blob(recordingChunksRef.current, { type: outputType });
        if (!blob.size) {
          setCameraError(t("chat.cameraCaptureVideoError"));
          return;
        }
        const ext = outputType.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `ask-pilly-${Date.now()}.${ext}`, { type: outputType });
        setAttachmentFile(file);
        closeCamera();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setCameraError("");
    } catch {
      setCameraError(t("chat.cameraRecordError"));
    }
  }

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !attachment) || isSending) return;

    const outboundText = text.trim();
    const now = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
    const userBubbleText = text.trim() || attachment?.file.name || "Attachment";
    const userMessage: Message = { id: messages.length + 1, role: "user", text: userBubbleText, time: now };
    const history = messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text,
    }));

    setMessages((m) => [...m, userMessage]);
    setInputText("");

    const smallTalkIntent = attachment ? null : detectSmallTalkIntent(text);
    if (smallTalkIntent) {
      const smallTalkReply = smallTalkIntent === "greeting" ? greetingForLanguage : endingForLanguage;
      setMessages((m) => [...m, { id: m.length + 1, role: "bot", text: smallTalkReply, time: now }]);
      return;
    }

    setIsSending(true);
    try {
      let res: Response;
      if (attachment) {
        const formData = new FormData();
        formData.append("message", outboundText);
        formData.append("language", language);
        formData.append("history_json", JSON.stringify(history));
        formData.append(attachment.kind, attachment.file);

        res = await fetch(`${API_BASE_URL}/api/chat-with-media`, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: outboundText, history, language }),
        });
      }

      if (!res.ok) {
        let detail = "";
        try {
          const errData = (await res.json()) as { detail?: unknown };
          if (typeof errData.detail === "string") {
            detail = errData.detail.trim();
          } else if (Array.isArray(errData.detail)) {
            detail = errData.detail
              .map((item) => {
                if (item && typeof item === "object" && "msg" in item) {
                  const message = (item as { msg?: unknown }).msg;
                  return typeof message === "string" ? message.trim() : "";
                }
                return "";
              })
              .filter(Boolean)
              .join("; ");
          }
        } catch {
          // Ignore parse failures and fall back to status text.
        }
        throw new Error(detail || `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as ChatApiResponse;
      const reply = data.reply?.trim() || "I could not generate a response right now. Please try again.";
      setMessages((m) => [...m, { id: m.length + 1, role: "bot", text: reply, time: now }]);
      clearAttachment();
      setComposerError("");
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
          {t("chat.title")}
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

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.68)] p-4">
          <div
            className="w-full max-w-xl rounded-[28px] bg-white p-5 md:p-6 space-y-4"
            style={{ boxShadow: "0 30px 80px rgba(15,23,42,0.28)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  style={{
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: C.textDisabled,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  {t("chat.cameraLiveTitle")}
                </p>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: C.textPrimary, marginTop: "6px" }}>
                  {t("chat.cameraCaptureTitle")}
                </h3>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, lineHeight: "1.7", marginTop: "6px" }}>
                  {t("chat.cameraCaptureDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                aria-label={t("chat.cameraClose")}
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: C.muted, border: `1px solid ${C.border}` }}
              >
                <X size={18} color={C.textPrimary} />
              </button>
            </div>

            {cameraError ? (
              <div className="rounded-xl p-3" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>
                {cameraError}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[24px]" style={{ background: cameraStream ? "#0F172A" : C.muted, border: `1px solid ${C.border}` }}>
              {cameraStream ? (
                <video ref={cameraVideoRef} autoPlay playsInline muted className="block h-[360px] w-full object-cover" />
              ) : (
                <div className="flex h-[360px] items-center justify-center px-8 text-center">
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond }}>
                    {t("chat.cameraStarting")}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={captureCameraPhoto}
                disabled={!cameraStream || isRecording}
                className="rounded-xl py-3 transition-opacity disabled:opacity-50"
                style={{ background: C.muted, border: `1px solid ${C.border}`, color: C.textPrimary, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
              >
                {t("chat.cameraCapturePhoto")}
              </button>
              <button
                type="button"
                onClick={toggleVideoRecording}
                disabled={!cameraStream}
                className="rounded-xl py-3 text-white transition-opacity disabled:opacity-50"
                style={{ background: isRecording ? "#EF4444" : C.teal, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
              >
                {isRecording ? t("chat.cameraStopRecording") : t("chat.cameraRecordVideo")}
              </button>
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-xl py-3 transition-opacity hover:opacity-90"
                style={{ background: C.muted, border: `1px solid ${C.border}`, color: C.textPrimary, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
              >
                {t("chat.cameraClose")}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {attachment && (
          <div
            className="mb-3 rounded-xl p-3 flex items-center justify-between gap-3"
            style={{ background: C.muted, border: `1px solid ${C.border}` }}
          >
            <div className="min-w-0 flex items-center gap-2">
              {attachment.kind === "video" ? <Video size={16} color={C.textSecond} /> : <Camera size={16} color={C.textSecond} />}
              <div className="min-w-0">
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: C.textPrimary }}>
                  {attachment.kind === "video"
                    ? t("chat.attachedVideo")
                    : t("chat.attachedImage")}
                </p>
                <p className="truncate" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textSecond }}>
                  {attachment.file.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: "white", border: `1px solid ${C.border}` }}
              aria-label={t("chat.removeAttachment")}
            >
              <X size={16} color={C.textPrimary} />
            </button>
          </div>
        )}

        {composerError && (
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: "#B91C1C", marginBottom: "8px" }}>
            {composerError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            aria-label={t("chat.attachMedia")}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
            style={{ background: C.muted, border: `1px solid ${C.border}` }}
          >
            <Paperclip size={20} color={C.textSecond} />
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                setAttachmentFile(file);
              }
            }}
          />

          <button
            type="button"
            onClick={() => void openLiveCamera()}
            aria-label={t("chat.openCamera")}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
            style={{ background: C.muted, border: `1px solid ${C.border}` }}
          >
            <Camera size={20} color={C.textSecond} />
          </button>

          <div className="flex-1 flex items-center px-4 py-2.5 rounded-3xl" style={{ background: C.muted }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(inputText)}
              placeholder={t("chat.placeholder")}
              className="flex-1 bg-transparent outline-none"
              style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary }}
            />
          </div>

          <button
            aria-label="Voice input"
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
            style={{ background: C.muted, border: `1px solid ${C.border}` }}
          >
            <Mic size={20} color={C.textSecond} />
          </button>

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
