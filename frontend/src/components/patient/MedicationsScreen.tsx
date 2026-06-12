import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  Camera,
  MessageCircle,
  Search,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const SPEECH_API_URL = `${API_BASE_URL}/api/scan-medication-speech`;

const C = {
  teal: "#45C5BC",
  tealDark: "#38B2A9",
  tealLight: "#F0FDFA",
  bg: "#F8FAFC",
  muted: "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond: "#64748B",
  textDisabled: "#94A3B8",
  border: "#E2E8F0",
  amber: "#F59E0B",
  amberLight: "#FFFBEB",
  amberText: "#92400E",
  green: "#10B981",
  greenLight: "#ECFDF5",
  greenText: "#065F46",
  red: "#EF4444",
  redLight: "#FEF2F2",
  redText: "#991B1B",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  blueText: "#1D4ED8",
};

type MedStatus = "ready" | "packing" | "delayed";

const fallbackMedications = [
  {
    id: 1,
    name: "Metformin 500mg",
    for: "Type 2 Diabetes",
    how: "Take 1 tablet twice daily with meals. Do not skip doses.",
    caution: "May cause stomach upset if taken without food. Swallow whole — do not crush or chew.",
    status: "ready" as MedStatus,
  },
  {
    id: 2,
    name: "Lisinopril 10mg",
    for: "High Blood Pressure",
    how: "Take 1 tablet once daily in the morning. Monitor blood pressure regularly.",
    caution: "Do not stop taking without consulting your doctor, even if you feel well.",
    status: "packing" as MedStatus,
  },
  {
    id: 3,
    name: "Atorvastatin 20mg",
    for: "High Cholesterol",
    how: "Take 1 tablet once daily at bedtime. Avoid grapefruit juice.",
    caution: "Avoid grapefruit juice. Report any unexplained muscle pain or weakness to your doctor.",
    status: "delayed" as MedStatus,
  },
  {
    id: 4,
    name: "Aspirin 100mg",
    for: "Heart Disease Prevention",
    how: "Take 1 tablet once daily after breakfast with a full glass of water.",
    caution: null,
    status: "ready" as MedStatus,
  },
];

const STATUS_BORDER: Record<MedStatus, string> = {
  ready: C.teal,
  packing: C.teal,
  delayed: C.amber,
};

function MedCard({
  med,
  isSpeaking,
  onSpeakHowToTake,
}: {
  med: typeof fallbackMedications[number] & { verified?: boolean };
  isSpeaking: boolean;
  onSpeakHowToTake: () => void;
}) {
  const { t } = useTranslation();
  const [showCaution, setShowCaution] = useState(false);
  const borderColor = STATUS_BORDER[med.status];

  return (
    <div
      className="rounded-xl bg-white overflow-hidden"
      style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="p-4">
        <h3 className="mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: C.textPrimary }}>
          {med.name}
        </h3>
        <p className="mb-3" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px" }}>
          <span style={{ color: C.textPrimary, fontWeight: 600 }}>{t("medications.for")}: </span>
          <span style={{ color: C.teal }}>{med.for}</span>
        </p>
        <div className="rounded-lg p-3 relative" style={{ background: C.muted }}>
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary, paddingRight: "56px", lineHeight: "1.65" }}>
            <span style={{ fontWeight: 600 }}>{t("medications.howToTake")}: </span>
            {med.how}
          </p>
          <button
            type="button"
            onClick={onSpeakHowToTake}
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full flex items-center justify-center transition-all hover:opacity-90"
            aria-label={isSpeaking ? t("medications.scanStopReading") : t("medications.textToSpeech")}
            title={isSpeaking ? t("medications.scanStopReading") : t("medications.textToSpeech")}
            style={{
              background: isSpeaking ? C.teal : "white",
              border: `1px solid ${isSpeaking ? C.teal : C.border}`,
              boxShadow: isSpeaking ? "0 8px 20px rgba(69,197,188,0.2)" : "none",
            }}
          >
            <Volume2 size={18} color={isSpeaking ? "white" : C.textSecond} />
          </button>
        </div>

        {med.caution && showCaution && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg" style={{ background: C.amberLight, border: `1px solid ${C.amber}40` }}>
            <AlertTriangle size={15} color={C.amber} className="shrink-0 mt-0.5" />
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.amberText, lineHeight: "1.55" }}>
              {med.caution}
            </p>
          </div>
        )}
      </div>

      {med.caution && (
        <button
          onClick={() => setShowCaution(!showCaution)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 hover:opacity-70 transition-opacity"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textSecond }}>
            {showCaution ? t("medications.hideCaution") : t("medications.showCaution")}
          </span>
          {showCaution ? (
            <ChevronUp size={14} color={C.textSecond} />
          ) : (
            <ChevronDown size={14} color={C.textSecond} />
          )}
        </button>
      )}
    </div>
  );
}

export function MedicationsScreen({
  onTabChange,
}: {
  onTabChange: (tab: string) => void;
}) {
  const { t } = useTranslation();
  const [medications] = useState(fallbackMedications);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef<AbortController | null>(null);
  const speechCacheRef = useRef<Map<string, string>>(new Map());
  const [activeSpeechMedId, setActiveSpeechMedId] = useState<number | null>(null);
  const [audioError, setAudioError] = useState("");

  useEffect(() => {
    return () => {
      stopSpeaking(false);
      clearSpeechCache();
    };
  }, []);

  function clearSpeechCache() {
    for (const objectUrl of speechCacheRef.current.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    speechCacheRef.current.clear();
  }

  function stopSpeaking(clearActive = true) {
    if (speechRequestRef.current) {
      speechRequestRef.current.abort();
      speechRequestRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (clearActive) {
      setActiveSpeechMedId(null);
    }
  }

  async function fetchSpeechAudioUrl(cacheKey: string, text: string) {
    const cachedUrl = speechCacheRef.current.get(cacheKey);
    if (cachedUrl) {
      return cachedUrl;
    }

    const controller = new AbortController();
    speechRequestRef.current = controller;

    try {
      const response = await fetch(SPEECH_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          language: "en",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errorData = await response.json();
          detail = errorData.detail || "";
        } catch {
          // Fall back to the translated message below.
        }
        throw new Error(detail || t("medications.scanAudioError"));
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      speechCacheRef.current.set(cacheKey, objectUrl);
      return objectUrl;
    } finally {
      if (speechRequestRef.current === controller) {
        speechRequestRef.current = null;
      }
    }
  }

  async function speakHowToTake(med: typeof fallbackMedications[number]) {
    if (activeSpeechMedId === med.id) {
      stopSpeaking();
      return;
    }

    stopSpeaking(false);
    setAudioError("");
    setActiveSpeechMedId(med.id);

    try {
      const text = `${med.name}. ${med.how}`;
      const audioUrl = await fetchSpeechAudioUrl(`medication-how:${med.id}:${text}`, text);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setActiveSpeechMedId(null);
        }
      };

      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setActiveSpeechMedId(null);
          setAudioError(t("medications.scanAudioError"));
        }
      };

      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setActiveSpeechMedId(null);
      setAudioError(error instanceof Error ? error.message : t("medications.scanAudioError"));
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-y-auto h-full pb-6 max-w-4xl mx-auto w-full">
      <div>
        <div>
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond }}>
            {t("medications.todaysPrescription")}
          </p>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "24px", fontWeight: 700, color: C.textPrimary }}>
            {medications.length} {t("medications.medicationsCount")}
          </h1>
        </div>
      </div>

      {audioError && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: C.redLight, border: `1px solid ${C.red}40` }}
        >
          <AlertTriangle size={18} color={C.red} className="shrink-0 mt-0.5" />
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: C.redText }}>
              {t("common.error")}
            </p>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.redText, marginTop: "4px" }}>
              {audioError}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {medications.map((med) => (
          <MedCard
            key={med.id}
            med={med}
            isSpeaking={activeSpeechMedId === med.id}
            onSpeakHowToTake={() => void speakHowToTake(med)}
          />
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        <button
          onClick={() => onTabChange("scan")}
          className="w-full text-left hover:opacity-90 transition-opacity"
          style={{ background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)` }}
        >
          <div className="flex items-start gap-4 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Camera size={20} color="white" />
            </div>
            <div className="flex-1">
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "white", marginBottom: "6px" }}>
                {t("medications.scanTitle")}
              </p>
              <div className="space-y-1.5">
                {[
                  { icon: <Search size={12} color="rgba(255,255,255,0.9)" />, text: t("medications.scanFeature1") },
                  { icon: <FileText size={12} color="rgba(255,255,255,0.9)" />, text: t("medications.scanFeature2") },
                  { icon: <Volume2 size={12} color="rgba(255,255,255,0.9)" />, text: t("medications.scanFeature3") },
                ].map((feature) => (
                  <div key={feature.text} className="flex items-center gap-2">
                    {feature.icon}
                    <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.9)" }}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "18px", alignSelf: "center" }}>›</span>
          </div>
        </button>

        <div style={{ height: "1px", background: C.border }} />

        <button
          onClick={() => onTabChange("askpilly")}
          className="w-full text-left bg-white hover:bg-[#F8FAFC] transition-colors"
        >
          <div className="flex items-start gap-4 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.tealLight }}>
              <MessageCircle size={20} color={C.teal} />
            </div>
            <div className="flex-1">
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: C.textPrimary, marginBottom: "4px" }}>
                {t("chat.title")}
              </p>
              <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textSecond, lineHeight: "1.6" }}>
                {t("medications.chatDesc")}
              </p>
            </div>
            <span style={{ color: C.textDisabled, fontSize: "18px", alignSelf: "center" }}>›</span>
          </div>
        </button>
      </div>
    </div>
  );
}
