import React, { useState } from 'react';
import RotatingAdSlot from '@/components/ads/RotatingAdSlot';
import { useTheme } from '@/lib/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { shouldShowAds } from '@/utils/planConfig';

/**
 * AdBanner - non-intrusive banner ad for free users
 * Shows a dismissible banner. Watching = unlocks +10 min.
 * Pass `variant="post-session"` for the post-session variant.
 */
export default function AdBanner({ subscription, onMinutesUnlocked, variant = 'banner' }) {
  const { isDark } = useTheme();
  const [visible, setVisible] = useState(true);
  const [watching, setWatching] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  if (!visible || !shouldShowAds(subscription)) return null;

  const handleWatch = async () => {
    setWatching(true);
    // Simulate watching a 5s ad
    await new Promise(r => setTimeout(r, 5000));
    try {
      const user = await appClient.auth.me();
      const subs = await appClient.entities.PlanSubscription.filter({ user_email: user.email });
      if (subs.length > 0) {
        const current = subs[0];
        await appClient.entities.PlanSubscription.update(current.id, {
          daily_bonus_minutes: (current.daily_bonus_minutes || 0) + 10,
        });
        setUnlocked(true);
        if (onMinutesUnlocked) onMinutesUnlocked(10);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWatching(false);
    }
  };

  if (variant === 'post-session') {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-2xl p-4 border"
            style={{
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: isDark ? '#2C2C2E' : '#E8E8ED',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
                {unlocked ? '✅ +10 minutes unlocked!' : 'Unlock extra minutes'}
              </p>
              <button onClick={() => setVisible(false)}>
                <X className="w-4 h-4" style={{ color: isDark ? '#6E6E73' : '#A1A1A6' }} />
              </button>
            </div>
            {!unlocked && (
              <button
                onClick={handleWatch}
                disabled={watching}
                className="w-full py-2.5 rounded-xl font-medium text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)', opacity: watching ? 0.7 : 1 }}
              >
                {watching ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Watching ad...</>
                ) : (
                  <><PlayCircle className="w-4 h-4" /> Watch Ad · Get +10 min</>
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Default banner variant
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div
            className="mx-4 my-2 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
            style={{
              backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7',
              border: `1px solid ${isDark ? '#2C2C2E' : '#E8E8ED'}`,
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {unlocked
                ? <p className="text-xs" style={{ color: isDark ? '#A1A1A6' : '#6E6E73' }}>✅ +10 min unlocked today!</p>
                : <RotatingAdSlot size="banner" interval={5000} />
              }
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!unlocked && (
                <button
                  onClick={handleWatch}
                  disabled={watching}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                  style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}
                >
                  {watching ? '...' : '+10 min'}
                </button>
              )}
              <button onClick={() => setVisible(false)}>
                <X className="w-4 h-4" style={{ color: isDark ? '#6E6E73' : '#C7C7CC' }} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}