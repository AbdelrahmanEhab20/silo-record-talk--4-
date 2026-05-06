const API_BASE =
  /** @type {any} */ (import.meta)?.env?.VITE_API_BASE_URL || "http://localhost:5000/api";
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
  const requestHeaders = { ...headers };
  if (!(body instanceof FormData)) requestHeaders["Content-Type"] = "application/json";
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const err = /** @type {any} */ (new Error(data?.error?.message || `Request failed ${response.status}`));
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}
