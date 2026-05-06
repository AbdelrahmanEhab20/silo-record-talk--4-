/**
 * SILO Pricing Configuration
 * Minutes-based freemium model
 */

export const PLAN_CONFIG = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    dailyMinutes: 30,
    monthlyMinutes: null,
    adsDefault: true,
    adBonusMinutesPerAd: 10,
    features: [
      '30 minutes per day',
      'Unlock +10 min per ad watched',
      'Basic transcription',
      'Summary & tags',
    ],
    cta: 'Get Started',
    tagline: 'Start for free with daily usage',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 6.40,
    priceYearly: 76.70,
    priceYearlyMonthly: 6.40, // per month billed yearly
    dailyMinutes: null,
    monthlyMinutes: 1800,
    adsDefault: false,
    adBonusMinutesPerAd: 0,
    badge: 'Most Popular',
    features: [
      '30 hours per month (1,800 min)',
      'No ads, ever',
      'Advanced AI summaries',
      'Action items & insights',
      'Full export options',
      'Priority processing',
      'Full history access',
    ],
    cta: 'Upgrade to Pro',
    tagline: 'Your AI Second Brain',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: null,
    monthlyMinutes: null,
    features: [
      'White label (branding, domain, UI)',
      'On-premise & private cloud deployment',
      'Data sovereignty compliance',
      'Advanced security (SSO, access control)',
      'Custom AI models & prompts',
      'Full integrations suite',
      'Dedicated support & SLA',
    ],
    cta: 'Contact Us',
    ctaDemo: 'Request Demo',
    tagline: 'Built for organizations and secure environments',
  },
};

export function getDailyLimit(subscription) {
  if (!subscription || subscription.plan_type === 'free') {
    const base = PLAN_CONFIG.free.dailyMinutes;
    const bonus = subscription?.daily_bonus_minutes || 0;
    return base + bonus;
  }
  if (subscription.plan_type === 'pro') return null; // no daily limit
  return PLAN_CONFIG.free.dailyMinutes;
}

export function getMonthlyLimit(subscription) {
  if (subscription?.plan_type === 'pro') return PLAN_CONFIG.pro.monthlyMinutes;
  return null;
}

export function getRemainingMinutes(subscription) {
  if (!subscription) return PLAN_CONFIG.free.dailyMinutes;
  if (subscription.plan_type === 'pro') {
    return Math.max(0, PLAN_CONFIG.pro.monthlyMinutes - (subscription.monthly_minutes_used || 0));
  }
  const limit = getDailyLimit(subscription);
  return Math.max(0, limit - (subscription.daily_minutes_used || 0));
}

export function isPro(subscription) {
  return subscription?.plan_type === 'pro' && subscription?.subscription_status === 'active';
}

export function shouldShowAds(subscription) {
  if (isPro(subscription)) return false;
  return subscription?.ads_enabled !== false; // show by default
}