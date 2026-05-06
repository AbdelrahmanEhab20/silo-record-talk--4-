import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { useTheme } from '@/lib/ThemeContext';
import WatchAdModal from '@/components/WatchAdModal';

export default function MinutesStatusBar() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [showAdModal, setShowAdModal] = useState(false);

  const fetchSub = async () => {
    const user = await appClient.auth.me();
    const subs = await appClient.entities.PlanSubscription.filter({ user_email: user.email });
    if (subs.length > 0) setSub(subs[0]);
  };

  useEffect(() => { fetchSub(); }, []);

  if (!sub) return null;

  const isPro = sub.plan_type === 'pro';

  if (isPro) {
    const used = sub.monthly_minutes_used || 0;
    const total = 1800;
    const pct = Math.min(100, (used / total) * 100);
    const remaining = Math.max(0, total - used);
    return (
      <div className={`mx-5 mb-4 px-4 py-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/8' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Monthly Minutes</span>
          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{remaining} left</span>
        </div>
        <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #A855F7, #6366F1)' }} />
        </div>
        <p className={`text-[10px] mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{used} / {total} min used this month</p>
      </div>
    );
  }

  // Free plan
  const today = new Date().toISOString().slice(0, 10);
  const resetNeeded = sub.daily_reset_date !== today;
  const dailyUsed = resetNeeded ? 0 : (sub.daily_minutes_used || 0);
  const bonusMinutes = resetNeeded ? 0 : (sub.daily_bonus_minutes || 0);
  const dailyLimit = 30 + bonusMinutes;
  const remaining = Math.max(0, dailyLimit - dailyUsed);
  const pct = Math.min(100, (dailyUsed / dailyLimit) * 100);
  const isLow = remaining <= 10;

  return (
    <>
      <div className={`mx-5 mb-4 px-4 py-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/8' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Daily Minutes</span>
          <span className={`text-xs font-medium ${isLow ? 'text-amber-400' : isDark ? 'text-white/40' : 'text-gray-400'}`}>{remaining} left</span>
        </div>
        <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isLow ? 'linear-gradient(90deg, #F59E0B, #EF4444)' : 'linear-gradient(90deg, #A855F7, #6366F1)' }} />
        </div>
        <p className={`text-[10px] mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{dailyUsed} / {dailyLimit} min used today</p>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowAdModal(true)}
            className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}
          >
            +10 min free
          </button>
          <button
            onClick={() => navigate('/Pricing')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border ${isDark ? 'border-white/15 text-white/70 hover:bg-white/8' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} transition-colors`}
          >
            Upgrade Pro
          </button>
        </div>
      </div>

      {showAdModal && (
        <WatchAdModal
          onClose={() => { setShowAdModal(false); fetchSub(); }}
          onRewarded={() => { fetchSub(); }}
        />
      )}
    </>
  );
}