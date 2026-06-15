import { PATIENT_DETAILS } from "../data/patientData";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";
import { syncStoredSessionFromSupabase } from "./authService";
import { sendPatientPushNotification } from "./pushNotifications";

const LOCAL_PATIENTS_KEY = "pilly-local-patients";
const LOCAL_REMINDERS_KEY = "pilly-local-reminders";
const LOCAL_NOTIFICATIONS_KEY = "pilly-local-notifications";
const LOCAL_NOTIFICATIONS_EVENT = "pilly-local-notifications-changed";

function toStatusKey(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizePatientStatus(status) {
  const key = toStatusKey(status);
  return key === "pending_packing" ? "pending" : key;
}

function readJson(key, fallbackValue) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallbackValue));
  } catch {
    return fallbackValue;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getLocalPatients() {
  return readJson(LOCAL_PATIENTS_KEY, []);
}

function getLocalReminderOverrides() {
  return readJson(LOCAL_REMINDERS_KEY, []);
}

function saveLocalReminderOverrides(reminders) {
  writeJson(LOCAL_REMINDERS_KEY, reminders);
}

function getLocalNotifications() {
  return readJson(LOCAL_NOTIFICATIONS_KEY, []);
}

function saveLocalNotifications(notifications) {
  writeJson(LOCAL_NOTIFICATIONS_KEY, notifications);
  window.dispatchEvent(new Event(LOCAL_NOTIFICATIONS_EVENT));
}

function filterLocalNotifications(recipientRole, patientId = null) {
  return getLocalNotifications()
    .filter((notification) => {
      if (notification.recipientRole !== recipientRole) return false;
      return recipientRole === "patient"
        ? notification.patientId === patientId
        : true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function fromSupabasePatient(row) {
  const medications = row.patient_medications ?? [];

  return {
    id: row.id,
    queueNo: row.queue_no,
    name: row.name,
    nric: row.nric ?? null,
    urgency: row.urgency ?? "C",
    status: row.status ?? "pending",
    waitMin: row.wait_min ?? 0,
    time: row.elapsed_label ?? "Just now",
    meds: medications.length || row.medication_count || 0,
    medications: medications.map((med) => ({
      id: med.id,
      name: med.name,
      quantity: med.quantity,
      purpose: med.purpose ?? null,
      instructions: med.instructions ?? null,
      caution: med.caution ?? null,
      verified: med.verified,
    })),
  };
}

function getLocalPatientsWithSeed() {
  const patientMap = new Map();

  [...PATIENT_DETAILS, ...getLocalPatients()].forEach((patient) => {
    patientMap.set(patient.id, {
      id: patient.id,
      queueNo: patient.queueNo,
      name: patient.name,
      nric: patient.nric ?? null,
      urgency: patient.urgency ?? "C",
      status:
        localStorage.getItem(`patient-status-${patient.id}`) ??
        normalizePatientStatus(patient.status),
      waitMin: patient.waitMin ?? 0,
      time: patient.time ?? "Just now",
      meds: patient.medications?.length ?? 0,
      medications: (patient.medications ?? []).map((med) => ({
        ...med,
        purpose: med.purpose ?? null,
        instructions: med.instructions ?? null,
        caution: med.caution ?? null,
        verified: Boolean(
          JSON.parse(localStorage.getItem(`verified-meds-${patient.id}`) || "{}")[
            med.id
          ]
        ),
      })),
    });
  });

  return [...patientMap.values()];
}

function getFallbackCurrentPatient() {
  const storedName = localStorage.getItem("pilly-user-name") || "Patient";

  return {
    id: null,
    queueNo: "-",
    name: storedName,
    nric: null,
    urgency: "C",
    status: "pending",
    waitMin: 0,
    time: "Just now",
    meds: 0,
    medications: [],
  };
}

export async function fetchPatients() {

  if (!hasSupabaseConfig || !supabase) {
    return getLocalPatientsWithSeed();
  }

  const { data, error } = await supabase
    .from("patients")
    .select("*, patient_medications(id)")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Supabase patients fallback:", error.message);
    return getLocalPatientsWithSeed();
  }

  return data.map(fromSupabasePatient);
}

export async function fetchPatientDetails(patientId) {
  if (!patientId) return null;

  if (!hasSupabaseConfig || !supabase) {
    return getLocalPatientsWithSeed().find((patient) => patient.id === patientId) ?? null;
  }

  const { data, error } = await supabase
    .from("patients")
    .select("*, patient_medications(*)")
    .eq("id", patientId)
    .single();

  if (error) {
    console.warn("Supabase patient fallback:", error.message);
    return getLocalPatientsWithSeed().find((patient) => patient.id === patientId) ?? null;
  }

  return fromSupabasePatient(data);
}

export function getCurrentPatientId() {
  return localStorage.getItem("pilly-patient-id");
}

async function resolveCurrentPatientId() {
  const storedPatientId = getCurrentPatientId();

  if (!hasSupabaseConfig || !supabase) {
    return storedPatientId;
  }

  try {
    const session = await syncStoredSessionFromSupabase();
    return session.patientId ?? storedPatientId;
  } catch (error) {
    console.warn("Supabase patient link fallback:", error);
    return storedPatientId;
  }
}

export async function fetchCurrentPatientDetails() {
  const patientId = await resolveCurrentPatientId();
  if (!patientId) return getFallbackCurrentPatient();
  return (await fetchPatientDetails(patientId)) ?? getFallbackCurrentPatient();
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
  const patient = await fetchPatientDetails(patientId);

  if (!hasSupabaseConfig || !supabase) {
    localStorage.setItem(`hold-reason-${patientId}`, reason);
    localStorage.setItem(`patient-status-${patientId}`, "on_hold");
    try {
      await createNotification({
        recipientRole: "patient",
        patientId,
        type: "medication_on_hold",
        title: "Medication put on hold",
        body: reason,
        metadata: {
          patientName: patient?.name ?? null,
          queueNo: patient?.queueNo ?? null,
        },
      });
    } catch (error) {
      console.warn("Unable to notify patient:", error);
    }
    return;
  }

  const { error: holdError } = await supabase
    .from("hold_reasons")
    .insert({ patient_id: patientId, reason });
  if (holdError) throw holdError;

  await setPatientStatus(patientId, "on_hold");
  try {
    await createNotification({
      recipientRole: "patient",
      patientId,
      type: "medication_on_hold",
      title: "Medication put on hold",
      body: reason,
      metadata: {
        patientName: patient?.name ?? null,
        queueNo: patient?.queueNo ?? null,
      },
    });
  } catch (error) {
    console.warn("Unable to notify patient:", error);
  }
}

function fromSupabaseNotification(row) {
  return {
    id: row.id,
    recipientRole: row.recipient_role,
    patientId: row.patient_id,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata ?? {},
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

function getPushNotificationBody(type, body) {
  if (type === "medication_on_hold") {
    return body;
  }

  return body || "Your pharmacy has an update. Tap to view details.";
}

export async function createNotification({
  recipientRole,
  patientId = null,
  type,
  title,
  body,
  metadata = {},
}) {
  if (!recipientRole || !type || !title || !body) return null;

  if (!hasSupabaseConfig || !supabase) {
    const notification = {
      id: `local-${crypto.randomUUID()}`,
      recipientRole,
      patientId,
      type,
      title,
      body,
      metadata,
      read: false,
      createdAt: new Date().toISOString(),
    };
    saveLocalNotifications([notification, ...getLocalNotifications()]);
    if (recipientRole === "patient" && patientId) {
      await sendPatientPushNotification({
        patientId,
        title,
        body: getPushNotificationBody(type, body),
        url: "/patient/app",
        type,
      });
    }
    return notification;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_role: recipientRole,
      patient_id: patientId,
      type,
      title,
      body,
      metadata,
      read: false,
    })
    .select()
    .single();

  if (error) throw error;
  const notification = fromSupabaseNotification(data);

  if (recipientRole === "patient" && patientId) {
    await sendPatientPushNotification({
      patientId,
      title,
      body: getPushNotificationBody(type, body),
      url: "/patient/app",
      type,
    });
  }

  return notification;
}

export async function fetchNotifications({ recipientRole, patientId = null } = {}) {
  if (!recipientRole) return [];

  if (!hasSupabaseConfig || !supabase) {
    return filterLocalNotifications(recipientRole, patientId);
  }

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_role", recipientRole)
    .order("created_at", { ascending: false });

  if (recipientRole === "patient") {
    query = query.eq("patient_id", patientId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("Supabase notifications fallback:", error.message);
    return filterLocalNotifications(recipientRole, patientId);
  }

  return data.map(fromSupabaseNotification);
}

export async function markNotificationsRead(notificationIds) {
  if (!notificationIds?.length) return;

  if (!hasSupabaseConfig || !supabase) {
    const idSet = new Set(notificationIds.map(String));
    saveLocalNotifications(
      getLocalNotifications().map((notification) =>
        idSet.has(String(notification.id))
          ? { ...notification, read: true }
          : notification
      )
    );
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", notificationIds);

  if (error) throw error;
}

export function subscribeToNotifications(onChange) {
  if (!hasSupabaseConfig || !supabase) {
    window.addEventListener(LOCAL_NOTIFICATIONS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(LOCAL_NOTIFICATIONS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }

  try {
    const channel = supabase
      .channel(`notifications-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.warn("Supabase notification realtime disabled:", error);
    return () => {};
  }
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
  {
    id: 1,
    patient_id: "P001",
    medication_name: "Metformin 500mg",
    reminder_time: "8:00 AM",
    taken: true,
    created_by_name: "Pharmacy Team",
    created_by_role: "pharmacist",
  },
  {
    id: 2,
    patient_id: "P001",
    medication_name: "Lisinopril 10mg",
    reminder_time: "9:00 AM",
    taken: true,
    created_by_name: "Pharmacy Team",
    created_by_role: "pharmacist",
  },
  {
    id: 3,
    patient_id: "P001",
    medication_name: "Metformin 500mg",
    reminder_time: "8:00 PM",
    taken: false,
    created_by_name: "Pharmacy Team",
    created_by_role: "pharmacist",
  },
  {
    id: 4,
    patient_id: "P001",
    medication_name: "Atorvastatin 20mg",
    reminder_time: "10:00 PM",
    taken: false,
    created_by_name: "Pharmacy Team",
    created_by_role: "pharmacist",
  },
];

function getLocalReminderRows() {
  const reminderMap = new Map();

  MOCK_REMINDERS.forEach((row) => {
    reminderMap.set(String(row.id), row);
  });

  getLocalReminderOverrides().forEach((row) => {
    reminderMap.set(String(row.id), row);
  });

  return [...reminderMap.values()];
}

function fromSupabaseReminder(row) {
  return {
    id: row.id,
    name: row.medication_name,
    time: row.reminder_time,
    taken: row.taken,
    createdByName: row.created_by_name ?? null,
    createdByRole: row.created_by_role ?? null,
  };
}

function getReminderSortValue(time) {
  const match = String(time || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") {
    hour += 12;
  }

  return hour * 60 + Number(match[2]);
}

function sortReminders(reminders) {
  return [...reminders].sort((left, right) => {
    const timeDiff = getReminderSortValue(left.time) - getReminderSortValue(right.time);
    if (timeDiff !== 0) return timeDiff;

    return String(left.id).localeCompare(String(right.id), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export async function fetchPatientReminders(patientId = getCurrentPatientId()) {
  const resolvedPatientId = patientId ?? await resolveCurrentPatientId();

  if (!resolvedPatientId) return [];

  if (!hasSupabaseConfig || !supabase) {
    return sortReminders(
      getLocalReminderRows()
        .filter((reminder) => reminder.patient_id === resolvedPatientId)
        .map(fromSupabaseReminder)
    );
  }

  const { data, error } = await supabase
    .from("patient_reminders")
    .select("*")
    .eq("patient_id", resolvedPatientId)
    .order("id", { ascending: true });

  if (error) {
    console.warn("Supabase reminders fallback:", error.message);
    return sortReminders(
      getLocalReminderRows()
        .filter((reminder) => reminder.patient_id === resolvedPatientId)
        .map(fromSupabaseReminder)
    );
  }

  return sortReminders(data.map(fromSupabaseReminder));
}

export async function addPatientReminder({
  patientId = null,
  name,
  time,
  createdByName = null,
  createdByRole = null,
  createdByUserId = null,
}) {
  const resolvedPatientId = patientId ?? await resolveCurrentPatientId();
  const trimmedName = String(name || "").trim();
  const trimmedTime = String(time || "").trim();

  if (!trimmedName || !trimmedTime) {
    throw new Error("Medication name and reminder time are required.");
  }

  if (!resolvedPatientId) return null;

  if (!hasSupabaseConfig || !supabase) {
    const nextReminder = {
      id: `local-${crypto.randomUUID()}`,
      patient_id: resolvedPatientId,
      medication_name: trimmedName,
      reminder_time: trimmedTime,
      taken: false,
      created_by_name: createdByName,
      created_by_role: createdByRole,
      created_by_user_id: createdByUserId,
    };

    saveLocalReminderOverrides([
      ...getLocalReminderOverrides(),
      nextReminder,
    ]);

    return fromSupabaseReminder(nextReminder);
  }

  const { data, error } = await supabase
    .from("patient_reminders")
    .insert({
      patient_id: resolvedPatientId,
      medication_name: trimmedName,
      reminder_time: trimmedTime,
      taken: false,
      created_by_name: createdByName,
      created_by_role: createdByRole,
      created_by_user_id: createdByUserId,
    })
    .select()
    .single();

  if (error) throw error;
  return fromSupabaseReminder(data);
}

export async function setPatientReminderTaken(reminderId, taken) {
  if (!hasSupabaseConfig || !supabase) {
    const reminderKey = String(reminderId);
    const baseReminder = getLocalReminderRows().find(
      (reminder) => String(reminder.id) === reminderKey
    );

    if (!baseReminder) return;

    const overrides = getLocalReminderOverrides().filter(
      (reminder) => String(reminder.id) !== reminderKey
    );
    overrides.push({
      ...baseReminder,
      taken,
    });
    saveLocalReminderOverrides(overrides);
    return;
  }

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
