import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../lib/apiBaseUrl";

const FALLBACK_VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

async function getVapidPublicKey() {
  if (FALLBACK_VAPID_PUBLIC_KEY) return FALLBACK_VAPID_PUBLIC_KEY;

  const response = await fetch(`${API_BASE_URL}/api/push/vapid-public-key`);
  if (!response.ok) return "";
  const data = await response.json();
  return data.publicKey || "";
}

async function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js");
}

async function saveSubscription(subscription) {
  if (!hasSupabaseConfig || !supabase || !subscription) return;

  const userId = localStorage.getItem("pilly-user-id");
  const patientId = localStorage.getItem("pilly-patient-id");

  if (!userId || !patientId) return;

  const json = subscription.toJSON();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        patient_id: patientId,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) throw error;
}

export async function ensurePushSubscription() {
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  if (Notification.permission === "denied") {
    return { ok: false, reason: "denied" };
  }

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();

  if (permission !== "granted") {
    return { ok: false, reason: "not_granted" };
  }

  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    return { ok: false, reason: "missing_vapid_key" };
  }

  const registration = await registerServiceWorker();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await saveSubscription(subscription);
  return { ok: true, subscription };
}

export async function syncPushSubscriptionIfAllowed() {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return { ok: false, reason: "not_enabled" };
  }

  try {
    return await ensurePushSubscription();
  } catch (error) {
    console.warn("Unable to sync push subscription:", error);
    return { ok: false, reason: "sync_failed" };
  }
}

export async function sendPatientPushNotification({
  patientId,
  title = "Pilly update",
  body = "Your pharmacy has an update. Tap to view details.",
  url = "/patient",
  type = "pharmacy_update",
}) {
  if (!patientId) return;

  try {
    await fetch(`${API_BASE_URL}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_id: patientId,
        title,
        body,
        url,
        type,
      }),
    });
  } catch (error) {
    console.warn("Unable to send push notification:", error);
  }
}
