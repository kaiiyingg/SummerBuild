import { PATIENT_DETAILS } from "../data/patientData";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";

function toStatusKey(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function fromSupabasePatient(row) {
  const medications = row.patient_medications ?? [];

  return {
    id: row.id,
    queueNo: row.queue_no,
    name: row.name,
    nric: row.nric,
    urgency: row.urgency,
    status: row.status,
    waitMin: row.wait_min ?? 0,
    time: row.elapsed_label ?? "Just now",
    meds: medications.length || row.medication_count || 0,
    medications: medications.map((med) => ({
      id: med.id,
      name: med.name,
      quantity: med.quantity,
      verified: med.verified,
    })),
  };
}

function mockPatients() {
  return PATIENT_DETAILS.map((patient) => ({
    ...patient,
    status:
      localStorage.getItem(`patient-status-${patient.id}`) ??
      toStatusKey(patient.status),
    waitMin: patient.waitMin ?? 0,
    time: patient.time ?? "Just now",
    meds: patient.medications.length,
    medications: patient.medications.map((med) => ({
      ...med,
      verified: Boolean(
        JSON.parse(localStorage.getItem(`verified-meds-${patient.id}`) || "{}")[
          med.id
        ]
      ),
    })),
  }));
}

export async function fetchPatients() {
  if (!hasSupabaseConfig || !supabase) return mockPatients();

  const { data, error } = await supabase
    .from("patients")
    .select("*, patient_medications(id)")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Supabase patients fallback:", error.message);
    return mockPatients();
  }

  return data.map(fromSupabasePatient);
}

export async function fetchPatientDetails(patientId) {
  if (!hasSupabaseConfig || !supabase) {
    return mockPatients().find((patient) => patient.id === patientId) ?? null;
  }

  const { data, error } = await supabase
    .from("patients")
    .select("*, patient_medications(*)")
    .eq("id", patientId)
    .single();

  if (error) {
    console.warn("Supabase patient fallback:", error.message);
    return mockPatients().find((patient) => patient.id === patientId) ?? null;
  }

  return fromSupabasePatient(data);
}

export function getCurrentPatientId() {
  return localStorage.getItem("pilly-patient-id") || "P001";
}

export async function fetchCurrentPatientDetails() {
  return fetchPatientDetails(getCurrentPatientId());
}

export async function setMedicationVerified(patientId, medicationId, verified) {
  if (!hasSupabaseConfig || !supabase) {
    const saved = JSON.parse(localStorage.getItem(`verified-meds-${patientId}`) || "{}");
    saved[medicationId] = verified;
    localStorage.setItem(`verified-meds-${patientId}`, JSON.stringify(saved));
    return;
  }

  const { error } = await supabase
    .from("patient_medications")
    .update({ verified })
    .eq("id", medicationId);

  if (error) throw error;
}

export async function setPatientStatus(patientId, status) {
  if (!hasSupabaseConfig || !supabase) {
    localStorage.setItem(`patient-status-${patientId}`, status);
    return;
  }

  const { error } = await supabase
    .from("patients")
    .update({ status })
    .eq("id", patientId);

  if (error) throw error;
}

export async function addHoldReason(patientId, reason) {
  if (!hasSupabaseConfig || !supabase) {
    localStorage.setItem(`hold-reason-${patientId}`, reason);
    localStorage.setItem(`patient-status-${patientId}`, "on_hold");
    return;
  }

  const { error: holdError } = await supabase
    .from("hold_reasons")
    .insert({ patient_id: patientId, reason });
  if (holdError) throw holdError;

  await setPatientStatus(patientId, "on_hold");
}

export function subscribeToPatientChanges(onChange) {
  if (!hasSupabaseConfig || !supabase) return () => {};

  try {
    const channel = supabase
      .channel(`pharmacy-patients-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        onChange
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_medications" },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.warn("Supabase patient realtime disabled:", error);
    return () => {};
  }
}

const MOCK_REMINDERS = [
  { id: 1, patient_id: "P001", medication_name: "Metformin 500mg", reminder_time: "8:00 AM", taken: true },
  { id: 2, patient_id: "P001", medication_name: "Lisinopril 10mg", reminder_time: "9:00 AM", taken: true },
  { id: 3, patient_id: "P001", medication_name: "Metformin 500mg", reminder_time: "8:00 PM", taken: false },
  { id: 4, patient_id: "P001", medication_name: "Atorvastatin 20mg", reminder_time: "10:00 PM", taken: false },
];

function fromSupabaseReminder(row) {
  return {
    id: row.id,
    name: row.medication_name,
    time: row.reminder_time,
    taken: row.taken,
  };
}

export async function fetchPatientReminders(patientId = getCurrentPatientId()) {
  if (!hasSupabaseConfig || !supabase) {
    return MOCK_REMINDERS.filter((reminder) => reminder.patient_id === patientId).map(fromSupabaseReminder);
  }

  const { data, error } = await supabase
    .from("patient_reminders")
    .select("*")
    .eq("patient_id", patientId)
    .order("id", { ascending: true });

  if (error) {
    console.warn("Supabase reminders fallback:", error.message);
    return MOCK_REMINDERS.filter((reminder) => reminder.patient_id === patientId).map(fromSupabaseReminder);
  }

  return data.map(fromSupabaseReminder);
}

export async function addPatientReminder({ patientId = getCurrentPatientId(), name, time }) {
  if (!hasSupabaseConfig || !supabase) return null;

  const { data, error } = await supabase
    .from("patient_reminders")
    .insert({ patient_id: patientId, medication_name: name, reminder_time: time, taken: false })
    .select()
    .single();

  if (error) throw error;
  return fromSupabaseReminder(data);
}

export async function setPatientReminderTaken(reminderId, taken) {
  if (!hasSupabaseConfig || !supabase) return;

  const { error } = await supabase
    .from("patient_reminders")
    .update({ taken })
    .eq("id", reminderId);

  if (error) throw error;
}

export function subscribeToReminderChanges(onChange) {
  if (!hasSupabaseConfig || !supabase) return () => {};

  try {
    const channel = supabase
      .channel(`patient-reminders-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_reminders" },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.warn("Supabase reminder realtime disabled:", error);
    return () => {};
  }
}
