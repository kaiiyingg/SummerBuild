import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  ScanLine,
  MessageCircle,
  Search,
  FileText,
  AlertTriangle,
  ChevronRight,
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

function getFallbackMedications(t: (key: string) => string) {
  return [
    {
      id: 1,
      name: "Metformin 500mg",
      for: t("meds.metformin_for"),
      how: t("meds.metformin_how"),
      caution: t("meds.metformin_caution"),
      status: "ready" as MedStatus,
    },
    {
      id: 2,
      name: "Lisinopril 10mg",
      for: t("meds.lisinopril_for"),
      how: t("meds.lisinopril_how"),
      caution: t("meds.lisinopril_caution"),
      status: "packing" as MedStatus,
    },
    {
      id: 3,
      name: "Atorvastatin 20mg",
      for: t("meds.atorvastatin_for"),
      how: t("meds.atorvastatin_how"),
      caution: t("meds.atorvastatin_caution"),
      status: "delayed" as MedStatus,
    },
    {
      id: 4,
      name: "Aspirin 100mg",
      for: t("meds.aspirin_for"),
      how: t("meds.aspirin_how"),
      caution: null,
      status: "ready" as MedStatus,
    },
  ];
}

const STATUS_BORDER: Record<MedStatus, string> = {
  ready: C.teal,
  packing: C.teal,
  delayed: C.amber,
};

function MedCard({
  med,
  isSpeaking,
  onSpeakCard,
}: {
  med: typeof fallbackMedications[number] & { verified?: boolean };
  isSpeaking: boolean;
  onSpeakCard: () => void;
}) {
  const { t } = useTranslation();
  const borderColor = STATUS_BORDER[med.status];

  return (
    <div
      className="rounded-xl bg-white overflow-hidden"
      style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: C.textPrimary }}>
            {med.name}
          </h3>
          <button
            type="button"
            onClick={onSpeakCard}
            className="h-9 w-9 rounded-full flex items-center justify-center transition-all hover:opacity-90 shrink-0"
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
        <p className="mb-3" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px" }}>
          <span style={{ color: C.textPrimary, fontWeight: 600 }}>{t("medications.for")}: </span>
          <span style={{ color: C.teal }}>{med.for}</span>
        </p>
        <div className="rounded-lg p-3" style={{ background: C.muted }}>
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary, lineHeight: "1.65" }}>
            <span style={{ fontWeight: 600 }}>{t("medications.howToTake")}: </span>
            {med.how}
          </p>
        </div>

        {med.caution && (
          <div className="mt-3 flex items-start gap-3 p-4 rounded-xl" style={{ background: C.amberLight, border: `1.5px solid ${C.amber}55` }}>
            <AlertTriangle size={19} color={C.amber} className="shrink-0 mt-0.5" />
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.amberText, lineHeight: "1.65", fontWeight: 600 }}>
              {med.caution}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MedicationsScreen({
  onTabChange,
}: {
  onTabChange: (tab: string) => void;
}) {
  const { t, language } = useTranslation();
  const medications = getFallbackMedications(t);
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
          language,
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

  async function speakMedicationCard(med: typeof fallbackMedications[number]) {
    if (activeSpeechMedId === med.id) {
      stopSpeaking();
      return;
    }

    stopSpeaking(false);
    setAudioError("");
    setActiveSpeechMedId(med.id);

    try {
      const text = med.caution
        ? `${med.name}. ${med.how}. Caution: ${med.caution}`
        : `${med.name}. ${med.how}`;
      const audioUrl = await fetchSpeechAudioUrl(`medication-card:${med.id}:${text}`, text);
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
            onSpeakCard={() => void speakMedicationCard(med)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <div
          className="w-full rounded-2xl p-5 text-left"
          style={{
            background: "white",
            border: `2px solid ${C.teal}55`,
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.tealLight }}>
              <ScanLine size={23} color={C.teal} />
            </div>
            <div className="flex-1">
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary, marginBottom: "8px" }}>
                {t("medications.scanTitle")}
              </p>
              <div className="space-y-2">
                {[
                  { icon: <Search size={14} color={C.teal} />, text: t("medications.scanFeature1") },
                  { icon: <FileText size={14} color={C.teal} />, text: t("medications.scanFeature2") },
                  { icon: <Volume2 size={14} color={C.teal} />, text: t("medications.scanFeature3") },
                ].map((feature) => (
                  <div key={feature.text} className="flex items-start gap-2.5">
                    {feature.icon}
                    <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.textSecond, lineHeight: "1.55" }}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onTabChange("scan")}
                className="mt-5 w-full flex items-center justify-between rounded-xl px-4 py-3 hover:opacity-95 transition-opacity"
                style={{ background: C.teal, border: `1px solid ${C.tealDark}` }}
              >
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "white" }}>
                  {t("medications.goToScan")}
                </span>
                <ChevronRight size={19} color="white" />
              </button>
            </div>
          </div>
        </div>

        <div
          className="w-full rounded-2xl p-5 text-left bg-white"
          style={{
            border: `2px solid ${C.teal}55`,
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.tealLight }}>
              <MessageCircle size={23} color={C.teal} />
            </div>
            <div className="flex-1">
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary, marginBottom: "8px" }}>
                {t("chat.title")}
              </p>
              <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.textSecond, lineHeight: "1.6" }}>
                {t("medications.chatDesc")}
              </p>
              <button
                onClick={() => onTabChange("askpilly")}
                className="mt-5 w-full flex items-center justify-between rounded-xl px-4 py-3 hover:opacity-95 transition-opacity"
                style={{ background: C.teal, border: `1px solid ${C.tealDark}` }}
              >
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "white" }}>
                  {t("medications.askAiHelper")}
                </span>
                <ChevronRight size={19} color="white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
