import React, { useState, useEffect, useRef } from 'react';
import { FlickitAd1, FlickitAd2, FlickitAd3 } from '@/components/ads/FlickitAds';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, CheckCircle, Loader2 } from 'lucide-react';
import { appClient } from '@/api/appClient';

const AD_DURATION = 15;

// Silo fallback promo slides shown when AdSense doesn't fill
const PROMO_SLIDES = [
  {
    type: 'silo',
    emoji: '✨',
    title: 'Upgrade to Pro',
    body: 'Unlock 1,800 min/month, no ads, and unlimited AI features.',
    cta: 'See Plans →',
    gradient: 'linear-gradient(135deg, #A855F7, #6366F1, #38BDF8)',
  },
  { type: 'flickit1' },
  {
    type: 'silo',
    emoji: '🎙️',
    title: 'Record Smarter',
    body: 'Auto-transcription, speaker detection, and dialect recognition — all in one app.',
    cta: 'Try Pro Free →',
    gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
  },
  { type: 'flickit2' },
  {
    type: 'silo',
    emoji: '📋',
    title: 'AI Meeting Summaries',
    body: 'Get instant summaries, action items, and follow-ups from every meeting.',
    cta: 'Get Started →',
    gradient: 'linear-gradient(135deg, #10B981, #0EA5E9)',
  },
  { type: 'flickit3' },
  {
    type: 'silo',
    emoji: '🔒',
    title: 'Your Data, Private',
    body: 'All recordings stay on your device. Silo never shares your data.',
    cta: 'Learn More →',
    gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  },
];

function AdSenseSlot() {
  const ref = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (e) {}
  }, []);

  return (
    <ins
      ref={ref}
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', height: 320 }}
      data-ad-client="ca-pub-9081109939109003"
      data-ad-slot="auto"
      data-ad-format="rectangle"
      data-full-width-responsive="true"
    />
  );
}

function FallbackPromo({ slide }) {
  if (slide.type === 'flickit1') return <FlickitAd1 />;
  if (slide.type === 'flickit2') return <FlickitAd2 />;
  if (slide.type === 'flickit3') return <FlickitAd3 />;
  return (
    <div
      className="w-full rounded-3xl overflow-hidden flex flex-col items-center justify-center"
      style={{ height: 320, background: slide.gradient }}
    >
      <div className="text-6xl mb-4">{slide.emoji}</div>
      <p className="text-white text-2xl font-bold text-center px-6">{slide.title}</p>
      <p className="text-white/70 text-sm text-center mt-2 px-8">{slide.body}</p>
      <div
        className="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      >
        {slide.cta}
      </div>
    </div>
  );
}

export default function WatchAdModal({ onClose, onRewarded }) {
  const [phase, setPhase] = useState('watching'); // 'watching' | 'rewarding' | 'done'
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [canSkip, setCanSkip] = useState(false);
  const [adSenseFilled, setAdSenseFilled] = useState(null); // null = checking
  const [slideIndex] = useState(() => Math.floor(Math.random() * PROMO_SLIDES.length));
  const timerRef = useRef(null);

  // Check if AdSense filled the slot after a short delay
  useEffect(() => {
    const checkTimer = setTimeout(() => {
      const ads = document.querySelectorAll('.adsbygoogle[data-ad-status]');
      const filled = Array.from(ads).some(a => a.getAttribute('data-ad-status') === 'filled');
      setAdSenseFilled(filled);
    }, 2000);
    return () => clearTimeout(checkTimer);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => setCanSkip(true), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleFinish = async () => {
    setPhase('rewarding');
    try {
      await appClient.functions.invoke('rewardAdMinutes', {});
      setPhase('done');
      setTimeout(() => {
        onRewarded();
        onClose();
      }, 1500);
    } catch (e) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: '#000' }}
      >
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {phase === 'done' ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <p className="text-white text-xl font-bold">+10 minutes unlocked!</p>
              <p className="text-white/50 text-sm">Added to today's allowance</p>
            </motion.div>
          ) : phase === 'rewarding' ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
              <p className="text-white/70 text-sm">Applying your reward...</p>
            </div>
          ) : (
            <>
              <div className="w-full max-w-sm mx-auto px-6 flex flex-col items-center gap-4">
                {/* Try AdSense first, show fallback promo if not filled */}
                <div className="w-full relative">
                  {/* Hidden AdSense slot — always rendered so it can fill */}
                  <div style={{ position: 'absolute', opacity: adSenseFilled ? 1 : 0, pointerEvents: adSenseFilled ? 'auto' : 'none', width: '100%' }}>
                    <AdSenseSlot />
                  </div>
                  {/* Fallback promo — shown until AdSense confirms fill */}
                  {!adSenseFilled && (
                    <FallbackPromo slide={PROMO_SLIDES[slideIndex]} />
                  )}
                </div>

                <p className="text-white/30 text-xs text-center">
                  {adSenseFilled ? 'Advertisement' : (PROMO_SLIDES[slideIndex]?.type?.startsWith('flickit') ? 'Sponsored · flickit.me' : 'Silo Pro — Upgrade today')} · Your support keeps Silo free
                </p>
              </div>

              {/* Top-right: countdown + skip/close */}
              <div className="absolute top-6 right-6 flex items-center gap-3">
                {countdown > 0 && (
                  <div className="bg-white/10 rounded-full px-3 py-1.5 text-white/70 text-xs font-medium">
                    {countdown}s
                  </div>
                )}
                {canSkip ? (
                  <button
                    onClick={handleFinish}
                    className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3" /> Claim +10 min
                  </button>
                ) : (
                  <button onClick={onClose} className="bg-white/10 text-white/40 p-1.5 rounded-full">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: AD_DURATION, ease: 'linear' }}
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, #A855F7, #6366F1)' }}
                />
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}