import { isDev, missingApiBaseError, resolveApiBaseUrl } from "@/lib/api-base";

const API_BASE = resolveApiBaseUrl();
const TOKEN_KEY = "silo_auth_token";

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let token = readToken();

function normalizeIds(value) {
  if (Array.isArray(value)) return value.map(normalizeIds);
  if (!value || typeof value !== "object") return value;
  const out = { ...value };
  if ((out.id === undefined || out.id === null) && out._id !== undefined && out._id !== null) {
    out.id = String(out._id);
  }
  for (const key of Object.keys(out)) out[key] = normalizeIds(out[key]);
  return out;
}

export function setAuthToken(value) {
  token = value || null;
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function hasStoredAuthToken() {
  return Boolean(token || readToken());
}

/**
 * @typedef {Object} ApiRequestOptions
 * @property {string=} method
 * @property {any=} body
 * @property {Record<string, string>=} headers
 * @property {boolean=} skipAuth — do not send stored JWT (public auth flows)
 * @property {number=} timeoutMs — abort after N ms (default 120s for slow Render cold starts)
 */

/**
 * @param {string} path
 * @param {ApiRequestOptions=} options
 */
export async function apiRequest(path, { method = "GET", body, headers = {}, skipAuth = false, timeoutMs = 120000 } = {}) {
  if (!API_BASE && !isDev) {
    throw missingApiBaseError();
  }
  const requestUrl = `${API_BASE}${path}`;
  const requestHeaders = { ...headers };
  if (!(body instanceof FormData)) requestHeaders["Content-Type"] = "application/json";
  const authToken = skipAuth ? null : token || readToken();
  if (authToken) requestHeaders.Authorization = `Bearer ${authToken}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(requestUrl, {
      method,
      headers: requestHeaders,
      credentials: "include",
      signal: controller.signal,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch (cause) {
    console.error("[api-request] Network failure", {
      url: requestUrl,
      method,
      hasAuthToken: Boolean(authToken),
      cause,
    });
    const hint =
      cause?.name === "AbortError"
        ? "Request timed out. The server may be waking up — wait a moment and try again."
        : "Check your connection. If this persists, verify VITE_API_BASE_URL and Render CORS_ORIGINS include your Vercel URL.";
    const err = /** @type {any} */ (new Error(`Network error while calling ${requestUrl}. ${hint}`));
    err.status = 0;
    err.data = null;
    err.cause = cause;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    const message =
      data?.error?.message ||
      (typeof data?.raw === "string" ? data.raw.slice(0, 200) : "") ||
      `Request failed ${response.status}`;
    console.error("[api-request] Backend error response", {
      url: requestUrl,
      method,
      status: response.status,
      message,
      data
    });
    const err = /** @type {any} */ (new Error(message));
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return normalizeIds(data);
}
