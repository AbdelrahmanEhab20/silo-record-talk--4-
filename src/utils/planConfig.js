/**
 * Standalone / enterprise deployment — usage tracking only (no Stripe, no consumer tiers).
 * Org admins will manage limits and users via a future admin dashboard.
 */

export const DEPLOYMENT_MODE = "standalone";

/** Default reporting window; org-level caps can be added in admin later. */
export const USAGE_CONFIG = {
  trackingPeriod: "monthly",
  /** Soft display cap until org limits are configured in admin (null = no bar cap). */
  displayMonthlyCap: null,
};

/**
 * Minutes used in the current tracking period (prefers monthly, falls back to legacy daily).
 */
export function getMinutesUsed(subscription) {
  if (!subscription) return 0;
  return (
    subscription.monthly_minutes_used ??
    subscription.minutes_used ??
    subscription.daily_minutes_used ??
    0
  );
}

export function getUsagePeriodLabel() {
  return USAGE_CONFIG.trackingPeriod === "monthly" ? "This month" : "Today";
}

export function getDisplayCap(subscription) {
  const orgCap =
    subscription?.org_monthly_minutes_cap ??
    subscription?.monthly_minutes_cap ??
    USAGE_CONFIG.displayMonthlyCap;
  return orgCap > 0 ? orgCap : null;
}

export function getRemainingMinutes(subscription) {
  const cap = getDisplayCap(subscription);
  if (!cap) return null;
  return Math.max(0, cap - getMinutesUsed(subscription));
}

export function getUsagePercent(subscription) {
  const cap = getDisplayCap(subscription);
  if (!cap) return 0;
  return Math.min(100, (getMinutesUsed(subscription) / cap) * 100);
}

/** Consumer ads — disabled in standalone deployments. */
export function shouldShowAds() {
  return false;
}

/** Legacy helpers — no plan gating in standalone mode. */
export function isPro() {
  return true;
}

export function getDailyLimit() {
  return null;
}

export function getMonthlyLimit() {
  return getDisplayCap(null);
}

/** @deprecated Use USAGE_CONFIG / getMinutesUsed */
export const PLAN_CONFIG = {
  standalone: {
    id: "standalone",
    name: "Organization",
    tagline: "Usage monitored by your organization",
  },
};
