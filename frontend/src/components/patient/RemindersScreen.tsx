import { useEffect, useState } from "react";
import { Plus, X, Clock, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import {
  addPatientReminder,
  fetchPatientReminders,
  setPatientReminderTaken,
  subscribeToReminderChanges,
} from "../../services/pharmacyData";

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
  green:       "#10B981",
};

const medicationOptions = [
  { name: "Metformin 500mg",   for: "Type 2 Diabetes" },
  { name: "Lisinopril 10mg",   for: "High Blood Pressure" },
  { name: "Atorvastatin 20mg", for: "High Cholesterol" },
  { name: "Aspirin 100mg",     for: "Heart Disease Prevention" },
];

type Reminder = {
  id: number | string;
  name: string;
  time: string;
  taken: boolean;
  createdByName?: string | null;
  createdByRole?: string | null;
};

type MedRec = { freq: string; times: { hour: string; period: string; label: string }[] };

const MED_RECOMMENDATIONS: Record<string, MedRec> = {
  "Metformin 500mg":   { freq: "Twice daily",  times: [{ hour: "8:00",  period: "AM", label: "With breakfast" }, { hour: "8:00", period: "PM", label: "With dinner" }] },
  "Lisinopril 10mg":   { freq: "Once daily",   times: [{ hour: "9:00",  period: "AM", label: "Morning" }] },
  "Atorvastatin 20mg": { freq: "Once daily",   times: [{ hour: "10:00", period: "PM", label: "Bedtime" }] },
  "Aspirin 100mg":     { freq: "Once daily",   times: [{ hour: "8:00",  period: "AM", label: "After breakfast" }] },
};

const ALL_HOURS = [
  { hour: "6:00",  period: "AM" }, { hour: "6:30",  period: "AM" },
  { hour: "7:00",  period: "AM" }, { hour: "7:30",  period: "AM" },
  { hour: "8:00",  period: "AM" }, { hour: "8:30",  period: "AM" },
  { hour: "9:00",  period: "AM" }, { hour: "9:30",  period: "AM" },
  { hour: "10:00", period: "AM" }, { hour: "10:30", period: "AM" },
  { hour: "11:00", period: "AM" }, { hour: "11:30", period: "AM" },
  { hour: "12:00", period: "PM" }, { hour: "12:30", period: "PM" },
  { hour: "1:00",  period: "PM" }, { hour: "1:30",  period: "PM" },
  { hour: "2:00",  period: "PM" }, { hour: "2:30",  period: "PM" },
  { hour: "3:00",  period: "PM" }, { hour: "3:30",  period: "PM" },
  { hour: "4:00",  period: "PM" }, { hour: "4:30",  period: "PM" },
  { hour: "5:00",  period: "PM" }, { hour: "5:30",  period: "PM" },
  { hour: "6:00",  period: "PM" }, { hour: "6:30",  period: "PM" },
  { hour: "7:00",  period: "PM" }, { hour: "7:30",  period: "PM" },
  { hour: "8:00",  period: "PM" }, { hour: "8:30",  period: "PM" },
  { hour: "9:00",  period: "PM" }, { hour: "9:30",  period: "PM" },
  { hour: "10:00", period: "PM" }, { hour: "10:30", period: "PM" },
];

function ReminderRow({ reminder, onToggle }: { reminder: Reminder; onToggle: () => void }) {
  const sourceLabel =
    reminder.createdByRole === "pharmacist"
      ? `Shared by ${reminder.createdByName || "your pharmacist"}`
      : reminder.createdByName
        ? `Added by ${reminder.createdByName}`
        : null;

  return (
    <div className="flex items-center gap-4 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
      <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0" style={{ background: C.tealLight }}>
        <Clock size={20} color={C.teal} />
      </div>
      <div className="flex-1">
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "17px", fontWeight: 600, color: reminder.taken ? C.textDisabled : C.textPrimary, textDecoration: reminder.taken ? "line-through" : "none" }}>
          {reminder.name}
        </p>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.textSecond, marginTop: "3px" }}>{reminder.time}</p>
        {sourceLabel && (
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textDisabled, marginTop: "3px" }}>
            {sourceLabel}
          </p>
        )}
      </div>
      <button onClick={onToggle} className="h-9 w-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
        style={{ borderColor: reminder.taken ? C.teal : C.border, background: reminder.taken ? C.teal : "white" }}>
        {reminder.taken && (
          <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

function AddReminderSheet({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (reminder: { name: string; time: string }) => void;
}) {
  const { t } = useTranslation();
  const [selectedMed,    setSelectedMed]    = useState("");
  const [selectedHour,   setSelectedHour]   = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [showMedPicker,  setShowMedPicker]  = useState(false);

  const rec = MED_RECOMMENDATIONS[selectedMed] ?? null;

  // True if the selected time matches ANY of the recommended times
  const recDoseIndex = rec
    ? rec.times.findIndex((t) => t.hour === selectedHour && t.period === selectedPeriod)
    : -1;
  const isRecommended = recDoseIndex !== -1;

  const selectMed = (name: string) => {
    setSelectedMed(name);
    setShowMedPicker(false);
    const r = MED_RECOMMENDATIONS[name];
    if (r) { setSelectedHour(r.times[0].hour); setSelectedPeriod(r.times[0].period); }
  };

  const handleAdd = () => {
    if (!selectedMed) return;
    onAdd({ name: selectedMed, time: `${selectedHour} ${selectedPeriod}` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl pb-8 overflow-y-auto" style={{ maxHeight: "90svh", boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: C.border }} />
        </div>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary }}>{t('medications.addReminder')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: C.muted }}>
            <X size={18} color={C.textSecond} />
          </button>
        </div>

        <div className="px-6 pt-5 space-y-6">

          {/* Medication picker */}
          <div>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: C.textDisabled, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px" }}>
              {t('medications.medication')}
            </p>
            <div className="relative">
              <button onClick={() => setShowMedPicker(!showMedPicker)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl"
                style={{ border: `1.5px solid ${selectedMed ? C.teal : C.border}`, background: selectedMed ? C.tealLight : "white" }}>
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: selectedMed ? C.textPrimary : C.textDisabled }}>
                  {selectedMed || t('medications.selectMedication')}
                </span>
                <div className="flex items-center gap-2">
                  {selectedMed && (
                    <button onClick={(e) => { e.stopPropagation(); setSelectedMed(""); setSelectedHour(""); setSelectedPeriod(""); setShowMedPicker(false); }}
                      className="p-0.5 rounded-full hover:opacity-70 transition-opacity" style={{ background: C.textDisabled }}>
                      <X size={12} color="white" />
                    </button>
                  )}
                  <ChevronDown size={17} color={C.textSecond} />
                </div>
              </button>
              {showMedPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl overflow-hidden z-10"
                  style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.10)", border: `1px solid ${C.border}` }}>
                  {medicationOptions.map((m) => {
                    const r = MED_RECOMMENDATIONS[m.name];
                    return (
                      <button key={m.name} onClick={() => selectMed(m.name)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                        style={{ borderBottom: `1px solid ${C.border}` }}>
                        <div className="text-left">
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, color: C.textPrimary }}>{m.name}</p>
                          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textSecond }}>
                            {m.for}{r ? ` · ${r.freq}` : ""}
                          </p>
                        </div>
                        {selectedMed === m.name && <Check size={16} color={C.teal} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recommended dose quick-picks (shown below picker when med is selected) */}
            {rec && rec.times.length > 1 && (
              <div className="mt-3">
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "12px", fontWeight: 700, color: C.textDisabled, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
                  {t('medications.recommendedDoses')} — {rec.freq}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {rec.times.map((slot, i) => {
                    const active = selectedHour === slot.hour && selectedPeriod === slot.period;
                    return (
                      <button key={i} onClick={() => { setSelectedHour(slot.hour); setSelectedPeriod(slot.period); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors"
                        style={{
                          background: active ? C.teal : "#F0FDF4",
                          border: `1.5px solid ${active ? C.teal : "#86EFAC"}`,
                        }}>
                        <span style={{ fontSize: "10px", color: active ? "white" : "#059669" }}>★</span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600, color: active ? "white" : "#065F46" }}>
                          {t('medications.dose')} {i + 1} — {slot.hour} {slot.period}
                        </span>
                        <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "12px", color: active ? "rgba(255,255,255,0.8)" : "#059669" }}>
                          {slot.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Time picker */}
          <div style={{ opacity: selectedMed ? 1 : 0.4, pointerEvents: selectedMed ? "auto" : "none" }}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: C.textDisabled, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                {t('medications.timeLabel')}
              </p>
              {selectedMed && rec && (
                <span style={{
                  fontFamily: "'Open Sans', sans-serif", fontSize: "12px", fontWeight: 600,
                  color: isRecommended ? "#059669" : C.textSecond,
                  padding: "2px 10px", borderRadius: "999px",
                  background: isRecommended ? "#F0FDF4" : C.muted,
                  border: `1px solid ${isRecommended ? "#BBF7D0" : C.border}`,
                }}>
                  {isRecommended ? `${t('medications.recommended')} · ${t('medications.dose')} ${recDoseIndex + 1}` : t('medications.custom')}
                </span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {ALL_HOURS.map((h, i) => {
                const isSelected = selectedHour === h.hour && selectedPeriod === h.period;
                // Check if this slot is any of the recommended times
                const recIdx = rec ? rec.times.findIndex((t) => t.hour === h.hour && t.period === h.period) : -1;
                const isRec = recIdx !== -1;
                return (
                  <div key={i} className="shrink-0 flex flex-col items-center gap-1">
                    <span style={{ height: "12px", fontFamily: "'Open Sans', sans-serif", fontSize: "10px", fontWeight: 700, color: "#059669" }}>
                      {isRec ? "★" : ""}
                    </span>
                    <button
                      onClick={() => { setSelectedHour(h.hour); setSelectedPeriod(h.period); }}
                      className="rounded-xl transition-colors"
                      style={{
                        padding: "10px 12px",
                        background: isSelected ? C.teal : isRec ? "#F0FDF4" : C.muted,
                        border: isRec && !isSelected ? "1.5px solid #86EFAC" : "none",
                        color: isSelected ? "white" : C.textPrimary,
                        fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 600,
                        minWidth: "58px", textAlign: "center" as const,
                      }}>
                      <span>{h.hour}</span>
                      <span style={{ display: "block", fontSize: "11px", opacity: 0.7 }}>{h.period}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {selectedMed && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: C.tealLight, border: `1px solid ${C.teal}30` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.teal }}>
                <Clock size={18} color="white" />
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: C.textPrimary }}>{selectedMed}</p>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond }}>
                  {rec?.freq ?? "Custom"} · {selectedHour} {selectedPeriod}
                  {isRecommended && rec && rec.times.length > 1 && ` (${t('medications.dose').toLowerCase()} ${recDoseIndex + 1} of ${rec.times.length})`}
                </p>
              </div>
            </div>
          )}

          <button onClick={handleAdd}
            className="w-full py-3.5 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{
              background: selectedMed ? C.teal : C.border,
              fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700,
              cursor: selectedMed ? "pointer" : "not-allowed",
            }}>
            {t('medications.setReminder')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RemindersScreen() {
  const { t } = useTranslation();
  const [reminders,    setReminders]    = useState<Reminder[]>([]);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const takenCount = reminders.filter((r) => r.taken).length;

  useEffect(() => {
    const loadReminders = async () => {
      setReminders(await fetchPatientReminders());
    };

    loadReminders();
    return subscribeToReminderChanges(loadReminders);
  }, []);

  const toggleReminder = async (id: number) => {
    const reminder = reminders.find((item) => item.id === id);
    if (!reminder) return;

    const nextTaken = !reminder.taken;
    setReminders((r) => r.map((rem) => rem.id === id ? { ...rem, taken: nextTaken } : rem));
    await setPatientReminderTaken(id, nextTaken);
  };

  const addReminder = async ({ name, time }: { name: string; time: string }) => {
    const savedReminder = await addPatientReminder({ name, time });
    setReminders((r) => [
      ...r,
      savedReminder ?? { id: r.length + 1, name, time, taken: false },
    ]);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-y-auto h-full pb-6 max-w-2xl mx-auto w-full">

      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "28px", fontWeight: 700, color: C.textPrimary }}>
          {t('medications.reminderTitle')}
        </h1>
      </div>

      {/* Progress summary */}
      <div className="p-4 rounded-xl bg-white" style={{ border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: C.textPrimary }}>{t('medications.todaysProgress')}</p>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.teal }}>
            {takenCount}/{reminders.length}
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.muted }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(takenCount / Math.max(reminders.length, 1)) * 100}%`, background: C.teal }} />
        </div>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.textSecond, marginTop: "10px", lineHeight: "1.5" }}>
          {reminders.length === 0
            ? "No reminders yet. Your pharmacist can add medication reminders for you here."
            : takenCount === reminders.length
            ? t('medications.allDosesTaken')
            : `${reminders.length - takenCount} ${reminders.length - takenCount === 1 ? t('medications.doseRemaining') : t('medications.dosesRemaining')}`}
        </p>
      </div>

      {/* Reminder list */}
      <div>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", fontWeight: 700, color: C.textDisabled, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>
          {t('medications.todaysSchedule')}
        </p>
        <div className="bg-white rounded-xl px-4" style={{ border: `1px solid ${C.border}` }}>
          <div className="overflow-y-auto" style={{ maxHeight: "min(50vh, 460px)" }}>
            {reminders.length === 0 ? (
              <div className="py-10 text-center" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond }}>
                No reminders scheduled yet.
              </div>
            ) : (
              reminders.map((r) => (
                <ReminderRow key={r.id} reminder={r} onToggle={() => void toggleReminder(r.id)} />
              ))
            )}
          </div>
          <div className="py-4 text-center">
            <button onClick={() => setShowAddSheet(true)}
              className="mx-auto flex min-h-[44px] items-center gap-2 rounded-xl px-3 hover:opacity-80 transition-opacity"
              style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.teal, fontWeight: 700 }}>
              <Plus size={19} />{t('medications.addReminder')}
            </button>
          </div>
        </div>
      </div>

      {showAddSheet && <AddReminderSheet onClose={() => setShowAddSheet(false)} onAdd={(reminder) => void addReminder(reminder)} />}
    </div>
  );
}
