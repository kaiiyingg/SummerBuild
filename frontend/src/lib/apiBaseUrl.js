const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

const hasWindow = typeof window !== "undefined";
const host = hasWindow ? window.location.hostname : "";
const isLocalHost = host === "localhost" || host === "127.0.0.1";

export const API_BASE_URL = envBaseUrl
  || (hasWindow ? (isLocalHost ? "http://127.0.0.1:8000" : window.location.origin) : "http://127.0.0.1:8000");

