import { useState } from "react";
import { Volume2, Camera, MessageCircle, Search, FileText, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

const C = {
  teal:        "#45C5BC",
  tealDark:    "#38B2A9",
  tealLight:   "#F0FDFA",
  bg:          "#F8FAFC",
  muted:       "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond:  "#64748B",
  textDisabled:"#94A3B8",
  border:      "#E2E8F0",
  amber:       "#F59E0B",
  amberLight:  "#FFFBEB",
  amberText:   "#92400E",
  green:       "#10B981",
  greenLight:  "#ECFDF5",
  greenText:   "#065F46",
  red:         "#EF4444",
  redLight:    "#FEF2F2",
  redText:     "#991B1B",
  blue:        "#3B82F6",
  blueLight:   "#EFF6FF",
  blueText:    "#1D4ED8",
};

type MedStatus = "ready" | "packing" | "delayed";

const medications = [
  {
    id: 1, name: "Metformin 500mg", for: "Type 2 Diabetes",
    how: "Take 1 tablet twice daily with meals. Do not skip doses.",
    caution: "May cause stomach upset if taken without food. Swallow whole — do not crush or chew.",
    status: "ready" as MedStatus,
  },
  {
    id: 2, name: "Lisinopril 10mg", for: "High Blood Pressure",
    how: "Take 1 tablet once daily in the morning. Monitor blood pressure regularly.",
    caution: "Do not stop taking without consulting your doctor, even if you feel well.",
    status: "packing" as MedStatus,
  },
  {
    id: 3, name: "Atorvastatin 20mg", for: "High Cholesterol",
    how: "Take 1 tablet once daily at bedtime. Avoid grapefruit juice.",
    caution: "Avoid grapefruit juice. Report any unexplained muscle pain or weakness to your doctor.",
    status: "delayed" as MedStatus,
  },
  {
    id: 4, name: "Aspirin 100mg", for: "Heart Disease Prevention",
    how: "Take 1 tablet once daily after breakfast with a full glass of water.",
    caution: null,
    status: "ready" as MedStatus,
  },
];

const OVERALL_STATUS_CONFIG: Record<MedStatus, { label: string; dot: string; badgeColor: string; badgeBg: string; badgeBorder: string }> = {
  ready:   { label: "Ready",          dot: C.green, badgeColor: C.greenText, badgeBg: C.greenLight, badgeBorder: `${C.green}40` },
  packing: { label: "Being Prepared", dot: C.blue,  badgeColor: C.blueText,  badgeBg: C.blueLight,  badgeBorder: `${C.blue}40`  },
  delayed: { label: "Delayed",        dot: C.amber, badgeColor: C.amberText, badgeBg: C.amberLight, badgeBorder: `${C.amber}40` },
};

function getOverallStatus(meds: typeof medications): MedStatus {
  if (meds.some((m) => m.status === "delayed")) return "delayed";
  if (meds.some((m) => m.status === "packing")) return "packing";
  return "ready";
}

const STATUS_BORDER: Record<MedStatus, string> = {
  ready:   C.teal,
  packing: C.teal,
  delayed: C.amber,
};

function MedCard({ med }: { med: typeof medications[number] }) {
  const [showCaution, setShowCaution] = useState(false);
  const borderColor = STATUS_BORDER[med.status];

  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${borderColor}` }}>
      <div className="p-4">
        <h3 className="mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: C.textPrimary }}>
          {med.name}
        </h3>
        <p className="mb-3" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px" }}>
          <span style={{ color: C.textPrimary, fontWeight: 600 }}>For: </span>
          <span style={{ color: C.teal }}>{med.for}</span>
        </p>
        <div className="rounded-lg p-3 relative" style={{ background: C.muted }}>
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary, paddingRight: "32px", lineHeight: "1.65" }}>
            <span style={{ fontWeight: 600 }}>How to take: </span>{med.how}
          </p>
          <button className="absolute bottom-3 right-3" aria-label="Read instructions aloud">
            <Volume2 size={19} color={C.textSecond} />
          </button>
        </div>

        {/* Caution note */}
        {med.caution && showCaution && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg" style={{ background: C.amberLight, border: `1px solid ${C.amber}40` }}>
            <AlertTriangle size={15} color={C.amber} className="shrink-0 mt-0.5" />
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.amberText, lineHeight: "1.55" }}>
              {med.caution}
            </p>
          </div>
        )}
      </div>

      {/* Caution toggle */}
      {med.caution && (
        <button
          onClick={() => setShowCaution(!showCaution)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 hover:opacity-70 transition-opacity"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textSecond }}>
            {showCaution ? "Hide caution note" : "Show caution note"}
          </span>
          {showCaution
            ? <ChevronUp size={14} color={C.textSecond} />
            : <ChevronDown size={14} color={C.textSecond} />}
        </button>
      )}
    </div>
  );
}

export function MedicationsScreen({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const overallStatus = getOverallStatus(medications);
  const cfg = OVERALL_STATUS_CONFIG[overallStatus];

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-y-auto h-full pb-6 max-w-4xl mx-auto w-full">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond }}>
            Today's prescription
          </p>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "24px", fontWeight: 700, color: C.textPrimary }}>
            {medications.length} medications
          </h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full mt-1"
          style={{ background: cfg.badgeBg, border: `1px solid ${cfg.badgeBorder}` }}>
          <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
          <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 600, color: cfg.badgeColor }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Med cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {medications.map((med) => <MedCard key={med.id} med={med} />)}
      </div>

      {/* Help section */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>

        {/* Scan card */}
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
                Scan Medication Label
              </p>
              <div className="space-y-1.5">
                {[
                  { icon: <Search size={12} color="rgba(255,255,255,0.9)" />,   text: "Identify any pill by photo" },
                  { icon: <FileText size={12} color="rgba(255,255,255,0.9)" />, text: "Get instructions translated to your language" },
                  { icon: <Volume2 size={12} color="rgba(255,255,255,0.9)" />,  text: "Have instructions read aloud to you" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-2">
                    {f.icon}
                    <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.9)" }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "18px", alignSelf: "center" }}>›</span>
          </div>
        </button>

        <div style={{ height: "1px", background: C.border }} />

        {/* Ask Pilly card */}
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
                Ask Pilly
              </p>
              <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textSecond, lineHeight: "1.6" }}>
                Chat in your preferred language. Ask about your medications, side effects, dosage, upcoming appointments, or any health questions you have.
              </p>
            </div>
            <span style={{ color: C.textDisabled, fontSize: "18px", alignSelf: "center" }}>›</span>
          </div>
        </button>

      </div>
    </div>
  );
}
