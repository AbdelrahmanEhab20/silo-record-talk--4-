const env = /** @type {any} */ (import.meta)?.env || {};
const rawApiBase = String(env.VITE_API_BASE_URL || "").trim();
const isDev = Boolean(env.DEV);
const isBrowser = typeof window !== "undefined";

export function missingApiBaseError() {
  return new Error(
    "Missing VITE_API_BASE_URL in production build. Set it in Vercel project env and redeploy."
  );
}

export function resolveApiBaseUrl() {
  if (rawApiBase) {
    const value = rawApiBase.replace(/\/+$/, "");
    console.info("[api-base] Using VITE_API_BASE_URL", { value });
    return value;
  }
  if (isDev) {
    const fallback = "http://localhost:5000/api";
    console.info("[api-base] Using local dev fallback", { fallback });
    return fallback;
  }
  const err = missingApiBaseError();
  console.error("[api-base] Missing API base in production", {
    hostname: isBrowser ? window.location.hostname : "server",
    hasViteApiBaseUrl: Boolean(rawApiBase),
    mode: isDev ? "development" : "production"
  });
  throw err;
}

export { isDev };
