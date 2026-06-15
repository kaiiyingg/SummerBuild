import { useMemo, useState } from "react";
import { Check, ChevronDown, Clock, X } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";

const C = {
  teal: "#45C5BC",
  tealLight: "#F0FDFA",
  muted: "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond: "#64748B",
  textDisabled: "#94A3B8",
  border: "#E2E8F0",
};

const ALL_HOURS = [
  { hour: "6:00", period: "AM" },
  { hour: "6:30", period: "AM" },
  { hour: "7:00", period: "AM" },
  { hour: "7:30", period: "AM" },
  { hour: "8:00", period: "AM" },
  { hour: "8:30", period: "AM" },
  { hour: "9:00", period: "AM" },
  { hour: "9:30", period: "AM" },
  { hour: "10:00", period: "AM" },
  { hour: "10:30", period: "AM" },
  { hour: "11:00", period: "AM" },
  { hour: "11:30", period: "AM" },
  { hour: "12:00", period: "PM" },
  { hour: "12:30", period: "PM" },
  { hour: "1:00", period: "PM" },
  { hour: "1:30", period: "PM" },
  { hour: "2:00", period: "PM" },
  { hour: "2:30", period: "PM" },
  { hour: "3:00", period: "PM" },
  { hour: "3:30", period: "PM" },
  { hour: "4:00", period: "PM" },
  { hour: "4:30", period: "PM" },
  { hour: "5:00", period: "PM" },
  { hour: "5:30", period: "PM" },
  { hour: "6:00", period: "PM" },
  { hour: "6:30", period: "PM" },
  { hour: "7:00", period: "PM" },
  { hour: "7:30", period: "PM" },
  { hour: "8:00", period: "PM" },
  { hour: "8:30", period: "PM" },
  { hour: "9:00", period: "PM" },
  { hour: "9:30", period: "PM" },
  { hour: "10:00", period: "PM" },
  { hour: "10:30", period: "PM" },
];

const RECOMMENDATION_OVERRIDES = {
  "aspirin 100mg": {
    freq: "Once daily",
    times: [{ hour: "8:00", period: "AM", label: "After breakfast" }],
  },
  "atorvastatin 20mg": {
    freq: "Once daily",
    times: [{ hour: "10:00", period: "PM", label: "Bedtime" }],
  },
  "bisoprolol 2.5mg": {
    freq: "Once daily",
    times: [{ hour: "8:00", period: "AM", label: "Morning" }],
  },
  "clopidogrel 75mg": {
    freq: "Once daily",
    times: [{ hour: "8:00", period: "AM", label: "Morning" }],
  },
  "famotidine 20mg": {
    freq: "Once daily",
    times: [{ hour: "8:00", period: "PM", label: "Evening" }],
  },
  "furosemide 40mg": {
    freq: "Once daily",
    times: [{ hour: "9:00", period: "AM", label: "Morning" }],
  },
  "lisinopril 10mg": {
    freq: "Once daily",
    times: [{ hour: "9:00", period: "AM", label: "Morning" }],
  },
  "metformin 500mg": {
    freq: "Twice daily",
    times: [
      { hour: "8:00", period: "AM", label: "With breakfast" },
      { hour: "8:00", period: "PM", label: "With dinner" },
    ],
  },
  "potassium chloride": {
    freq: "Once daily",
    times: [{ hour: "8:00", period: "AM", label: "With food" }],
  },
};

function normalizeMedicationKey(name) {
  return String(name || "").trim().toLowerCase();
}

function createRecommendation(freq, times) {
  return { freq, times };
}

function getMedicationRecommendation(medication) {
  const name = medication?.name ?? "";
  const key = normalizeMedicationKey(name);
  const instructions = String(medication?.instructions || "").toLowerCase();

  if (RECOMMENDATION_OVERRIDES[key]) {
    return RECOMMENDATION_OVERRIDES[key];
  }

  if (instructions.includes("three times daily")) {
    return createRecommendation("Three times daily", [
      { hour: "8:00", period: "AM", label: "With breakfast" },
      { hour: "1:00", period: "PM", label: "With lunch" },
      { hour: "8:00", period: "PM", label: "With dinner" },
    ]);
  }

  if (instructions.includes("twice daily") || instructions.includes("with meals")) {
    return createRecommendation("Twice daily", [
      { hour: "8:00", period: "AM", label: "With breakfast" },
      { hour: "8:00", period: "PM", label: "With dinner" },
    ]);
  }

  if (
    instructions.includes("bedtime") ||
    instructions.includes("before bedtime") ||
    instructions.includes("in the evening")
  ) {
    return createRecommendation("Once daily", [
      { hour: "10:00", period: "PM", label: "Bedtime" },
    ]);
  }

  if (instructions.includes("before meals") || instructions.includes("before food")) {
    return createRecommendation("Once daily", [
      { hour: "7:30", period: "AM", label: "Before breakfast" },
    ]);
  }

  if (instructions.includes("after breakfast") || instructions.includes("with food")) {
    return createRecommendation("Once daily", [
      { hour: "8:00", period: "AM", label: "After breakfast" },
    ]);
  }

  if (
    instructions.includes("morning") ||
    instructions.includes("pass urine more often") ||
    key.includes("furosemide")
  ) {
    return createRecommendation("Once daily", [
      { hour: "9:00", period: "AM", label: "Morning" },
    ]);
  }

  return createRecommendation("Once daily", [
    { hour: "8:00", period: "AM", label: "Morning" },
  ]);
}

function getMedicationSummary(medication, recommendation) {
  const purpose = String(medication?.purpose || "").trim();
  if (purpose) {
    return `${purpose} - ${recommendation.freq}`;
  }

  const quantity = Number(medication?.quantity);
  if (Number.isFinite(quantity) && quantity > 0) {
    return `Pack ${quantity} - ${recommendation.freq}`;
  }

  return recommendation.freq;
}

export default function ReminderComposerSheet({
  patientName,
  medications,
  onClose,
  onSubmit,
  submitLabel = "Send Reminder to Patient",
  submitting = false,
  errorMessage = "",
}) {
  const { t } = useTranslation();
  const medicationOptions = useMemo(
    () =>
      (medications ?? []).map((medication) => {
        const recommendation = getMedicationRecommendation(medication);
        return {
          ...medication,
          recommendation,
          summary: getMedicationSummary(medication, recommendation),
        };
      }),
    [medications]
  );

  const [selectedMed, setSelectedMed] = useState(medicationOptions[0]?.name ?? "");
  const [selectedHour, setSelectedHour] = useState(
    medicationOptions[0]?.recommendation?.times?.[0]?.hour ?? ""
  );
  const [selectedPeriod, setSelectedPeriod] = useState(
    medicationOptions[0]?.recommendation?.times?.[0]?.period ?? ""
  );
  const [showMedPicker, setShowMedPicker] = useState(false);

  const currentMedication =
    medicationOptions.find((medication) => medication.name === selectedMed) ??
    medicationOptions[0] ??
    null;
  const recommendation = currentMedication?.recommendation ?? null;
  const recommendedDoseIndex = recommendation
    ? recommendation.times.findIndex(
        (slot) => slot.hour === selectedHour && slot.period === selectedPeriod
      )
    : -1;
  const isRecommended = recommendedDoseIndex !== -1;

  const selectMedication = (name) => {
    const nextMedication = medicationOptions.find((medication) => medication.name === name);
    const nextSlot = nextMedication?.recommendation?.times?.[0];

    setSelectedMed(name);
    setShowMedPicker(false);
    setSelectedHour(nextSlot?.hour ?? "");
    setSelectedPeriod(nextSlot?.period ?? "");
  };

  const clearMedication = (event) => {
    event.stopPropagation();
    setSelectedMed("");
    setSelectedHour("");
    setSelectedPeriod("");
    setShowMedPicker(false);
  };

  const handleSubmit = async () => {
    if (!selectedMed || !selectedHour || !selectedPeriod || submitting) return;
    await onSubmit({ name: selectedMed, time: `${selectedHour} ${selectedPeriod}` });
  };

  return (
    <div className="scanner-modal-overlay" onClick={submitting ? undefined : onClose}>
      <div
        className="reminder-modal"
        style={{ width: "min(820px, 96vw)", padding: 0, borderTop: `4px solid ${C.teal}` }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-16 rounded-full" style={{ background: C.border }} />
        </div>

        <div
          className="flex items-start justify-between gap-4 px-6 py-5"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: C.textPrimary,
                marginBottom: "10px",
              }}
            >
              {t("medications.addReminder")}
            </h2>
            <p
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: "15px",
                color: C.textSecond,
                lineHeight: 1.6,
                margin: 0,
                maxWidth: "560px",
              }}
            >
              Save a medication reminder for {patientName}. It will be written to
              the patient's reminder list and shown on the patient reminders
              page right away.
            </p>
          </div>
          <button
            type="button"
            onClick={submitting ? undefined : onClose}
            className="scanner-close"
            style={{ position: "static", flexShrink: 0 }}
            aria-label="Close reminder composer"
          >
            X
          </button>
        </div>

        <div className="px-6 py-6" style={{ maxHeight: "80svh", overflowY: "auto" }}>
          <div className="space-y-6">
            <div>
              <p
                style={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: C.textDisabled,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                {t("medications.medication")}
              </p>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMedPicker((open) => !open)}
                    className="flex-1 flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl"
                    style={{
                      border: `1.5px solid ${selectedMed ? C.teal : C.border}`,
                      background: selectedMed ? C.tealLight : "white",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Open Sans', sans-serif",
                        fontSize: "16px",
                        color: selectedMed ? C.textPrimary : C.textDisabled,
                      }}
                    >
                      {selectedMed || t("medications.selectMedication")}
                    </span>
                    <ChevronDown size={17} color={C.textSecond} />
                  </button>
                  {selectedMed && (
                    <button
                      type="button"
                      onClick={clearMedication}
                      className="shrink-0 p-2 rounded-full hover:opacity-70 transition-opacity"
                      style={{ background: C.textDisabled }}
                      aria-label="Clear selected medication"
                    >
                      <X size={12} color="white" />
                    </button>
                  )}
                </div>

                {showMedPicker && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl overflow-hidden z-10"
                    style={{
                      boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {medicationOptions.map((medication, index) => (
                      <button
                        key={medication.id ?? medication.name}
                        type="button"
                        onClick={() => selectMedication(medication.name)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                        style={{
                          borderBottom:
                            index === medicationOptions.length - 1
                              ? "none"
                              : `1px solid ${C.border}`,
                        }}
                      >
                        <div className="text-left">
                          <p
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "16px",
                              fontWeight: 600,
                              color: C.textPrimary,
                            }}
                          >
                            {medication.name}
                          </p>
                          <p
                            style={{
                              fontFamily: "'Open Sans', sans-serif",
                              fontSize: "13px",
                              color: C.textSecond,
                            }}
                          >
                            {medication.summary}
                          </p>
                        </div>
                        {selectedMed === medication.name && <Check size={16} color={C.teal} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {recommendation && recommendation.times.length > 0 && (
                <div className="mt-3">
                  <p
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: C.textDisabled,
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                    }}
                  >
                    {t("medications.recommendedDoses")} - {recommendation.freq}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {recommendation.times.map((slot, index) => {
                      const active =
                        selectedHour === slot.hour && selectedPeriod === slot.period;

                      return (
                        <button
                          key={`${slot.hour}-${slot.period}`}
                          type="button"
                          onClick={() => {
                            setSelectedHour(slot.hour);
                            setSelectedPeriod(slot.period);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors"
                          style={{
                            background: active ? C.teal : "#F0FDF4",
                            border: `1.5px solid ${active ? C.teal : "#86EFAC"}`,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              color: active ? "white" : "#059669",
                            }}
                          >
                            *
                          </span>
                          <span
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: active ? "white" : "#065F46",
                            }}
                          >
                            {t("medications.dose")} {index + 1} - {slot.hour} {slot.period}
                          </span>
                          <span
                            style={{
                              fontFamily: "'Open Sans', sans-serif",
                              fontSize: "12px",
                              color: active ? "rgba(255,255,255,0.82)" : "#059669",
                            }}
                          >
                            {slot.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ opacity: selectedMed ? 1 : 0.45, pointerEvents: selectedMed ? "auto" : "none" }}>
              <div className="flex items-center justify-between gap-4 mb-3">
                <p
                  style={{
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: C.textDisabled,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  {t("medications.timeLabel")}
                </p>
                {recommendation && (
                  <span
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: isRecommended ? "#059669" : C.textSecond,
                      padding: "2px 10px",
                      borderRadius: "999px",
                      background: isRecommended ? "#F0FDF4" : C.muted,
                      border: `1px solid ${isRecommended ? "#BBF7D0" : C.border}`,
                    }}
                  >
                    {isRecommended
                      ? `${t("medications.recommended")} - ${t("medications.dose")} ${recommendedDoseIndex + 1}`
                      : t("medications.custom")}
                  </span>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {ALL_HOURS.map((slot) => {
                  const selected =
                    selectedHour === slot.hour && selectedPeriod === slot.period;
                  const recIndex = recommendation
                    ? recommendation.times.findIndex(
                        (time) => time.hour === slot.hour && time.period === slot.period
                      )
                    : -1;
                  const recommended = recIndex !== -1;

                  return (
                    <div
                      key={`${slot.hour}-${slot.period}`}
                      className="shrink-0 flex flex-col items-center gap-1"
                    >
                      <span
                        style={{
                          height: "12px",
                          fontFamily: "'Open Sans', sans-serif",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#059669",
                        }}
                      >
                        {recommended ? "*" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHour(slot.hour);
                          setSelectedPeriod(slot.period);
                        }}
                        className="rounded-xl transition-colors"
                        style={{
                          padding: "10px 12px",
                          background: selected ? C.teal : recommended ? "#F0FDF4" : C.muted,
                          border: recommended && !selected ? "1.5px solid #86EFAC" : "none",
                          color: selected ? "white" : C.textPrimary,
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          minWidth: "58px",
                          textAlign: "center",
                        }}
                      >
                        <span>{slot.hour}</span>
                        <span style={{ display: "block", fontSize: "11px", opacity: 0.7 }}>
                          {slot.period}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedMed && (
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: C.tealLight, border: `1px solid ${C.teal}30` }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: C.teal }}
                >
                  <Clock size={18} color="white" />
                </div>
                <div className="flex-1">
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: C.textPrimary,
                    }}
                  >
                    {selectedMed}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: "14px",
                      color: C.textSecond,
                    }}
                  >
                    {recommendation?.freq ?? "Custom"} - {selectedHour} {selectedPeriod}
                    {isRecommended &&
                      recommendation &&
                      recommendation.times.length > 1 &&
                      ` (${t("medications.dose").toLowerCase()} ${recommendedDoseIndex + 1} of ${recommendation.times.length})`}
                  </p>
                </div>
              </div>
            )}

            {errorMessage && <div className="verification-error">{errorMessage}</div>}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              className="scanner-confirm pharmacist-confirm"
              disabled={submitting || !selectedMed || !selectedHour || !selectedPeriod}
              style={{ marginTop: 0 }}
            >
              {submitting ? "Sending..." : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
