import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  FileText,
  Search,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";

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
  red: "#EF4444",
  amber: "#F59E0B",
  amberLight: "#FFFBEB",
  amberText: "#92400E",
  slate: "#0F172A",
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SPEECH_API_URL = `${API_BASE_URL}/api/scan-medication-speech`;

type ScanResult = {
  packaging_type: string;
  medication_name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  quantity: string;
  refills: string;
  directions_original: string;
  directions_translated: string;
  warnings_original: string[];
  warnings_translated: string[];
  summary_original: string;
  summary_translated: string;
  medication_overview_translated: string;
  how_to_take_points_translated: string[];
  side_effects_translated: string[];
  precautions_translated: string[];
  storage_translated: string[];
  detected_language: string;
  target_language: string;
  confidence: number;
  needs_review: boolean;
  review_reason: string;
  detected_text_lines: string[];
  text_for_speech: string;
};

type SpeechSection =
  | "results"
  | "label"
  | "overview"
  | "how"
  | "effects"
  | "precautions"
  | "storage"
  | "all"
  | null;

function formatPackagingType(type: string, t: (key: string) => string) {
  switch (type) {
    case "bottle":
      return t("medications.scanPackagingBottle");
    case "box":
      return t("medications.scanPackagingBox");
    case "blister_pack":
      return t("medications.scanPackagingBlister");
    case "pharmacy_label":
      return t("medications.scanPackagingPharmacyLabel");
    case "warning_sticker":
      return t("medications.scanPackagingWarningSticker");
    case "packet":
      return t("medications.scanPackagingPacket");
    default:
      return t("medications.scanPackagingDefault");
  }
}

function SpeakerBadge({ active }: { active: boolean }) {
  return (
    <div
      className="relative flex h-12 w-12 items-center justify-center rounded-full"
      style={{
        background: active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.16)",
        animation: active ? "scanSpeakerPulse 1.6s ease-in-out infinite" : undefined,
      }}
    >
      {active && (
        <>
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid rgba(255,255,255,0.45)",
              animation: "scanSpeakerRing 1.8s ease-out infinite",
            }}
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid rgba(255,255,255,0.30)",
              animation: "scanSpeakerRing 1.8s ease-out 0.45s infinite",
            }}
          />
        </>
      )}
      <Volume2 size={20} color="white" className="relative z-[1]" />
    </div>
  );
}

function ReadingBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="w-1.5 rounded-full"
          style={{
            height: active ? "18px" : "8px",
            background: "rgba(255,255,255,0.92)",
            transformOrigin: "bottom center",
            animation: active ? `scanReadingBars 0.9s ease-in-out ${index * 0.14}s infinite` : undefined,
            opacity: active ? 1 : 0.7,
          }}
        />
      ))}
    </div>
  );
}

function SectionSpeakerButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all hover:opacity-90"
      style={{
        background: active ? C.teal : C.tealLight,
        boxShadow: active ? "0 8px 20px rgba(69,197,188,0.22)" : "none",
      }}
    >
      {active && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: "1px solid rgba(69,197,188,0.38)",
            animation: "scanHeaderRing 1.5s ease-out infinite",
          }}
        />
      )}
      <Volume2 size={18} color={active ? "white" : C.tealDark} className="relative z-[1]" />
    </button>
  );
}

function SectionHeader({
  title,
  active,
  label,
  onSpeak,
}: {
  title: string;
  active: boolean;
  label: string;
  onSpeak: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
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
        {title}
      </p>
      <SectionSpeakerButton active={active} label={label} onClick={onSpeak} />
    </div>
  );
}

function ResultList({
  items,
  emptyText,
}: {
  items: string[];
  emptyText: string;
}) {
  if (!items.length) {
    return (
      <p
        style={{
          fontFamily: "'Open Sans', sans-serif",
          fontSize: "14px",
          color: C.textSecond,
          lineHeight: "1.6",
          marginTop: "8px",
        }}
      >
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2">
          <span
            className="mt-[8px] h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: C.teal }}
            aria-hidden="true"
          />
          <p
            style={{
              fontFamily: "'Open Sans', sans-serif",
              fontSize: "14px",
              color: C.textPrimary,
              lineHeight: "1.6",
            }}
          >
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ScanScreen() {
  const { language, t, getLanguageLabel } = useTranslation();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef<AbortController | null>(null);
  const speechCacheRef = useRef<Map<string, string>>(new Map());
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [activeSpeechSection, setActiveSpeechSection] = useState<SpeechSection>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  const features = [
    { icon: <Search size={20} color={C.teal} />, title: t("medications.featureIdentifyTitle"), desc: t("medications.featureIdentifyDesc") },
    { icon: <FileText size={20} color={C.teal} />, title: t("medications.featureTranslateTitle"), desc: t("medications.featureTranslateDesc") },
    { icon: <Volume2 size={20} color={C.teal} />, title: t("medications.featureTtsTitle"), desc: t("medications.featureTtsDesc") },
  ];

  const previewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : ""),
    [selectedImage]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      stopSpeaking(false);
      clearSpeechCache();
      stopCameraStream(cameraStream);
    };
  }, [cameraStream]);

  const scanLanguageLabel = getLanguageLabel(language);
  const canRetranslate = Boolean(selectedImage && scanResult && scanResult.target_language !== language);
  const medicationHeading =
    [scanResult?.medication_name, scanResult?.strength].filter(Boolean).join(" ").trim() ||
    t("medications.scanResultsTitle");
  const labelMeaningText = scanResult?.summary_translated || scanResult?.summary_original || "";
  const overviewText = scanResult?.medication_overview_translated || "";
  const howToTakeItems = scanResult?.how_to_take_points_translated.length
    ? scanResult.how_to_take_points_translated
    : scanResult?.directions_translated
      ? [scanResult.directions_translated]
      : [];
  const sideEffectsItems = scanResult?.side_effects_translated ?? [];
  const precautionItems = scanResult?.precautions_translated.length
    ? scanResult.precautions_translated
    : scanResult?.warnings_translated ?? [];
  const storageItems = scanResult?.storage_translated ?? [];

  function stopCameraStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
  }

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
      setActiveSpeechSection(null);
    }
  }

  function closeCamera() {
    stopCameraStream(cameraStream);
    setCameraStream(null);
    setCameraError("");
    setCameraOpen(false);
  }

  async function openLiveCamera() {
    setScanError("");
    setCameraError("");
    setCameraOpen(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraOpen(false);
      cameraInputRef.current?.click();
      return;
    }

    try {
      stopCameraStream(cameraStream);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setCameraStream(stream);
    } catch {
      setCameraError(t("medications.scanCameraError"));
    }
  }

  async function captureCameraPhoto() {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError(t("medications.scanCameraNotReady"));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError(t("medications.scanCameraError"));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError(t("medications.scanCameraError"));
      return;
    }

    const file = new File(
      [blob],
      `medication-label-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
      { type: "image/jpeg" }
    );

    closeCamera();
    await runScan(file);
  }

  async function fetchSpeechAudioUrl(
    section: Exclude<SpeechSection, null>,
    text: string,
  ) {
    const speechLanguage = scanResult?.target_language ?? language;
    const cacheKey = `${speechLanguage}:${section}:${text}`;
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
          language: speechLanguage,
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

  async function speakText(section: Exclude<SpeechSection, null>, text: string) {
    if (!text.trim()) {
      return;
    }

    if (activeSpeechSection === section) {
      stopSpeaking();
      return;
    }

    stopSpeaking(false);
    setScanError("");
    setActiveSpeechSection(section);

    try {
      const audioUrl = await fetchSpeechAudioUrl(section, text.trim());
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setActiveSpeechSection(null);
        }
      };

      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setActiveSpeechSection(null);
          setScanError(t("medications.scanAudioError"));
        }
      };

      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setActiveSpeechSection(null);
      setScanError(error instanceof Error ? error.message : t("medications.scanAudioError"));
    }
  }

  const runScan = async (file: File) => {
    setSelectedImage(file);
    setScanResult(null);
    setScanError("");
    stopSpeaking();
    clearSpeechCache();
    setIsScanning(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("language", language);

    try {
      const response = await fetch(`${API_BASE_URL}/api/scan-medication-label`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errorData = await response.json();
          detail = errorData.detail || "";
        } catch {
          // Fall back to the status message below.
        }
        throw new Error(detail || t("medications.scanGenericError"));
      }

      const data = (await response.json()) as ScanResult;
      setScanResult(data);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : t("medications.scanGenericError"));
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setScanError(t("medications.scanUnsupportedFile"));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setScanError(t("medications.scanFileTooLarge"));
      return;
    }

    await runScan(file);
  };

  const rescanSelectedImage = async () => {
    if (!selectedImage) return;
    await runScan(selectedImage);
  };

  const handleTopAction = () => {
    if (canRetranslate) {
      void rescanSelectedImage();
      return;
    }
    uploadInputRef.current?.click();
  };

  const resultsReadText = scanResult
    ? [
        t("medications.scanResultsTitle"),
        medicationHeading,
        formatPackagingType(scanResult.packaging_type, t),
        scanResult.dosage_form ? `${t("medications.scanDosageForm")}: ${scanResult.dosage_form}.` : "",
        scanResult.quantity ? `${t("medications.scanQuantity")}: ${scanResult.quantity}.` : "",
        scanResult.refills ? `${t("medications.scanRefills")}: ${scanResult.refills}.` : "",
        scanResult.needs_review ? (scanResult.review_reason || t("medications.scanReviewFallback")) : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const labelReadText = scanResult
    ? [t("medications.scanLabelMeaning"), labelMeaningText || t("medications.scanNoLabelMeaning")]
        .filter(Boolean)
        .join(". ")
    : "";

  const overviewReadText = scanResult
    ? [t("medications.scanOverview"), overviewText || t("medications.scanNoOverview")]
        .filter(Boolean)
        .join(". ")
    : "";

  const howToTakeReadText = scanResult
    ? [t("medications.howToTake"), howToTakeItems.length ? howToTakeItems.join(" ") : t("medications.scanNoHowToTake")]
        .filter(Boolean)
        .join(". ")
    : "";

  const sideEffectsReadText = scanResult
    ? [t("medications.scanSideEffects"), sideEffectsItems.length ? sideEffectsItems.join(" ") : t("medications.scanNoSideEffects")]
        .filter(Boolean)
        .join(". ")
    : "";

  const precautionsReadText = scanResult
    ? [t("medications.scanPrecautions"), precautionItems.length ? precautionItems.join(" ") : t("medications.scanNoPrecautions")]
        .filter(Boolean)
        .join(". ")
    : "";

  const storageReadText = scanResult
    ? [t("medications.scanStorage"), storageItems.length ? storageItems.join(" ") : t("medications.scanNoStorage")]
        .filter(Boolean)
        .join(". ")
    : "";

  const readAllText = [
    resultsReadText,
    labelReadText,
    overviewReadText,
    howToTakeReadText,
    sideEffectsReadText,
    precautionsReadText,
    storageReadText,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-y-auto h-full pb-6 max-w-2xl mx-auto w-full">
      <style>{`
        @keyframes scanSpeakerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes scanSpeakerRing {
          0% { opacity: 0.55; transform: scale(0.78); }
          70%, 100% { opacity: 0; transform: scale(1.38); }
        }
        @keyframes scanHeaderRing {
          0% { opacity: 0.45; transform: scale(0.88); }
          100% { opacity: 0; transform: scale(1.32); }
        }
        @keyframes scanReadingBars {
          0%, 100% { transform: scaleY(0.45); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: C.textPrimary }}>
        {t("medications.scanTitle")}
      </h1>

      <div
        className="bg-white rounded-2xl p-6 flex flex-col items-center text-center"
        style={{ border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
      >
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.tealLight }}>
          <Camera size={36} color={C.teal} />
        </div>
        <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary, marginBottom: "8px" }}>
          {t("medications.scanTitle")}
        </h2>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond, marginBottom: "24px", lineHeight: "1.7" }}>
          {t("medications.tapToScan")}
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => void openLiveCamera()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-90 transition-opacity"
            style={{
              background: C.muted,
              border: `1.5px solid ${C.border}`,
              color: C.textPrimary,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            <Camera size={18} color={C.textSecond} />
            {t("medications.openCamera")}
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void handleFileSelected(event)}
          />

          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-90 transition-opacity"
            style={{
              background: C.muted,
              border: `1.5px solid ${C.border}`,
              color: C.textPrimary,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            <Upload size={18} color={C.textSecond} />
            {t("medications.uploadPhoto")}
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleFileSelected(event)}
          />
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
                  {t("medications.scanCameraLiveTitle")}
                </p>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: C.textPrimary, marginTop: "6px" }}>
                  {t("medications.openCamera")}
                </h3>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, lineHeight: "1.7", marginTop: "6px" }}>
                  {t("medications.scanCameraLiveDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                aria-label={t("medications.scanCloseCamera")}
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: C.muted, border: `1px solid ${C.border}` }}
              >
                <X size={18} color={C.textPrimary} />
              </button>
            </div>

            {cameraError ? (
              <div
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
              >
                <AlertTriangle size={18} color={C.red} className="shrink-0 mt-0.5" />
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: "#991B1B", lineHeight: "1.6" }}>
                  {cameraError}
                </p>
              </div>
            ) : null}

            <div
              className="overflow-hidden rounded-[24px]"
              style={{ background: cameraStream ? "#0F172A" : C.muted, border: `1px solid ${C.border}` }}
            >
              {cameraStream ? (
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="block h-[360px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[360px] items-center justify-center px-8 text-center">
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond }}>
                    {cameraError ? t("medications.scanUseUploadInstead") : t("medications.scanCameraStarting")}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cameraError ? () => {
                  closeCamera();
                  uploadInputRef.current?.click();
                } : closeCamera}
                className="flex-1 rounded-xl py-3 transition-opacity hover:opacity-90"
                style={{
                  background: C.muted,
                  border: `1px solid ${C.border}`,
                  color: C.textPrimary,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "15px",
                  fontWeight: 700,
                }}
              >
                {cameraError ? t("medications.scanUseUploadInstead") : t("medications.scanCloseCamera")}
              </button>
              <button
                type="button"
                onClick={() => void captureCameraPhoto()}
                disabled={!cameraStream || isScanning}
                className="flex-1 rounded-xl py-3 text-white transition-opacity disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "15px",
                  fontWeight: 700,
                }}
              >
                {t("medications.scanCapturePhoto")}
              </button>
            </div>
          </div>
        </div>
      )}

      {scanError && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <AlertTriangle size={18} color={C.red} className="shrink-0 mt-0.5" />
          <div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#991B1B" }}>
              {t("common.error")}
            </p>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: "#991B1B", marginTop: "4px" }}>
              {scanError}
            </p>
          </div>
        </div>
      )}

      {(selectedImage || isScanning || scanResult) && (
        <div
          className="bg-white rounded-2xl p-4 md:p-5 space-y-5"
          style={{ border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
        >
          {selectedImage && (
            <section className="space-y-4">
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
                    {t("medications.scanSelectedPhoto")}
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: C.textPrimary, marginTop: "4px" }}>
                    {selectedImage.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTopAction}
                  className="px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  style={{
                    background: C.muted,
                    border: `1px solid ${C.border}`,
                    color: C.textPrimary,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  {canRetranslate ? t("medications.scanRetranslate") : t("medications.scanRescan")}
                </button>
              </div>

              {previewUrl && (
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.bg }}>
                  <img
                    src={previewUrl}
                    alt="Medication label preview"
                    className="w-full h-auto max-h-[360px] object-contain bg-white"
                  />
                </div>
              )}
            </section>
          )}

          {isScanning && (
            <>
              {selectedImage && <div style={{ height: "1px", background: C.border }} />}
              <section className="py-4 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-[#C8F4F1] border-t-[#45C5BC] animate-spin" />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 700, color: C.textPrimary }}>
                  {t("medications.scanAnalyzingTitle")}
                </p>
                <p
                  style={{
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: "14px",
                    color: C.textSecond,
                    marginTop: "8px",
                    lineHeight: "1.7",
                    maxWidth: "620px",
                    marginInline: "auto",
                  }}
                >
                  {t("medications.scanAnalyzingDesc")}
                </p>
              </section>
            </>
          )}

          {scanResult && !isScanning && (
            <>
              {selectedImage && <div style={{ height: "1px", background: C.border }} />}
              <section className="space-y-5">
                <div>
                  <SectionHeader
                    title={t("medications.scanResultsTitle")}
                    active={activeSpeechSection === "results"}
                    label={activeSpeechSection === "results" ? t("medications.scanStopSectionAudio") : t("medications.scanReadResults")}
                    onSpeak={() => void speakText("results", resultsReadText)}
                  />
                  <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "24px", fontWeight: 700, color: C.textPrimary, marginTop: "6px" }}>
                    {medicationHeading}
                  </h2>
                  {scanResult.generic_name && scanResult.generic_name !== scanResult.medication_name && (
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginTop: "8px" }}>
                      {scanResult.generic_name}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <div className="px-3 py-1.5 rounded-full" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textPrimary }}>
                        {formatPackagingType(scanResult.packaging_type, t)}
                      </span>
                    </div>
                    {scanResult.dosage_form && (
                      <div className="px-3 py-1.5 rounded-full" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
                        <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textPrimary }}>
                          {t("medications.scanDosageForm")}: {scanResult.dosage_form}
                        </span>
                      </div>
                    )}
                    {scanResult.quantity && (
                      <div className="px-3 py-1.5 rounded-full" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
                        <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textPrimary }}>
                          {t("medications.scanQuantity")}: {scanResult.quantity}
                        </span>
                      </div>
                    )}
                    {scanResult.refills && (
                      <div className="px-3 py-1.5 rounded-full" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
                        <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textPrimary }}>
                          {t("medications.scanRefills")}: {scanResult.refills}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {scanResult.needs_review && (
                  <div className="rounded-2xl p-4" style={{ background: C.amberLight, border: `1px solid ${C.amber}40` }}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} color={C.amber} className="shrink-0 mt-0.5" />
                      <div>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: C.amberText }}>
                          {t("medications.scanReviewTitle")}
                        </p>
                        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.amberText, marginTop: "4px", lineHeight: "1.6" }}>
                          {scanResult.review_reason || t("medications.scanReviewFallback")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {canRetranslate && (
                  <div className="rounded-2xl p-4" style={{ background: C.tealLight, border: `1px solid ${C.border}` }}>
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textPrimary, lineHeight: "1.6" }}>
                      {t("medications.scanLanguageChanged")} {scanLanguageLabel}.
                    </p>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <SectionHeader
                      title={t("medications.scanLabelMeaning")}
                      active={activeSpeechSection === "label"}
                      label={activeSpeechSection === "label" ? t("medications.scanStopSectionAudio") : t("medications.scanReadLabelMeaning")}
                      onSpeak={() => void speakText("label", labelReadText)}
                    />
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary, lineHeight: "1.7", marginTop: "8px" }}>
                      {labelMeaningText || t("medications.scanNoLabelMeaning")}
                    </p>
                  </div>

                  <div>
                    <SectionHeader
                      title={t("medications.scanOverview")}
                      active={activeSpeechSection === "overview"}
                      label={activeSpeechSection === "overview" ? t("medications.scanStopSectionAudio") : t("medications.scanReadOverview")}
                      onSpeak={() => void speakText("overview", overviewReadText)}
                    />
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary, lineHeight: "1.7", marginTop: "8px" }}>
                      {overviewText || t("medications.scanNoOverview")}
                    </p>
                    {overviewText && (
                      <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textSecond, lineHeight: "1.6", marginTop: "8px" }}>
                        {t("medications.scanOverviewNote")}
                      </p>
                    )}
                  </div>

                  <div>
                    <SectionHeader
                      title={t("medications.howToTake")}
                      active={activeSpeechSection === "how"}
                      label={activeSpeechSection === "how" ? t("medications.scanStopSectionAudio") : t("medications.scanReadHowToTake")}
                      onSpeak={() => void speakText("how", howToTakeReadText)}
                    />
                    <ResultList items={howToTakeItems} emptyText={t("medications.scanNoHowToTake")} />
                  </div>

                  <div>
                    <SectionHeader
                      title={t("medications.scanSideEffects")}
                      active={activeSpeechSection === "effects"}
                      label={activeSpeechSection === "effects" ? t("medications.scanStopSectionAudio") : t("medications.scanReadSideEffects")}
                      onSpeak={() => void speakText("effects", sideEffectsReadText)}
                    />
                    <ResultList items={sideEffectsItems} emptyText={t("medications.scanNoSideEffects")} />
                  </div>

                  <div>
                    <SectionHeader
                      title={t("medications.scanPrecautions")}
                      active={activeSpeechSection === "precautions"}
                      label={activeSpeechSection === "precautions" ? t("medications.scanStopSectionAudio") : t("medications.scanReadPrecautions")}
                      onSpeak={() => void speakText("precautions", precautionsReadText)}
                    />
                    <ResultList items={precautionItems} emptyText={t("medications.scanNoPrecautions")} />
                  </div>

                  <div>
                    <SectionHeader
                      title={t("medications.scanStorage")}
                      active={activeSpeechSection === "storage"}
                      label={activeSpeechSection === "storage" ? t("medications.scanStopSectionAudio") : t("medications.scanReadStorage")}
                      onSpeak={() => void speakText("storage", storageReadText)}
                    />
                    <ResultList items={storageItems} emptyText={t("medications.scanNoStorage")} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void speakText("all", readAllText)}
                  className="w-full rounded-2xl px-4 py-4 transition-all"
                  style={{
                    background: activeSpeechSection === "all"
                      ? "linear-gradient(135deg, #38B2A9 0%, #2C9E95 100%)"
                      : "linear-gradient(135deg, #45C5BC 0%, #38B2A9 100%)",
                    boxShadow: activeSpeechSection === "all"
                      ? "0 12px 30px rgba(56,178,169,0.22)"
                      : "0 10px 24px rgba(69,197,188,0.16)",
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <SpeakerBadge active={activeSpeechSection === "all"} />
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "white" }}>
                        {activeSpeechSection === "all" ? t("medications.scanStopReading") : t("medications.scanReadAllInstructions")}
                      </p>
                    </div>
                    <ReadingBars active={activeSpeechSection === "all"} />
                  </div>
                </button>
              </section>
            </>
          )}
        </div>
      )}

      <div>
        <p
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: "12px",
            fontWeight: 700,
            color: C.textDisabled,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}
        >
          {t("medications.whatYouCanDo")}
        </p>
        <div className="space-y-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-4 p-4 rounded-xl bg-white"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.tealLight }}>
                {feature.icon}
              </div>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, color: C.textPrimary }}>
                  {feature.title}
                </p>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginTop: "2px", lineHeight: "1.6" }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Camera size={15} color={C.textSecond} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: C.textPrimary }}>
              {t("medications.tipsCameraTitle")}
            </p>
          </div>
          {[
            t("medications.tipCamera1"),
            t("medications.tipCamera2"),
            t("medications.tipCamera3"),
            t("medications.tipCamera4"),
          ].map((tip) => (
            <p key={tip} style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginBottom: "4px", lineHeight: "1.6" }}>
              · {tip}
            </p>
          ))}
        </div>

        <div className="p-4 rounded-xl" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Upload size={15} color={C.textSecond} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: C.textPrimary }}>
              {t("medications.tipsUploadTitle")}
            </p>
          </div>
          {[
            t("medications.tipUpload1"),
            t("medications.tipUpload2"),
            t("medications.tipUpload3"),
            t("medications.tipUpload4"),
          ].map((tip) => (
            <p key={tip} style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginBottom: "4px", lineHeight: "1.6" }}>
              · {tip}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
