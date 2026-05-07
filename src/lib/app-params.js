const env = /** @type {any} */ (import.meta)?.env || {};
const rawApiBase = String(env.VITE_API_BASE_URL || "").trim();
const isDev = Boolean(env.DEV);

if (!rawApiBase && !isDev) {
  throw new Error(
    "Missing VITE_API_BASE_URL in production build. Set it in Vercel project env and redeploy."
  );
}

export const appParams = {
  apiBaseUrl: (rawApiBase || "http://localhost:5000/api").replace(/\/+$/, "")
};
