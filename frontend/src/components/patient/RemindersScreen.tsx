import { useEffect, useState } from "react";
import { Clock, PencilLine, X } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import {
  formatReminderSlot,
  getMedicationRecommendation,
  parseReminderTimeParts,
  ReminderTimePreview,
  ReminderTimeSelector,
  toTimeInputValue,
} from "../reminders/ReminderTimingTools";
import {
  fetchPatientReminders,
  setPatientReminderTaken,
  subscribeToReminderChanges,
  updatePatientReminderTime,
} from "../../services/pharmacyData";

const C = {
  teal: "#45C5BC",
  tealDark: "#38B2A9",
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

function getReminderSortValue(time: string) {
  return toTimeInputValue(time)
    .split(":")
    .map(Number)
    .reduce((total, value, index) => total + value * (index === 0 ? 60 : 1), 0);
}

function sortReminders(reminders: Reminder[]) {
  return [...reminders].sort((left, right) => {
    const timeDiff = getReminderSortValue(left.time) - getReminderSortValue(right.time);
    if (timeDiff !== 0) return timeDiff;

    return String(left.id).localeCompare(String(right.id), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function ReminderRow({
  reminder,
  onEdit,
  onToggle,
}: {
  reminder: Reminder;
  onEdit: () => void;
  onToggle: () => void;
}) {
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
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="flex min-h-[38px] items-center gap-1.5 rounded-full px-3 transition-colors"
          style={{
            border: `1px solid ${C.border}`,
            background: "white",
            color: C.textSecond,
            fontFamily: "'Open Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 700,
          }}
          aria-label={`Edit reminder time for ${reminder.name}`}
        >
          <PencilLine size={14} />
          Edit
        </button>
        <button
          onClick={onToggle}
          className="h-9 w-9 rounded-full border-2 flex items-center justify-center transition-colors"
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
    </div>
  );
}

function EditReminderTimeSheet({
  reminder,
  selectedHour,
  selectedPeriod,
  errorMessage,
  saving,
  onClose,
  onSave,
  onTimeChange,
}: {
  reminder: Reminder;
  selectedHour: string;
  selectedPeriod: string;
  errorMessage: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onTimeChange: (hour: string, period: string) => void;
}) {
  const recommendation = getMedicationRecommendation({ name: reminder.name });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(15, 23, 42, 0.45)" }}
      onClick={saving ? undefined : onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: "88svh", boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: C.border }} />
        </div>

        <div
          className="flex items-start justify-between gap-4 px-6 py-4"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                color: C.textPrimary,
                margin: 0,
              }}
            >
              Update reminder time
            </h2>
            <p
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: "14px",
                color: C.textSecond,
                marginTop: "8px",
                lineHeight: 1.6,
              }}
            >
              Choose the time that works best for you. This only updates your own
              reminder schedule.
            </p>
          </div>
          <button
            onClick={saving ? undefined : onClose}
            className="p-2 rounded-full"
            style={{ background: C.muted }}
            aria-label="Close time editor"
          >
            <X size={18} color={C.textSecond} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div
            className="rounded-2xl p-4"
            style={{ background: C.tealLight, border: `1px solid ${C.border}` }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                color: C.textPrimary,
                margin: 0,
              }}
            >
              {reminder.name}
            </p>
            <p
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: "14px",
                color: C.textSecond,
                marginTop: "6px",
              }}
            >
              Current time: {reminder.time}
            </p>
          </div>

          <ReminderTimeSelector
            recommendation={recommendation}
            selectedHour={selectedHour}
            selectedPeriod={selectedPeriod}
            onSelectTime={onTimeChange}
          />

          <ReminderTimePreview
            medicationName={reminder.name}
            recommendation={recommendation}
            selectedHour={selectedHour}
            selectedPeriod={selectedPeriod}
          />

          {errorMessage && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "14px",
                border: "1px solid #FECACA",
                background: "#FEF2F2",
                color: "#B91C1C",
                fontFamily: "'Open Sans', sans-serif",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {errorMessage}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-2xl px-4 py-3.5"
              style={{
                border: `1px solid ${C.border}`,
                background: "white",
                color: C.textSecond,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 rounded-2xl px-4 py-3.5 text-white"
              style={{
                border: "none",
                background: C.teal,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              {saving ? "Saving..." : "Save time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RemindersScreen() {
  const { t } = useTranslation();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editHour, setEditHour] = useState("8:00");
  const [editPeriod, setEditPeriod] = useState("AM");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const takenCount = reminders.filter((reminder) => reminder.taken).length;

  useEffect(() => {
    const loadReminders = async () => {
      setReminders(await fetchPatientReminders());
    };

    void loadReminders();
    return subscribeToReminderChanges(loadReminders);
  }, []);

  const openEditor = (reminder: Reminder) => {
    const nextTime = parseReminderTimeParts(reminder.time);
    setEditingReminder(reminder);
    setEditHour(nextTime.hour);
    setEditPeriod(nextTime.period);
    setEditError("");
  };

  const closeEditor = () => {
    if (savingEdit) return;
    setEditingReminder(null);
    setEditError("");
  };

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

  const saveEditedTime = async () => {
    if (!editingReminder) return;
    if (!editHour || !editPeriod) {
      setEditError("Please choose a reminder time.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const updatedReminder = await updatePatientReminderTime(
        editingReminder.id,
        formatReminderSlot({ hour: editHour, period: editPeriod })
      );

      if (updatedReminder) {
        setReminders((current) =>
          sortReminders(
            current.map((item) =>
              item.id === editingReminder.id ? { ...item, ...updatedReminder } : item
            )
          )
        );
      }

      setEditingReminder(null);
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "Unable to update the reminder time right now."
      );
    } finally {
      setSavingEdit(false);
    }
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
                  onEdit={() => openEditor(reminder)}
                  onToggle={() => void toggleReminder(reminder.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {editingReminder && (
        <EditReminderTimeSheet
          reminder={editingReminder}
          selectedHour={editHour}
          selectedPeriod={editPeriod}
          errorMessage={editError}
          saving={savingEdit}
          onClose={closeEditor}
          onSave={() => void saveEditedTime()}
          onTimeChange={(hour, period) => {
            setEditHour(hour);
            setEditPeriod(period);
          }}
        />
      )}
    </div>
  );
}
