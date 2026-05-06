// Legacy file — new code should import from utils/planConfig.js
// Re-exported for backward compatibility
export { PLAN_CONFIG as planDetails, isPro, getRemainingMinutes, getDailyLimit } from './planConfig';

export function getAllPlans() {
  return ['free', 'pro', 'enterprise'];
}

export function getUsagePercentage(used, total) {
  if (total <= 0) return 0;
  return Math.min(100, (used / total) * 100);
}

export function formatUsageText(used, total) {
  return `${used} of ${total} minutes used`;
}