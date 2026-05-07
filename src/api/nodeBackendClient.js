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

export function setAuthToken(value) {
  token = value || null;
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * @typedef {Object} ApiRequestOptions
 * @property {string=} method
 * @property {any=} body
 * @property {Record<string, string>=} headers
 */

/**
 * @param {string} path
 * @param {ApiRequestOptions=} options
 */
export async function apiRequest(path, { method = "GET", body, headers = {} } = {}) {
  if (!API_BASE && !isDev) {
    throw missingApiBaseError();
  }
  const requestHeaders = { ...headers };
  if (!(body instanceof FormData)) requestHeaders["Content-Type"] = "application/json";
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body)
    });
  } catch (cause) {
    const err = /** @type {any} */ (new Error(`Network error while calling ${API_BASE}${path}. Verify VITE_API_BASE_URL and backend CORS settings.`));
    err.status = 0;
    err.data = null;
    err.cause = cause;
    throw err;
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
    const err = /** @type {any} */ (new Error(message));
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}
