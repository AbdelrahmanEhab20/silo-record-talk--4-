import express from "express";
import { config } from "../config/index.js";
import { loadDbUser, requireAuth, requireRole, isSystemAdminRole, normalizeRole } from "../middleware/auth.js";
import { generateInviteToken, hashInviteToken, tokenLookup } from "../lib/inviteToken.js";
import { Invite, User } from "../models/index.js";
import { getDeploymentSettings } from "../services/deploymentSettings.js";
import { sendInviteEmailForUser } from "../services/sendInviteEmail.js";
import { getMinutesUsedForEmail } from "../services/usageMinutes.js";

const router = express.Router();

router.use(requireAuth, loadDbUser, requireRole("org_admin", "system_admin"));

const INVITE_DAYS = 7;

function serializeUser(doc, minutesThisMonth) {
  return {
    id: String(doc._id),
    email: doc.email,
    full_name: doc.full_name || "",
    role: normalizeRole(doc.role),
    status: doc.status || "active",
    plan: doc.plan || "free",
    minutes_this_month: Math.round(minutesThisMonth * 10) / 10,
    last_active_at: doc.last_active_at || doc.updatedAt || doc.createdAt,
    createdAt: doc.createdAt,
  };
}

function canAssignRole(actorRole, targetRole) {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (target === "system_admin" && actor !== "system_admin") return false;
  return true;
}

function canModifyUser(actor, target) {
  const actorRole = normalizeRole(actor.role);
  const targetRole = normalizeRole(target.role);
  if (targetRole === "system_admin" && actorRole !== "system_admin") return false;
  if (String(actor._id) === String(target._id) && targetRole === "system_admin" && actorRole === "system_admin") {
    return true;
  }
  if (String(actor._id) === String(target._id)) return true;
  if (actorRole === "system_admin") return true;
  if (actorRole === "org_admin" && targetRole !== "system_admin") return true;
  return false;
}

router.get("/users", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  const rows = await Promise.all(
    users.map(async (u) => serializeUser(u, await getMinutesUsedForEmail(u.email)))
  );
  res.json({ users: rows });
});

router.get("/usage/summary", async (req, res) => {
  const users = await User.find({ status: { $ne: "disabled" } }).lean();
  const perUser = await Promise.all(
    users.map(async (u) => ({
      email: u.email,
      full_name: u.full_name || "",
      role: normalizeRole(u.role),
      minutes_this_month: Math.round((await getMinutesUsedForEmail(u.email)) * 10) / 10,
    }))
  );
  const orgTotal = perUser.reduce((s, u) => s + u.minutes_this_month, 0);
  res.json({
    period: "current_month",
    org_total_minutes: Math.round(orgTotal * 10) / 10,
    users: perUser.sort((a, b) => b.minutes_this_month - a.minutes_this_month),
  });
});

router.post("/users/invite", async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  let role = String(req.body?.role || "member");
  if (!email) {
    return res.status(400).json({ error: { message: "email is required" } });
  }
  if (!["member", "org_admin", "system_admin"].includes(role)) {
    return res.status(400).json({ error: { message: "Invalid role" } });
  }
  if (!canAssignRole(req.dbUser.role, role)) {
    return res.status(403).json({ error: { message: "Cannot assign this role" } });
  }

  const existing = await User.findOne({ email }).lean();
  if (existing?.status === "active") {
    return res.status(409).json({ error: { message: "User is already active" } });
  }

  await Invite.updateMany({ email, accepted_at: null, revoked_at: null }, { $set: { revoked_at: new Date() } });

  const token = generateInviteToken();
  const tokenHash = await hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  const invite = await Invite.create({
    email,
    role,
    token_hash: tokenHash,
    token_lookup: tokenLookup(token),
    expires_at: expiresAt,
    invited_by: req.dbUser.email,
  });

  await User.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        role,
        status: "invited",
        full_name: req.body?.full_name || existing?.full_name || "",
      },
      $setOnInsert: {
        plan: "free",
        minutes_balance: 0,
        credits_balance: 0,
      },
    },
    { upsert: true }
  );

  const inviteUrl = `${config.frontendUrl}/accept-invite?token=${token}`;
  const settings = await getDeploymentSettings();

  let emailSent = false;
  let emailError = null;
  try {
    await sendInviteEmailForUser({ invite, token, inviter: req.dbUser });
    emailSent = true;
  } catch (err) {
    emailError = err.message;
    console.error("[invite] email failed:", err.message);
    if (config.emailProvider === "console") {
      console.log("[invite] console fallback link:", inviteUrl);
    }
  }

  const isDev = config.nodeEnv !== "production";
  res.status(201).json({
    invite: {
      id: String(invite._id),
      email,
      role,
      expires_at: expiresAt,
      status: "pending",
    },
    email_sent: emailSent,
    email_error: emailError,
    invite_url: !emailSent && isDev ? inviteUrl : undefined,
    message: emailSent
      ? `Invitation email sent to ${email}.`
      : emailError
        ? `Invite created but email failed: ${emailError}`
        : "Invite created.",
    app_name: settings.app_name,
  });
});

router.patch("/users/:id", async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: { message: "User not found" } });
  if (!canModifyUser(req.dbUser, target)) {
    return res.status(403).json({ error: { message: "Cannot modify this user" } });
  }

  const updates = {};
  if (req.body?.role != null) {
    const role = String(req.body.role);
    if (!["member", "org_admin", "system_admin"].includes(role)) {
      return res.status(400).json({ error: { message: "Invalid role" } });
    }
    if (!canAssignRole(req.dbUser.role, role)) {
      return res.status(403).json({ error: { message: "Cannot assign this role" } });
    }
    updates.role = role;
  }
  if (req.body?.status != null) {
    const status = String(req.body.status);
    if (!["invited", "active", "disabled"].includes(status)) {
      return res.status(400).json({ error: { message: "Invalid status" } });
    }
    if (status === "disabled" && String(target._id) === String(req.dbUser._id)) {
      return res.status(400).json({ error: { message: "Cannot disable your own account" } });
    }
    updates.status = status;
  }
  if (req.body?.full_name != null) {
    updates.full_name = String(req.body.full_name);
  }

  const updated = await User.findByIdAndUpdate(target._id, { $set: updates }, { new: true }).lean();
  const minutes = await getMinutesUsedForEmail(updated.email);
  res.json({ user: serializeUser(updated, minutes) });
});

router.get("/invites", async (req, res) => {
  const now = new Date();
  const invites = await Invite.find({ accepted_at: null, revoked_at: null })
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    invites: invites.map((inv) => ({
      id: String(inv._id),
      email: inv.email,
      role: inv.role,
      invited_by: inv.invited_by,
      expires_at: inv.expires_at,
      expired: inv.expires_at < now,
      createdAt: inv.createdAt,
    })),
  });
});

router.post("/invites/:id/resend", async (req, res) => {
  const inv = await Invite.findById(req.params.id);
  if (!inv || inv.accepted_at || inv.revoked_at) {
    return res.status(404).json({ error: { message: "Invite not found" } });
  }

  inv.revoked_at = new Date();
  await inv.save();

  const token = generateInviteToken();
  const tokenHash = await hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  const newInvite = await Invite.create({
    email: inv.email,
    role: inv.role,
    token_hash: tokenHash,
    token_lookup: tokenLookup(token),
    expires_at: expiresAt,
    invited_by: req.dbUser.email,
  });

  const inviteUrl = `${config.frontendUrl}/accept-invite?token=${token}`;
  let emailSent = false;
  let emailError = null;
  try {
    await sendInviteEmailForUser({ invite: newInvite, token, inviter: req.dbUser });
    emailSent = true;
  } catch (err) {
    emailError = err.message;
    console.error("[invite] resend email failed:", err.message);
    if (config.emailProvider === "console") {
      console.log("[invite] resend console fallback:", inviteUrl);
    }
  }

  res.json({
    invite: {
      id: String(newInvite._id),
      email: newInvite.email,
      role: newInvite.role,
      expires_at: expiresAt,
    },
    email_sent: emailSent,
    email_error: emailError,
    invite_url: !emailSent && config.nodeEnv !== "production" ? inviteUrl : undefined,
    message: emailSent ? "Invitation email resent." : emailError || "Invite renewed.",
  });
});

router.delete("/invites/:id", async (req, res) => {
  const inv = await Invite.findByIdAndUpdate(
    req.params.id,
    { $set: { revoked_at: new Date() } },
    { new: true }
  );
  if (!inv) return res.status(404).json({ error: { message: "Invite not found" } });
  res.json({ success: true });
});

export default router;
