import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";
import { MicrosoftIntegration } from "../../models/index.js";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "User.Read",
  "Calendars.Read",
  "Calendars.ReadWrite",
];

const authBase = () =>
  `https://login.microsoftonline.com/${encodeURIComponent(config.microsoftTenant || "common")}/oauth2/v2.0`;
const GRAPH_ME = "https://graph.microsoft.com/v1.0/me";

export function ensureConfigured() {
  if (!config.microsoftClientId || !config.microsoftClientSecret || !config.microsoftRedirectUri) {
    throw new Error(
      "Microsoft OAuth is not configured (set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI)"
    );
  }
}

export function buildAuthUrl({ userEmail, returnTo }) {
  ensureConfigured();
  const nonce = crypto.randomBytes(8).toString("hex");
  const state = jwt.sign(
    { sub: userEmail, nonce, returnTo: returnTo || null },
    config.jwtSecret,
    { expiresIn: "10m" }
  );
  const params = new URLSearchParams({
    client_id: config.microsoftClientId,
    response_type: "code",
    redirect_uri: config.microsoftRedirectUri,
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
    prompt: "select_account",
  });
  return { url: `${authBase()}/authorize?${params.toString()}`, state };
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
    const msg = data?.error_description || data?.error || text;
    throw new Error(`Microsoft token endpoint error ${res.status}: ${msg}`);
  }
  return data;
}

export async function exchangeCodeForTokens(code) {
  ensureConfigured();
  return postForm(`${authBase()}/token`, {
    client_id: config.microsoftClientId,
    client_secret: config.microsoftClientSecret,
    redirect_uri: config.microsoftRedirectUri,
    grant_type: "authorization_code",
    code,
    scope: SCOPES.join(" "),
  });
}

export async function refreshAccessToken(refreshToken) {
  ensureConfigured();
  return postForm(`${authBase()}/token`, {
    client_id: config.microsoftClientId,
    client_secret: config.microsoftClientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPES.join(" "),
  });
}

export async function fetchMicrosoftUserInfo(accessToken) {
  const res = await fetch(GRAPH_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph /me error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getValidAccessToken(userEmail) {
  const doc = await MicrosoftIntegration.findOne({ user_email: userEmail }).select(
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
    if (refreshed.refresh_token) doc.refresh_token = refreshed.refresh_token;
    if (refreshed.expires_in) {
      doc.expires_at = new Date(now + refreshed.expires_in * 1000);
    }
    if (refreshed.scope) doc.scope = refreshed.scope;
    doc.last_refreshed_at = new Date();
    await doc.save();
    return doc.access_token;
  } catch (err) {
    console.error("[microsoft] refresh failed:", err.message);
    return null;
  }
}

export async function saveTokensForUser({ userEmail, tokens, profile }) {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;
  const update = {
    ms_user_id: profile?.id || null,
    ms_email: profile?.mail || profile?.userPrincipalName || null,
    ms_display_name: profile?.displayName || null,
    tenant: config.microsoftTenant || "common",
    access_token: tokens.access_token || null,
    token_type: tokens.token_type || null,
    scope: tokens.scope || null,
    expires_at: expiresAt,
    last_refreshed_at: new Date(),
    revoked_at: null,
  };
  if (tokens.refresh_token) update.refresh_token = tokens.refresh_token;
  return MicrosoftIntegration.findOneAndUpdate(
    { user_email: userEmail },
    { $set: update, $setOnInsert: { connected_at: new Date(), user_email: userEmail } },
    { upsert: true, new: true }
  );
}
