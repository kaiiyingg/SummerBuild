const USER_ROLE_KEY = "pilly-user-roles";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getStoredRoles() {
  try {
    return JSON.parse(localStorage.getItem(USER_ROLE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setLocalRole(email, role) {
  const roles = getStoredRoles();
  roles[normalizeEmail(email)] = role;
  localStorage.setItem(USER_ROLE_KEY, JSON.stringify(roles));
}

function getLocalRole(email, fallbackRole) {
  const roles = getStoredRoles();
  return roles[normalizeEmail(email)] || fallbackRole;
}

function saveLocalSession({ email, role, patientId = "P001" }) {
  localStorage.setItem("pilly-user-email", email);
  localStorage.setItem("pilly-user-role", role);

  if (role === "patient") {
    localStorage.setItem("pilly-patient-id", patientId);
  }
}

export async function loginWithEmail({ email, fallbackRole }) {
  const cleanEmail = email.trim();
  const role = getLocalRole(cleanEmail, fallbackRole);

  saveLocalSession({ email: cleanEmail, role });
  return { role };
}

export async function registerWithEmail({ email, role }) {
  const cleanEmail = email.trim();
  const patientId = role === "patient" ? "P001" : null;

  setLocalRole(cleanEmail, role);
  saveLocalSession({ email: cleanEmail, role, patientId: patientId ?? "P001" });

  return { role };
}

export async function logout() {
  localStorage.removeItem("pilly-user-email");
  localStorage.removeItem("pilly-user-role");
}
