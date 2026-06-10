import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";
import { GoogleIntegration } from "../../models/index.js";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export function ensureConfigured() {
  if (!config.googleClientId || !config.googleClientSecret || !config.googleRedirectUri) {
    throw new Error(
      "Google OAuth is not configured (set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)"
    );
  }
}

/**
 * Build a Google OAuth consent URL with a signed state token that carries the
 * Silo user identity. State expires after 10 minutes.
 */
export function buildAuthUrl({ userEmail, returnTo }) {
  ensureConfigured();
  const nonce = crypto.randomBytes(8).toString("hex");
  const state = jwt.sign(
    { sub: userEmail, nonce, returnTo: returnTo || null },
    config.jwtSecret,
    { expiresIn: "10m" }
  );
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return { url: `${AUTH_URL}?${params.toString()}`, state };
}

export function verifyState(state) {
  return jwt.verify(state, config.jwtSecret);
}

async function postForm(url, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Google token endpoint error ${res.status}: ${data?.error_description || data?.error || text}`);
  }
  return data;
}

export async function exchangeCodeForTokens(code) {
  ensureConfigured();
  return postForm(TOKEN_URL, {
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: config.googleRedirectUri,
    grant_type: "authorization_code",
  });
}

export async function refreshAccessToken(refreshToken) {
  ensureConfigured();
  return postForm(TOKEN_URL, {
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

export async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google userinfo error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function revokeToken(token) {
  if (!token) return;
  try {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch {
    // best effort
  }
}

/**
 * Get a valid access token for a user, refreshing if expired. Returns null
 * when the user isn't connected or the refresh token has been revoked.
 */
export async function getValidAccessToken(userEmail) {
  const doc = await GoogleIntegration.findOne({ user_email: userEmail }).select(
    "+access_token +refresh_token"
  );
  if (!doc || doc.revoked_at) return null;
  const now = Date.now();
  const expiresAt = doc.expires_at ? doc.expires_at.getTime() : 0;
  if (doc.access_token && expiresAt - 60_000 > now) {
    return doc.access_token;
  }
  if (!doc.refresh_token) return null;
  try {
    const refreshed = await refreshAccessToken(doc.refresh_token);
    doc.access_token = refreshed.access_token;
    if (refreshed.expires_in) {
      doc.expires_at = new Date(now + refreshed.expires_in * 1000);
    }
    if (refreshed.scope) doc.scope = refreshed.scope;
    doc.last_refreshed_at = new Date();
    await doc.save();
    return doc.access_token;
  } catch (err) {
    console.error("[google] token refresh failed:", err.message);
    return null;
  }
}

export async function saveTokensForUser({ userEmail, tokens, googleProfile }) {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;
  const update = {
    google_user_id: googleProfile?.id || null,
    google_email: googleProfile?.email || null,
    access_token: tokens.access_token || null,
    token_type: tokens.token_type || null,
    scope: tokens.scope || null,
    expires_at: expiresAt,
    last_refreshed_at: new Date(),
    revoked_at: null,
  };
  if (tokens.refresh_token) {
    update.refresh_token = tokens.refresh_token;
  }
  return GoogleIntegration.findOneAndUpdate(
    { user_email: userEmail },
    { $set: update, $setOnInsert: { connected_at: new Date(), user_email: userEmail } },
    { upsert: true, new: true }
  );
}
