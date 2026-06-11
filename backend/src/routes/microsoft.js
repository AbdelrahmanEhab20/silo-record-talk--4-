import express from "express";
import { config } from "../config/index.js";
import { requireAuth, loadDbUser } from "../middleware/auth.js";
import { MicrosoftIntegration } from "../models/index.js";
import {
  buildAuthUrl,
  verifyState,
  exchangeCodeForTokens,
  fetchMicrosoftUserInfo,
  saveTokensForUser,
} from "../services/microsoft/oauth.js";
import { listUpcomingEvents, createEvent } from "../services/microsoft/calendar.js";

const router = express.Router();

function popupResultHtml({ status, message, returnTo }) {
  const payload = JSON.stringify({
    source: "silo-microsoft-oauth",
    status,
    message: message || null,
  });
  const fallback = returnTo || `${config.frontendUrl}/calendar`;
  const safeFallback = JSON.stringify(fallback);
  const title = status === "success" ? "Connected" : "Connection failed";
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .box { text-align: center; max-width: 420px; padding: 24px; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  p { font-size: 14px; color: #a1a1aa; margin: 0; line-height: 1.5; }
</style></head>
<body>
  <div class="box">
    <h1>${status === "success" ? "Outlook connected" : "Outlook connection failed"}</h1>
    <p>${message ? message.replace(/[<>&]/g, "") : "You can close this window."}</p>
  </div>
  <script>
    (function () {
      try { if (window.opener) { window.opener.postMessage(${payload}, "*"); } } catch (e) {}
      setTimeout(function () {
        try { window.close(); } catch (e) {}
        if (!window.closed) { window.location.replace(${safeFallback}); }
      }, 1200);
    })();
  </script>
</body></html>`;
}

router.get("/auth-url", requireAuth, loadDbUser, (req, res) => {
  try {
    const returnTo = typeof req.query.return_to === "string" ? req.query.return_to : null;
    const { url } = buildAuthUrl({ userEmail: req.dbUser.email, returnTo });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get("/callback", async (req, res) => {
  const { code, state, error: oauthError, error_description } = req.query;
  let returnTo = null;
  try {
    if (oauthError) {
      throw new Error(error_description || `Microsoft denied access: ${oauthError}`);
    }
    if (!code || !state) throw new Error("Missing code or state");
    let claims;
    try {
      claims = verifyState(String(state));
    } catch {
      throw new Error("OAuth state is invalid or has expired. Please try again.");
    }
    returnTo = claims.returnTo;
    const tokens = await exchangeCodeForTokens(String(code));
    const profile = await fetchMicrosoftUserInfo(tokens.access_token);
    await saveTokensForUser({ userEmail: claims.sub, tokens, profile });
    res.type("html").send(popupResultHtml({ status: "success", returnTo }));
  } catch (err) {
    console.error("[microsoft] callback failed:", err.message);
    res.type("html").send(popupResultHtml({ status: "error", message: err.message, returnTo }));
  }
});

router.get("/status", requireAuth, loadDbUser, async (req, res) => {
  const doc = await MicrosoftIntegration.findOne({ user_email: req.dbUser.email }).lean();
  if (!doc || doc.revoked_at) return res.json({ connected: false });
  res.json({
    connected: true,
    ms_email: doc.ms_email,
    display_name: doc.ms_display_name,
    connected_at: doc.connected_at,
    last_sync_at: doc.last_sync_at,
    scope: doc.scope,
  });
});

router.get("/calendar/events", requireAuth, loadDbUser, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(60, Number(req.query.days) || 14));
    const events = await listUpcomingEvents(req.dbUser.email, { daysAhead: days });
    await MicrosoftIntegration.updateOne(
      { user_email: req.dbUser.email },
      { $set: { last_sync_at: new Date() } }
    );
    res.json({ connected: true, events });
  } catch (err) {
    if (err.code === "not_connected") {
      return res.json({ connected: false, events: [], error: "not_connected" });
    }
    console.error("[microsoft] list events failed:", err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post("/calendar/events", requireAuth, loadDbUser, async (req, res) => {
  try {
    const event = req.body?.event || req.body;
    const created = await createEvent(req.dbUser.email, event);
    res.json({ event: created });
  } catch (err) {
    if (err.code === "not_connected") {
      return res.json({ connected: false, error: "not_connected" });
    }
    console.error("[microsoft] create event failed:", err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post("/disconnect", requireAuth, loadDbUser, async (req, res) => {
  const doc = await MicrosoftIntegration.findOne({ user_email: req.dbUser.email });
  if (!doc) return res.json({ disconnected: true });
  doc.access_token = null;
  doc.refresh_token = null;
  doc.expires_at = null;
  doc.revoked_at = new Date();
  await doc.save();
  res.json({ disconnected: true });
});

export default router;
