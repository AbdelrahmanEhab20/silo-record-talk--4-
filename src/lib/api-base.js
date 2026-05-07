const env = /** @type {any} */ (import.meta)?.env || {};
const rawApiBase = String(env.VITE_API_BASE_URL || "").trim();
const isDev = Boolean(env.DEV);

export function missingApiBaseError() {
  return new Error(
    "Missing VITE_API_BASE_URL in production build. Set it in Vercel project env and redeploy."
  );
}

export function resolveApiBaseUrl() {
  if (rawApiBase) return rawApiBase.replace(/\/+$/, "");
  if (isDev) return "http://localhost:5000/api";
  throw missingApiBaseError();
}

export { isDev };
