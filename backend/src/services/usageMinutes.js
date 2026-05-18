import { PlanSubscription, Session } from "../models/index.js";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Sum recording minutes for the current calendar month from completed sessions.
 * Uses created_date when present (legacy), otherwise createdAt.
 */
export async function getSessionMinutesForEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return 0;

  const since = startOfMonth();
  const sessions = await Session.find({
    user_email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
    processing_status: "done",
    $expr: {
      $gte: [{ $ifNull: ["$created_date", "$createdAt"] }, since],
    },
  })
    .select("duration")
    .lean();

  const minutes = sessions.reduce((sum, s) => sum + (Number(s.duration) || 0) / 60, 0);
  return Math.round(minutes * 10) / 10;
}

/**
 * Authoritative monthly usage: session totals (not stale PlanSubscription counters).
 * Optionally syncs monthly_minutes_used when a subscription row exists.
 */
export async function getMinutesUsedForEmail(email, { syncSubscription = true } = {}) {
  const minutes = await getSessionMinutesForEmail(email);
  if (!syncSubscription) return minutes;

  const normalized = normalizeEmail(email);
  await PlanSubscription.updateMany(
    { user_email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") } },
    { $set: { monthly_minutes_used: minutes } }
  );

  return minutes;
}
