const rawApiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const fallbackApiBase =
  import.meta.env.DEV || typeof window === "undefined"
    ? "http://localhost:5000/api"
    : `${window.location.origin}/api`;

export const appParams = {
  apiBaseUrl: (rawApiBase || fallbackApiBase).replace(/\/+$/, "")
};
