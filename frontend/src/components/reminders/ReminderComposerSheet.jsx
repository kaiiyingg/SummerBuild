import { useMemo, useState } from "react";
import { Check, ChevronDown, Clock, X } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import {
  getMedicationRecommendation,
  getMedicationSummary,
  getRecommendedReminderTimes,
} from "./ReminderTimingTools";

const C = {
  teal: "#45C5BC",
  tealLight: "#F0FDFA",
  muted: "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond: "#64748B",
  textDisabled: "#94A3B8",
  border: "#E2E8F0",
};

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
  const [showMedPicker, setShowMedPicker] = useState(false);

  const currentMedication =
    medicationOptions.find((medication) => medication.name === selectedMed) ??
    medicationOptions[0] ??
    null;
  const recommendation = currentMedication?.recommendation ?? null;
  const recommendedTimes = getRecommendedReminderTimes(recommendation);

  const selectMedication = (name) => {
    setSelectedMed(name);
    setShowMedPicker(false);
  };

  const clearMedication = (event) => {
    event.stopPropagation();
    setSelectedMed("");
    setShowMedPicker(false);
  };

  const handleSubmit = async () => {
    if (!selectedMed || recommendedTimes.length === 0 || submitting) return;
    await onSubmit({ name: selectedMed, times: recommendedTimes });
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
              Choose a medication for {patientName}. Pilly will save every
              recommended dose and timing for that medication at once.
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
            </div>

            {selectedMed && recommendation && (
              <>
                <div>
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
                    {recommendation.times.map((slot, index) => (
                      <div
                        key={`${slot.hour}-${slot.period}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                        style={{
                          background: C.teal,
                          border: `1.5px solid ${C.teal}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            color: "white",
                          }}
                        >
                          *
                        </span>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "white",
                          }}
                        >
                          {t("medications.dose")} {index + 1} - {slot.hour} {slot.period}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Open Sans', sans-serif",
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.82)",
                          }}
                        >
                          {slot.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-2xl p-5"
                  style={{ background: C.tealLight, border: `1px solid ${C.border}` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p
                        style={{
                          fontFamily: "'Open Sans', sans-serif",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: C.textDisabled,
                          letterSpacing: "0.8px",
                          textTransform: "uppercase",
                          marginBottom: "6px",
                        }}
                      >
                        Reminder plan
                      </p>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "18px",
                          fontWeight: 700,
                          color: C.textPrimary,
                          margin: 0,
                        }}
                      >
                        {selectedMed}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Open Sans', sans-serif",
                          fontSize: "14px",
                          color: C.textSecond,
                          marginTop: "6px",
                        }}
                      >
                        These {recommendedTimes.length} reminder
                        {recommendedTimes.length === 1 ? "" : "s"} will be saved
                        together for the patient.
                      </p>
                    </div>
                    <span
                      style={{
                        fontFamily: "'Open Sans', sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#059669",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        background: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                      }}
                    >
                      {recommendation.freq}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {recommendation.times.map((slot, index) => (
                      <div
                        key={`${slot.hour}-${slot.period}`}
                        className="flex items-center gap-3 rounded-xl p-4"
                        style={{ background: "white", border: `1px solid ${C.border}` }}
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
                            {t("medications.dose")} {index + 1}
                          </p>
                          <p
                            style={{
                              fontFamily: "'Open Sans', sans-serif",
                              fontSize: "14px",
                              color: C.textSecond,
                            }}
                          >
                            {slot.hour} {slot.period}
                            {slot.label ? ` - ${slot.label}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {errorMessage && <div className="verification-error">{errorMessage}</div>}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              className="scanner-confirm pharmacist-confirm"
              disabled={submitting || !selectedMed || recommendedTimes.length === 0}
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
