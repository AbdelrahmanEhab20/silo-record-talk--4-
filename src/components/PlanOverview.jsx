import React, { useState, useEffect } from 'react';
import WatchAdModal from '@/components/WatchAdModal';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { useTheme } from '@/lib/ThemeContext';
import { motion } from 'framer-motion';
import { Zap, Crown, ChevronRight, Clock, Play } from 'lucide-react';
import { PLAN_CONFIG, getRemainingMinutes, getDailyLimit, isPro } from '@/utils/planConfig';

export default function PlanOverview() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const user = await appClient.auth.me();
        if (user) {
          const subs = await appClient.entities.PlanSubscription.filter({ user_email: user.email });
          if (subs.length > 0) setSubscription(subs[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);

  const handleAdRewarded = async () => {
    // Re-fetch subscription to reflect new bonus
    try {
      const user = await appClient.auth.me();
      if (user) {
        const subs = await appClient.entities.PlanSubscription.filter({ user_email: user.email });
        if (subs.length > 0) setSubscription(subs[0]);
      }
    } catch (e) {}
  };

  if (loading) return null;

  const adModal = showAdModal && (
    <WatchAdModal onClose={() => setShowAdModal(false)} onRewarded={handleAdRewarded} />
  );

  const planType = subscription?.plan_type || 'free';
  const proUser = isPro(subscription);
  const remaining = getRemainingMinutes(subscription);

  if (proUser) {
    const total = PLAN_CONFIG.pro.monthlyMinutes;
    const used = subscription?.monthly_minutes_used || 0;
    const percent = Math.min(100, (used / total) * 100);
    const hoursLeft = Math.floor(remaining / 60);
    const minsLeft = remaining % 60;

    // Format renewal date
    const renewalStr = (() => {
      const periodEnd = subscription?.current_period_end;
      if (!periodEnd) return null;
      try {
        const d = new Date(periodEnd);
        // Date part in user's local timezone
        const datePart = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        // Time part in user's local timezone
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        // Timezone abbreviation
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tzAbbr = d.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();
        return `${datePart} | ${timePart} ${tzAbbr}`;
      } catch {
        return null;
      }
    })();

    return (
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
            : 'linear-gradient(135deg, #667eea, #764ba2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-white" />
            <span className="font-semibold text-white">Pro Plan</span>
          </div>
          <button
            onClick={() => navigate('/Pricing')}
            className="text-xs text-white/70 flex items-center gap-1"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div>
          <p className="text-xs text-white/60 mb-1">Monthly Usage</p>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-bold text-white">{hoursLeft}h {minsLeft}m</span>
            <span className="text-xs text-white/60">remaining</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-white/80"
            />
          </div>
          <p className="text-xs text-white/50 mt-1">{used} of {total} min used</p>
        </div>
        {renewalStr && (
          <p className="text-xs text-white/50 flex items-center gap-1">
            <Clock className="w-3 h-3 text-white/40" />
            Renews at {renewalStr}
          </p>
        )}
      </div>
    );
  }

  // Free plan
  const dailyLimit = getDailyLimit(subscription);
  const dailyUsed = subscription?.daily_minutes_used || 0;
  const percent = Math.min(100, (dailyUsed / dailyLimit) * 100);
  const isLow = remaining <= 5;

  return (
    <>
    {adModal}
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" style={{ color: '#A855F7' }} />
          <span className="font-semibold" style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Free Plan</span>
        </div>
        <button
          onClick={() => navigate('/Pricing')}
          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}
        >
          Upgrade <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs" style={{ color: isDark ? '#A1A1A6' : '#6E6E73' }}>Today's usage</p>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" style={{ color: isLow ? '#EF4444' : '#A855F7' }} />
            <span className="text-xs font-medium" style={{ color: isLow ? '#EF4444' : (isDark ? '#E5E5EA' : '#3C3C43') }}>
              {remaining} min left
            </span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: isLow ? '#EF4444' : '#A855F7' }}
          />
        </div>
        <p className="text-xs mt-1" style={{ color: isDark ? '#6E6E73' : '#A1A1A6' }}>
          {dailyUsed} of {dailyLimit} min used today
        </p>
      </div>

      {isLow && (
        <p className="text-xs" style={{ color: '#EF4444' }}>
          ⚠️ Low on daily minutes. Watch an ad to unlock +10 min or upgrade to Pro.
        </p>
      )}

      {/* Watch Ad Button */}
      <button
        onClick={() => setShowAdModal(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        style={{ background: isDark ? '#2C2C2E' : '#F2F2F7', color: isDark ? '#A855F7' : '#7C3AED' }}
      >
        <Play className="w-4 h-4" />
        Watch Ad — Unlock +10 min
      </button>
    </div>
    </>
  );
}