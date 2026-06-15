import { Clock } from "lucide-react";
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

export const ALL_HOURS = [
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

export function formatReminderTime(value) {
  const [hourText = "08", minute = "00"] = String(value || "").split(":");
  const rawHour = Number(hourText);
  const hour = Number.isNaN(rawHour) ? 8 : rawHour;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

export function toTimeInputValue(value) {
  if (/^\d{2}:\d{2}$/.test(String(value || ""))) {
    return String(value);
  }

  const match = String(value || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return "08:00";

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") {
    hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export function parseReminderTimeParts(value) {
  const formatted = String(value || "");
  const match = formatted.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    return {
      hour: `${Number(match[1])}:${match[2]}`,
      period: match[3].toUpperCase(),
    };
  }

  const inputValue = toTimeInputValue(value);
  const [hourText = "08", minute = "00"] = inputValue.split(":");
  const hour24 = Number(hourText);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return {
    hour: `${hour12}:${minute}`,
    period,
  };
}

export function formatReminderSlot(slot) {
  return `${slot.hour} ${slot.period}`;
}

export function getRecommendedReminderTimes(recommendation) {
  return (recommendation?.times ?? []).map(formatReminderSlot);
}

export function getMedicationRecommendation(medication) {
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

export function getMedicationSummary(medication, recommendation) {
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

export function getRecommendedDoseIndex(recommendation, selectedHour, selectedPeriod) {
  return recommendation
    ? recommendation.times.findIndex(
        (slot) => slot.hour === selectedHour && slot.period === selectedPeriod
      )
    : -1;
}

export function ReminderTimeSelector({
  recommendation,
  selectedHour,
  selectedPeriod,
  onSelectTime,
}) {
  const { t } = useTranslation();
  const recommendedDoseIndex = getRecommendedDoseIndex(
    recommendation,
    selectedHour,
    selectedPeriod
  );
  const isRecommended = recommendedDoseIndex !== -1;

  return (
    <div>
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
                  onClick={() => onSelectTime(slot.hour, slot.period)}
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

      <div className="mt-6">
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
                  onClick={() => onSelectTime(slot.hour, slot.period)}
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
    </div>
  );
}

export function ReminderTimePreview({
  medicationName,
  recommendation,
  selectedHour,
  selectedPeriod,
}) {
  const { t } = useTranslation();
  const recommendedDoseIndex = getRecommendedDoseIndex(
    recommendation,
    selectedHour,
    selectedPeriod
  );
  const isRecommended = recommendedDoseIndex !== -1;

  if (!medicationName) return null;

  return (
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
          {medicationName}
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
  );
}
