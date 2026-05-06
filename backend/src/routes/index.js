import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { config } from "../config/index.js";
import { requireAuth } from "../middleware/auth.js";
import { entityModels, Job, User } from "../models/index.js";
import { functionHandlers } from "../services/functionHandlers.js";

const router = express.Router();
const upload = multer();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "silo-backend" });
});

router.get("/auth/session", (req, res) => {
  res.json({ authenticated: !!req.user?.email });
});

router.post("/auth/dev-login", async (req, res) => {
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

  const token = jwt.sign({ email: user.email }, config.jwtSecret, { expiresIn: "7d" });
  return res.json({
    token,
    user: {
      email: user.email,
      full_name: user.full_name || "",
      plan: user.plan || "free"
    }
  });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ email: req.user.email });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

router.get("/app/public-settings", (_req, res) => {
  res.json({ id: "silo", public_settings: { app_name: "Silo" } });
});

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
  if (req.body?.async === true) {
    const job = await Job.create({ type: req.params.name, payload: req.body });
    return res.json({ data: { queued: true, job_id: job.id } });
  }
  const result = await handler(req.body || {});
  return res.json(result);
});

router.post("/integrations/core/upload-file", requireAuth, upload.single("file"), async (req, res) => {
  const fakeUrl = req.file ? `https://files.silo.local/${Date.now()}-${req.file.originalname}` : "";
  res.json({ file_url: fakeUrl });
});

router.post("/integrations/core/invoke-llm", requireAuth, async (_req, res) => {
  res.json({ text: "" });
});

router.post("/webhooks/stripe", async (req, res) => {
  const handler = functionHandlers.stripeWebhook;
  if (handler) await handler(req.body || {});
  res.json({ received: true });
});

export default router;
