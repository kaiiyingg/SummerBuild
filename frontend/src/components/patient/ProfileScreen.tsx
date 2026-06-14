import { useEffect, useState } from "react";
import { LogOut, ChevronDown, ChevronUp, Bell, BellRing, AlertTriangle } from "lucide-react";
import { useTranslation, LANGUAGES } from "../../context/LanguageContext";
import {
  fetchCurrentPatientDetails,
  subscribeToPatientChanges,
} from "../../services/pharmacyData";

const C = {
  teal:        "#45C5BC",
  tealLight:   "#F0FDFA",
  bg:          "#F8FAFC",
  textPrimary: "#1E293B",
  textSecond:  "#64748B",
  textDisabled:"#94A3B8",
  border:      "#E2E8F0",
  amber:       "#F59E0B",
  red:         "#EF4444",
};

const pastVisits = [
  { id: 1, date: "28 May 2026", meds: ["Metformin 500mg", "Lisinopril 10mg", "Aspirin 100mg"] },
  { id: 2, date: "14 Apr 2026", meds: ["Atorvastatin 20mg", "Aspirin 100mg"] },
  { id: 3, date: "1 Mar 2026",  meds: ["Metformin 500mg", "Atorvastatin 20mg", "Lisinopril 10mg"] },
];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="relative w-12 h-7 rounded-full transition-colors shrink-0"
      style={{ background: on ? C.teal : C.border }}>
      <span className="absolute top-1.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: on ? "calc(100% - 20px)" : "4px" }} />
    </button>
  );
}

export function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const { language, setLanguage, t } = useTranslation();
  const [notifs,        setNotifs]        = useState({ queue: true, reminders: true, delays: false });
  const [expandedVisit, setExpandedVisit] = useState<number | null>(null);
  const [patient,       setPatient]       = useState<any>(null);
  const toggleNotif = (key: keyof typeof notifs) => setNotifs((n) => ({ ...n, [key]: !n[key] }));
  const patientName = patient?.name || localStorage.getItem("pilly-user-name") || "Patient";
  const patientNric = patient?.nric ? `NRIC: ${patient.nric}` : `${t("profile.patientId")}: ${patient?.id ?? "-"}`;
  const patientInitials = getInitials(patientName);

  useEffect(() => {
    const loadPatient = async () => {
      setPatient(await fetchCurrentPatientDetails());
    };

    void loadPatient();
    return subscribeToPatientChanges(() => {
      void loadPatient();
    });
  }, []);

  const SectionLabel = ({ text }: { text: string }) => (
    <p className="mb-3" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "12px", fontWeight: 700, color: C.textDisabled, letterSpacing: "1px", textTransform: "uppercase" as const }}>
      {text}
    </p>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 pb-8 overflow-y-auto h-full max-w-2xl mx-auto w-full">

      {/* Patient card */}
      <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ background: C.tealLight }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 700, color: C.teal }}>{patientInitials}</span>
          </div>
          <div>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary }}>{patientName}</h2>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond, marginTop: "2px" }}>{patientNric}</p>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond }}>Singapore General Hospital</p>
          </div>
        </div>
      </div>

      {/* Language preference */}
      <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${C.border}` }}>
        <SectionLabel text={t('profile.languagePreference')} />
        <div className="space-y-1">
          {LANGUAGES.map((opt) => {
            const active = language === opt.code;
            return (
              <button key={opt.code} onClick={() => setLanguage(opt.code)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors"
                style={{ background: active ? C.tealLight : "transparent" }}>
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.textPrimary, flex: 1, textAlign: "left" }}>
                  {opt.nativeLabel}
                </span>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: active ? C.teal : C.border }}>
                  {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: C.teal }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification settings */}
      <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${C.border}` }}>
        <SectionLabel text={t('profile.notifications')} />
        <div className="space-y-5">
          {[
            { key: "queue"     as const, icon: <Bell size={18} color={C.teal} />,           label: t('profile.notifyQueueUpdates'),     desc: t('profile.notifyQueueDesc')    },
            { key: "reminders" as const, icon: <BellRing size={18} color={C.teal} />,       label: t('profile.notifyMedicationReminder'), desc: t('profile.notifyReminderDesc') },
            { key: "delays"    as const, icon: <AlertTriangle size={18} color={C.amber} />, label: t('profile.notifyDelaysLabel'),       desc: t('profile.notifyDelaysDesc')   },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.bg }}>
                {item.icon}
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, color: C.textPrimary }}>{item.label}</p>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginTop: "2px" }}>{item.desc}</p>
              </div>
              <Toggle on={notifs[item.key]} onToggle={() => toggleNotif(item.key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Past visits */}
      <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${C.border}` }}>
        <SectionLabel text={t('profile.pastVisits')} />
        <div className="space-y-2">
          {pastVisits.map((visit) => {
            const expanded = expandedVisit === visit.id;
            return (
              <div key={visit.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                <button onClick={() => setExpandedVisit(expanded ? null : visit.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5"
                  style={{ background: expanded ? C.bg : "white" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: C.textPrimary }}>{visit.date}</span>
                  <span style={{ color: C.textSecond }}>{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</span>
                </button>
                {expanded && (
                  <div className="px-4 pb-3" style={{ background: C.bg }}>
                    {visit.meds.map((med) => (
                      <p key={med} className="py-1.5" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond }}>· {med}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Logout */}
      <button onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-80 transition-opacity"
        style={{ border: `1.5px solid ${C.red}`, color: C.red, background: "white", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, height: "52px" }}>
        <LogOut size={18} />{t('profile.logout')}
      </button>

    </div>
  );
}
