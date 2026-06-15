import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import {
  fetchPatientReminders,
  setPatientReminderTaken,
  subscribeToReminderChanges,
} from "../../services/pharmacyData";

const C = {
  teal: "#45C5BC",
  tealLight: "#F0FDFA",
  muted: "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond: "#64748B",
  textDisabled: "#94A3B8",
  border: "#E2E8F0",
};

type Reminder = {
  id: number | string;
  name: string;
  time: string;
  taken: boolean;
  createdByName?: string | null;
  createdByRole?: string | null;
};

function ReminderRow({
  reminder,
  onToggle,
}: {
  reminder: Reminder;
  onToggle: () => void;
}) {
  const sourceLabel =
    reminder.createdByRole === "pharmacist"
      ? `Shared by ${reminder.createdByName || "your pharmacist"}`
      : reminder.createdByName
        ? `Added by ${reminder.createdByName}`
        : null;

  return (
    <div
      className="flex items-center gap-4 py-4"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      <div
        className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: C.tealLight }}
      >
        <Clock size={20} color={C.teal} />
      </div>
      <div className="flex-1">
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "17px",
            fontWeight: 600,
            color: reminder.taken ? C.textDisabled : C.textPrimary,
            textDecoration: reminder.taken ? "line-through" : "none",
          }}
        >
          {reminder.name}
        </p>
        <p
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: "16px",
            color: C.textSecond,
            marginTop: "3px",
          }}
        >
          {reminder.time}
        </p>
        {sourceLabel && (
          <p
            style={{
              fontFamily: "'Open Sans', sans-serif",
              fontSize: "13px",
              color: C.textDisabled,
              marginTop: "3px",
            }}
          >
            {sourceLabel}
          </p>
        )}
      </div>
      <button
        onClick={onToggle}
        className="h-9 w-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
        style={{
          borderColor: reminder.taken ? C.teal : C.border,
          background: reminder.taken ? C.teal : "white",
        }}
        aria-label={`Mark ${reminder.name} as ${reminder.taken ? "not taken" : "taken"}`}
      >
        {reminder.taken && (
          <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

export function RemindersScreen() {
  const { t } = useTranslation();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const takenCount = reminders.filter((reminder) => reminder.taken).length;

  useEffect(() => {
    const loadReminders = async () => {
      setReminders(await fetchPatientReminders());
    };

    void loadReminders();
    return subscribeToReminderChanges(loadReminders);
  }, []);

  const toggleReminder = async (id: Reminder["id"]) => {
    const reminder = reminders.find((item) => item.id === id);
    if (!reminder) return;

    const nextTaken = !reminder.taken;
    setReminders((current) =>
      current.map((item) =>
        item.id === id ? { ...item, taken: nextTaken } : item
      )
    );
    await setPatientReminderTaken(id, nextTaken);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-y-auto h-full pb-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "28px",
            fontWeight: 700,
            color: C.textPrimary,
          }}
        >
          {t("medications.reminderTitle")}
        </h1>
      </div>

      <div className="p-4 rounded-xl bg-white" style={{ border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "18px",
              fontWeight: 600,
              color: C.textPrimary,
            }}
          >
            {t("medications.todaysProgress")}
          </p>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "20px",
              fontWeight: 700,
              color: C.teal,
            }}
          >
            {takenCount}/{reminders.length}
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.muted }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(takenCount / Math.max(reminders.length, 1)) * 100}%`,
              background: C.teal,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: "17px",
            color: C.textSecond,
            marginTop: "10px",
            lineHeight: "1.5",
          }}
        >
          {reminders.length === 0
            ? "No reminders yet. Your pharmacist can add medication reminders for you."
            : takenCount === reminders.length
              ? t("medications.allDosesTaken")
              : `${reminders.length - takenCount} ${reminders.length - takenCount === 1 ? t("medications.doseRemaining") : t("medications.dosesRemaining")}`}
        </p>
      </div>

      <div>
        <p
          style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 700,
            color: C.textDisabled,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          {t("medications.todaysSchedule")}
        </p>
        <div className="bg-white rounded-xl px-4" style={{ border: `1px solid ${C.border}` }}>
          <div className="overflow-y-auto" style={{ maxHeight: "min(50vh, 460px)" }}>
            {reminders.length === 0 ? (
              <div
                className="py-10 text-center"
                style={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: "15px",
                  color: C.textSecond,
                }}
              >
                No reminders scheduled yet.
              </div>
            ) : (
              reminders.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  onToggle={() => void toggleReminder(reminder.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
