import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";

const LOCAL_USERS_KEY = "pilly-local-users";
const LOCAL_PATIENTS_KEY = "pilly-local-patients";
const LANGUAGE_ONBOARDING_KEY = "pilly-language-onboarding";
const SUPABASE_PROFILE_TABLES = [
  { name: "user_profiles", storesFullName: true },
  { name: "profiles", storesFullName: false },
];

function normalizeEmail(email) {
  return email.trim().toLowerCase();
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

function getLanguageOnboardingMap() {
  return readJson(LANGUAGE_ONBOARDING_KEY, {});
}

function setLanguageOnboardingForEmail(email, shouldShow) {
  const map = getLanguageOnboardingMap();
  const key = normalizeEmail(email);

  if (shouldShow) {
    map[key] = true;
  } else {
    delete map[key];
  }

  writeJson(LANGUAGE_ONBOARDING_KEY, map);
}

function getLocalUsers() {
  return readJson(LOCAL_USERS_KEY, {});
}

function saveLocalUser(user) {
  const users = getLocalUsers();
  users[normalizeEmail(user.email)] = user;
  writeJson(LOCAL_USERS_KEY, users);
}

function getLocalUser(email) {
  const users = getLocalUsers();
  return users[normalizeEmail(email)] ?? null;
}

function getLocalPatients() {
  return readJson(LOCAL_PATIENTS_KEY, []);
}

function saveLocalPatients(patients) {
  writeJson(LOCAL_PATIENTS_KEY, patients);
}

function createLocalPatientRecord(name) {
  const patients = getLocalPatients();
  const nextIndex = patients.length + 1;
  const patientId = `LP${String(nextIndex).padStart(3, "0")}`;

  patients.push({
    id: patientId,
    queueNo: `C${String(200 + nextIndex).padStart(3, "0")}`,
    name,
    nric: null,
    urgency: "C",
    status: "pending",
    waitMin: 0,
    time: "Just now",
    medications: [],
  });

  saveLocalPatients(patients);
  return patientId;
}

function clearStoredSession() {
  localStorage.removeItem("pilly-user-id");
  localStorage.removeItem("pilly-user-email");
  localStorage.removeItem("pilly-user-name");
  localStorage.removeItem("pilly-user-role");
  localStorage.removeItem("pilly-patient-id");
}

function saveLocalSession({ userId = null, email, name, role, patientId = null }) {
  localStorage.setItem("pilly-user-email", email);
  localStorage.setItem("pilly-user-name", name);
  localStorage.setItem("pilly-user-role", role);

  if (userId) {
    localStorage.setItem("pilly-user-id", userId);
  } else {
    localStorage.removeItem("pilly-user-id");
  }

  if (role === "patient" && patientId) {
    localStorage.setItem("pilly-patient-id", patientId);
  } else {
    localStorage.removeItem("pilly-patient-id");
  }
}

export function getStoredSession() {
  return {
    userId: localStorage.getItem("pilly-user-id"),
    email: localStorage.getItem("pilly-user-email"),
    name: localStorage.getItem("pilly-user-name"),
    role: localStorage.getItem("pilly-user-role"),
    patientId: localStorage.getItem("pilly-patient-id"),
  };
}

function isMeaninglessAuthMessage(message) {
  if (typeof message !== "string") return true;

  const trimmed = message.trim();
  return !trimmed || trimmed === "[object Object]";
}

function extractAuthErrorMessage(error, seen = new WeakSet()) {
  if (!error) return "";

  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    const directMessage =
      typeof error.message === "string" ? error.message.trim() : "";

    if (!isMeaninglessAuthMessage(directMessage)) {
      return directMessage;
    }

    return extractAuthErrorMessage(error.cause, seen);
  }

  if (typeof error !== "object") {
    return String(error).trim();
  }

  if (seen.has(error)) {
    return "";
  }

  seen.add(error);

  const candidateKeys = [
    "message",
    "msg",
    "error_description",
    "description",
    "details",
    "hint",
    "error",
  ];

  for (const key of candidateKeys) {
    const value = error[key];

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!isMeaninglessAuthMessage(trimmed)) {
        return trimmed;
      }
      continue;
    }

    if (value && typeof value === "object") {
      const nestedMessage = extractAuthErrorMessage(value, seen);
      if (!isMeaninglessAuthMessage(nestedMessage)) {
        return nestedMessage;
      }
    }
  }

  return extractAuthErrorMessage(error.cause, seen);
}

function formatAuthError(error, fallbackMessage) {
  const message = extractAuthErrorMessage(error);

  if (!message) return fallbackMessage;

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (normalizedMessage.includes("email not confirmed")) {
    return "Please confirm your email first, then sign in again.";
  }
  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("duplicate key value")
  ) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (
    normalizedMessage.includes("database error saving new user") ||
    normalizedMessage.includes("user_profiles") ||
    normalizedMessage.includes("profiles")
  ) {
    return "Supabase profile table is missing or incomplete. Run the SQL setup in backend/db/table.sql.";
  }
  return message;
}

function shouldFallbackToAlternateProfileTable(error) {
  const message = extractAuthErrorMessage(error).toLowerCase();

  return (
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("column") ||
    message.includes("full_name") ||
    message.includes("user_profiles") ||
    message.includes("profiles")
  );
}

function normalizeSupabaseProfile(row, tableConfig) {
  if (!row) return null;

  return {
    id: row.id ?? null,
    email: row.email ?? null,
    full_name: row.full_name ?? row.name ?? null,
    role: row.role ?? null,
    patient_id: row.patient_id ?? null,
    _tableName: tableConfig.name,
    _storesFullName: tableConfig.storesFullName,
  };
}

async function fetchSupabaseProfile(userId) {
  let lastError = null;

  for (const tableConfig of SUPABASE_PROFILE_TABLES) {
    const { data, error } = await supabase
      .from(tableConfig.name)
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error) {
      if (data) {
        return normalizeSupabaseProfile(data, tableConfig);
      }

      continue;
    }

    if (!shouldFallbackToAlternateProfileTable(error)) {
      throw error;
    }

    lastError = error;
  }

  if (lastError) throw lastError;
  return null;
}

function getUserRole(user, fallbackRole = "patient") {
  const rawRole =
    user?.user_metadata?.role ||
    user?.raw_user_meta_data?.role ||
    fallbackRole;

  return rawRole === "pharmacist" ? "pharmacist" : "patient";
}

function getUserName(user, fallbackEmail) {
  const rawName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.raw_user_meta_data?.full_name ||
    user?.raw_user_meta_data?.name;

  if (typeof rawName === "string" && rawName.trim()) {
    return rawName.trim();
  }

  return fallbackEmail.split("@")[0];
}

async function createSupabasePatientRecord(name) {
  const { data, error } = await supabase
    .from("patients")
    .insert({
      name,
      urgency: "C",
      status: "pending",
      wait_min: 0,
      elapsed_label: "Just now",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function updateSupabaseProfilePatientLink(profile, patientId) {
  const tableName = profile?._tableName || SUPABASE_PROFILE_TABLES[0].name;
  const { data, error } = await supabase
    .from(tableName)
    .update({ patient_id: patientId })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error) throw error;

  return normalizeSupabaseProfile(data, {
    name: tableName,
    storesFullName: Boolean(profile?._storesFullName),
  });
}

async function createSupabaseProfile({ user, email, name, role }) {
  let lastError = null;

  for (const tableConfig of SUPABASE_PROFILE_TABLES) {
    const payload = {
      id: user.id,
      email,
      role,
    };

    if (tableConfig.storesFullName) {
      payload.full_name = name;
    }

    const { data, error } = await supabase
      .from(tableConfig.name)
      .upsert(payload, {
        onConflict: "id",
      })
      .select("*")
      .single();

    if (error) {
      if (!shouldFallbackToAlternateProfileTable(error)) {
        throw error;
      }

      lastError = error;
      continue;
    }

    const profile = normalizeSupabaseProfile(data, tableConfig);

    if (role !== "patient" || profile?.patient_id) {
      return profile;
    }

    const patientId = await createSupabasePatientRecord(name);
    return updateSupabaseProfilePatientLink(profile, patientId);
  }

  if (lastError) throw lastError;
  throw new Error("Supabase profile table is missing or incomplete.");
}

async function ensureSupabaseProfile({ user, email, name, role }) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const profile = await fetchSupabaseProfile(user.id);

    if (profile) {
      if (role !== "patient" || profile.patient_id) {
        return profile;
      }

      const patientId = await createSupabasePatientRecord(name);
      return updateSupabaseProfilePatientLink(profile, patientId);
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 150 * (attempt + 1));
    });
  }

  try {
    return await createSupabaseProfile({ user, email, name, role });
  } catch (error) {
    const profile = await fetchSupabaseProfile(user.id);
    if (profile) return profile;
    throw error;
  }
}

export async function loginWithEmail({ email, password, expectedRole = null }) {
  const cleanEmail = normalizeEmail(email);

  if (!hasSupabaseConfig || !supabase) {
    const localUser = getLocalUser(cleanEmail);

    if (!localUser || localUser.password !== password) {
      throw new Error("Incorrect email or password. Please try again.");
    }

    if (expectedRole && localUser.role !== expectedRole) {
      throw new Error(
        `This account is registered as a ${localUser.role}. Please switch to the ${localUser.role} login tab.`
      );
    }

    saveLocalSession({
      userId: localUser.id,
      email: localUser.email,
      name: localUser.name,
      role: localUser.role,
      patientId: localUser.patientId,
    });

    return { role: localUser.role };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) throw error;
    if (!data.user) {
      throw new Error("Unable to sign in right now. Please try again.");
    }

    const role = getUserRole(data.user);
    const name = getUserName(data.user, cleanEmail);
    const profile = await ensureSupabaseProfile({
      user: data.user,
      email: cleanEmail,
      name,
      role,
    });

    saveLocalSession({
      userId: data.user.id,
      email: profile?.email ?? cleanEmail,
      name: profile?.full_name ?? name,
      role: profile?.role ?? role,
      patientId: profile?.patient_id ?? null,
    });

    const resolvedRole = profile?.role ?? role;

    if (expectedRole && resolvedRole !== expectedRole) {
      await supabase.auth.signOut().catch(() => {});
      clearStoredSession();
      throw new Error(
        `This account is registered as a ${resolvedRole}. Please switch to the ${resolvedRole} login tab.`
      );
    }

    return { role: resolvedRole };
  } catch (error) {
    throw new Error(
      formatAuthError(
        error,
        "Unable to sign in. Please check your email and password."
      ),
      { cause: error }
    );
  }
}

export async function registerWithEmail({ name, email, password, role }) {
  const cleanName = name.trim();
  const cleanEmail = normalizeEmail(email);

  if (!cleanName) {
    throw new Error("Please enter your name before creating an account.");
  }

  if (!hasSupabaseConfig || !supabase) {
    if (getLocalUser(cleanEmail)) {
      throw new Error("An account with this email already exists.");
    }

    const patientId = role === "patient" ? createLocalPatientRecord(cleanName) : null;
    const localUser = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      name: cleanName,
      password,
      role,
      patientId,
    };

    saveLocalUser(localUser);
    saveLocalSession({
      userId: localUser.id,
      email: localUser.email,
      name: localUser.name,
      role: localUser.role,
      patientId: localUser.patientId,
    });

    if (role === "patient") {
      setLanguageOnboardingForEmail(cleanEmail, true);
    }

    return { role, requiresEmailConfirmation: false };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          role,
        },
      },
    });

    if (error) throw error;
    if (!data.user) {
      throw new Error("Account creation did not complete. Please try again.");
    }

    if (role === "patient") {
      setLanguageOnboardingForEmail(cleanEmail, true);
    }

    if (!data.session) {
      return {
        role,
        requiresEmailConfirmation: true,
      };
    }

    const profile = await ensureSupabaseProfile({
      user: data.user,
      email: cleanEmail,
      name: cleanName,
      role,
    });

    saveLocalSession({
      userId: data.user.id,
      email: profile?.email ?? cleanEmail,
      name: profile?.full_name ?? cleanName,
      role: profile?.role ?? role,
      patientId: profile?.patient_id ?? null,
    });

    return {
      role: profile?.role ?? role,
      requiresEmailConfirmation: false,
    };
  } catch (error) {
    throw new Error(
      formatAuthError(
        error,
        "Unable to create account. Please try another email or password."
      ),
      { cause: error }
    );
  }
}

export async function syncStoredSessionFromSupabase() {
  const storedSession = getStoredSession();

  if (!hasSupabaseConfig || !supabase) {
    return storedSession;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return storedSession;
  }

  const resolvedEmail = normalizeEmail(
    data.user.email || storedSession.email || "user@example.com"
  );
  const resolvedRole = getUserRole(data.user, storedSession.role || "patient");
  const resolvedName = getUserName(data.user, resolvedEmail);

  let profile = null;
  try {
    profile = await ensureSupabaseProfile({
      user: data.user,
      email: resolvedEmail,
      name: resolvedName,
      role: resolvedRole,
    });
  } catch {
    profile = null;
  }

  const nextSession = {
    userId: data.user.id,
    email: profile?.email ?? resolvedEmail,
    name: profile?.full_name ?? storedSession.name ?? resolvedName,
    role: profile?.role ?? resolvedRole,
    patientId: profile?.patient_id ?? null,
  };

  saveLocalSession(nextSession);
  return nextSession;
}

export function shouldShowLanguageOnboarding(email) {
  if (!email) return false;
  const map = getLanguageOnboardingMap();
  return Boolean(map[normalizeEmail(email)]);
}

export function clearLanguageOnboarding(email) {
  if (!email) return;
  setLanguageOnboardingForEmail(email, false);
}

export async function logout() {
  if (hasSupabaseConfig && supabase) {
    await supabase.auth.signOut().catch(() => {});
  }

  clearStoredSession();
}
