import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { config } from "../config/index.js";
import { normalizeRole, requireAuth } from "../middleware/auth.js";
import { entityModels, Invite, Job, User } from "../models/index.js";
import { functionHandlers } from "../services/functionHandlers.js";
import { getPublicSettings } from "../services/deploymentSettings.js";
import { findInviteByToken } from "../lib/findInviteByToken.js";
import adminRoutes from "./admin.js";
import googleRoutes from "./google.js";
import { filesRouter, buildFileUrl } from "./files.js";
import { storeAudioBuffer } from "../services/storage/gridfs.js";
import { getMinutesUsedForEmail } from "../services/usageMinutes.js";
import { getTranscriptionJob } from "../services/transcription/assemblyai.js";
import { completeSessionFromAssemblyJob } from "../services/functionHandlers.js";
import { Session } from "../models/index.js";

const router = express.Router();

function syncUsageForSession(doc) {
  const email = doc?.user_email;
  if (!email) return;
  getMinutesUsedForEmail(email).catch((err) => {
    console.error("[usage] sync failed:", err.message);
  });
}

function serializeAuthUser(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    email: doc.email,
    full_name: doc.full_name || "",
    plan: doc.plan || "free",
    role: normalizeRole(doc.role),
    status: doc.status || "active",
    minutes_balance: doc.minutes_balance ?? 0,
    credits_balance: doc.credits_balance ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
const upload = multer();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "silo-backend" });
});

router.get("/auth/session", (req, res) => {
  res.json({ authenticated: !!req.user?.email });
});

router.post("/auth/dev-login", async (req, res) => {
  if (config.nodeEnv === "production") {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } });
  }
  const email = req.body?.email;
  if (!email) return res.status(400).json({ error: { message: "email is required" } });
  const token = jwt.sign({ email }, config.jwtSecret, { expiresIn: "7d" });
  res.json({ token, user: { email } });
});

router.post("/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Email and password are required" } });
  }

  const user = await User.findOne({ email }).select("+password_hash").lean();
  if (!user?.password_hash) {
    return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
  }

  if (user.status === "disabled") {
    return res.status(403).json({ error: { code: "ACCOUNT_DISABLED", message: "Account is disabled" } });
  }
  if (user.status === "invited") {
    return res.status(403).json({
      error: {
        code: "INVITE_PENDING",
        message: "Please accept your invitation before signing in",
      },
    });
  }

  await User.updateOne({ email: user.email }, { $set: { last_active_at: new Date() } });

  const token = jwt.sign({ email: user.email }, config.jwtSecret, { expiresIn: "7d" });
  return res.json({
    token,
    user: serializeAuthUser(user),
  });
});

router.post("/auth/register", (_req, res) => {
  return res.status(403).json({
    error: {
      code: "REGISTRATION_DISABLED",
      message: "Public registration is disabled. Contact your administrator for an invitation.",
    },
  });
});

router.get("/auth/invite-info", async (req, res, next) => {
  try {
    const token = String(req.query?.token || "");
    if (!token) {
      return res.status(400).json({ error: { message: "token is required" } });
    }
    const invite = await findInviteByToken(token);
    if (!invite) {
      return res.status(404).json({ error: { message: "Invitation is invalid or has expired" } });
    }
    const public_settings = await getPublicSettings();
    res.json({
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
      public_settings,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/accept-invite", async (req, res, next) => {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");
    const fullName = String(req.body?.full_name || "").trim();

    if (!token || !password) {
      return res.status(400).json({ error: { message: "token and password are required" } });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: { message: "Password must be at least 8 characters" } });
    }

    const invite = await findInviteByToken(token);
    if (!invite) {
      return res.status(404).json({ error: { message: "Invitation is invalid or has expired" } });
    }

    const existing = await User.findOne({ email: invite.email }).select("+password_hash").lean();
    if (existing?.status === "active" && existing.password_hash) {
      const match = await bcrypt.compare(password, existing.password_hash);
      if (match) {
        const jwtToken = jwt.sign({ email: existing.email }, config.jwtSecret, { expiresIn: "7d" });
        return res.json({
          token: jwtToken,
          user: serializeAuthUser(existing),
          already_active: true,
        });
      }
      return res.status(409).json({
        error: { message: "This account is already active. Sign in from the login page." },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const setFields = {
      email: invite.email,
      password_hash: passwordHash,
      role: invite.role,
      status: "active",
      last_active_at: new Date(),
    };
    if (fullName) setFields.full_name = fullName;

    const user = await User.findOneAndUpdate(
      { email: invite.email },
      {
        $set: setFields,
        $setOnInsert: {
          plan: "free",
          minutes_balance: 0,
          credits_balance: 0,
        },
      },
      { upsert: true, new: true, select: "-password_hash" }
    ).lean();

    const jwtToken = jwt.sign({ email: user.email }, config.jwtSecret, { expiresIn: "7d" });

    // Respond immediately so slow Render links do not drop the connection before the client reads the body
    res.status(200).json({
      token: jwtToken,
      user: serializeAuthUser(user),
    });

    const now = new Date();
    Promise.all([
      Invite.updateOne({ _id: invite._id }, { $set: { accepted_at: now } }),
      Invite.updateMany(
        { email: invite.email, accepted_at: null, _id: { $ne: invite._id } },
        { $set: { revoked_at: now } }
      ),
    ]).catch((err) => console.error("[accept-invite] invite cleanup failed:", err.message));
  } catch (err) {
    next(err);
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const email = req.user.email;
  const doc = await User.findOne({ email }).lean();
  if (!doc) {
    return res.json({
      email,
      full_name: "",
      plan: "free",
      role: "member",
      status: "active",
      minutes_balance: 0,
      credits_balance: 0,
    });
  }
  if (doc.status === "disabled") {
    return res.status(403).json({ error: { code: "ACCOUNT_DISABLED", message: "Account is disabled" } });
  }
  res.json(serializeAuthUser(doc));
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

router.get("/app/public-settings", async (_req, res) => {
  const public_settings = await getPublicSettings();
  res.json({ id: "silo", public_settings });
});

router.use("/admin", adminRoutes);

router.get("/entities/:entity", requireAuth, async (req, res) => {
  const model = entityModels[req.params.entity];
  if (!model) return res.status(404).json({ error: { message: "Entity not found" } });
  const filter = req.query.filter ? JSON.parse(String(req.query.filter)) : {};
  const data = await model.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  res.json(data);
});

router.post("/entities/:entity", requireAuth, async (req, res) => {
  const model = entityModels[req.params.entity];
  if (!model) return res.status(404).json({ error: { message: "Entity not found" } });
  const doc = await model.create(req.body);
  if (req.params.entity === "Session") syncUsageForSession(doc);
  res.status(201).json(doc);
});

router.get("/entities/:entity/:id", requireAuth, async (req, res) => {
  const model = entityModels[req.params.entity];
  if (!model) return res.status(404).json({ error: { message: "Entity not found" } });
  const data = await model.findById(req.params.id).lean();
  if (!data) return res.status(404).json({ error: { message: "Not found" } });
  res.json(data);
});

router.patch("/entities/:entity/:id", requireAuth, async (req, res) => {
  const model = entityModels[req.params.entity];
  if (!model) return res.status(404).json({ error: { message: "Entity not found" } });
  const data = await model.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (req.params.entity === "Session") syncUsageForSession(data);
  res.json(data);
});

router.delete("/entities/:entity/:id", requireAuth, async (req, res) => {
  const model = entityModels[req.params.entity];
  if (!model) return res.status(404).json({ error: { message: "Entity not found" } });
  await model.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.post("/functions/:name/invoke", requireAuth, async (req, res) => {
  const handler = functionHandlers[req.params.name];
  if (!handler) return res.status(404).json({ error: { message: "Function not found" } });
  try {
    const payload = {
      ...(req.body || {}),
      __userEmail: req.user?.email || null,
    };
    if (req.body?.async === true) {
      const job = await Job.create({ type: req.params.name, payload });
      return res.json({ data: { queued: true, job_id: job.id } });
    }
    const result = await handler(payload);
    return res.json(result);
  } catch (err) {
    console.error(`[function:${req.params.name}] failed:`, err.message);
    return res.status(500).json({ error: { message: err.message || "Function failed" } });
  }
});

router.post("/sessions/:id/check-transcription", requireAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: { message: "Session not found" } });
    if (!session.assemblyai_job_id) {
      return res.json({ status: session.processing_status, has_job: false });
    }
    const job = await getTranscriptionJob(session.assemblyai_job_id);
    if (job.status === "completed" || job.status === "error") {
      await completeSessionFromAssemblyJob(req.params.id, job);
    }
    res.json({ status: job.status, assemblyai_job_id: session.assemblyai_job_id });
  } catch (err) {
    console.error("[check-transcription] failed:", err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

router.use("/files", filesRouter);
router.use("/integrations/google", googleRoutes);

router.post(
  "/integrations/core/upload-file",
  requireAuth,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: { message: "file is required" } });
      const stored = await storeAudioBuffer({
        buffer: req.file.buffer,
        filename: req.file.originalname || `upload-${Date.now()}`,
        mimeType: req.file.mimetype,
        userEmail: req.user?.email || null,
      });
      const url = buildFileUrl(req, stored.file_id);
      res.json({
        file_url: url,
        file_id: stored.file_id,
        filename: stored.filename,
        size: stored.length,
        mime_type: req.file.mimetype,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/integrations/core/invoke-llm", requireAuth, async (req, res) => {
  try {
    const { invokeLLM, isLlmAvailable } = await import("../services/llm/index.js");
    if (!isLlmAvailable()) {
      return res.status(503).json({ error: { message: "No LLM provider configured" } });
    }
    const prompt = String(req.body?.prompt || "");
    if (!prompt.trim()) return res.status(400).json({ error: { message: "prompt is required" } });
    const wantsJson = Boolean(req.body?.response_json_schema);
    const result = await invokeLLM({ prompt, json: wantsJson });
    if (wantsJson) {
      return res.json(result ?? {});
    }
    return res.json(typeof result === "string" ? result : String(result ?? ""));
  } catch (err) {
    console.error("[invoke-llm] failed:", err.message);
    return res.status(500).json({ error: { message: err.message || "LLM call failed" } });
  }
});

router.post("/webhooks/stripe", async (req, res) => {
  const handler = functionHandlers.stripeWebhook;
  if (handler) await handler(req.body || {});
  res.json({ received: true });
});

export default router;
