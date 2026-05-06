import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/ThemeContext';

const DOWNLOAD_URL = 'https://flickit.me/downloadflickit';
const FLICKIT_LOGO = 'https://media.appClient.com/images/public/6996947e358dd648b0520980/62db091df_White.png';

// Animated floating card icon
function FloatingCard({ delay = 0, children, style }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, delay, ease: 'easeInOut' }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Ad 1: Contact Sharing ── */
export function FlickitAd1() {
  const { isDark } = useTheme();
  return (
    <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer" className="block w-full" style={{ textDecoration: 'none' }}>
      <div
        className="w-full rounded-3xl overflow-hidden flex flex-col items-center justify-center relative"
        style={{ height: 320, background: isDark ? 'linear-gradient(135deg, #06B6D4, #0EA5E9, #3B82F6)' : 'linear-gradient(135deg, #667EEA, #764BA2)' }}
      >
        {/* Animated cards */}
        <div className="absolute inset-0 flex items-center justify-center">
          <FloatingCard delay={0} style={{ position: 'absolute', top: 24, left: 28, opacity: 0.18 }}>
            <div className="w-20 h-12 rounded-xl bg-white/60" />
          </FloatingCard>
          <FloatingCard delay={0.4} style={{ position: 'absolute', bottom: 32, right: 28, opacity: 0.15 }}>
            <div className="w-24 h-14 rounded-xl bg-white/50" />
          </FloatingCard>
          <FloatingCard delay={0.8} style={{ position: 'absolute', top: 60, right: 40, opacity: 0.12 }}>
            <div className="w-16 h-10 rounded-xl bg-white/40" />
          </FloatingCard>
        </div>

        {/* Wifi icon pulse */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-5xl mb-3 z-10"
        >
          📡
        </motion.div>

        <p className="text-white text-2xl font-bold text-center px-6 z-10">Share Contacts Instantly</p>
        <p className="text-white/75 text-sm text-center mt-2 px-8 z-10">
          Flick your digital business card. No NFC, no paper, no problem.
        </p>

        <motion.div
          whileTap={{ scale: 0.95 }}
          className="mt-5 px-7 py-2.5 rounded-full text-sm font-bold text-[#0EA5E9] z-10"
          style={{ background: '#fff' }}
        >
          Download Flickit →
        </motion.div>

        <img src={FLICKIT_LOGO} alt="Flickit" className="mt-3 z-10" style={{ height: 18, opacity: 0.6 }} />
      </div>
    </a>
  );
}

/* ── Ad 2: Multi Profiles ── */
export function FlickitAd2() {
  const { isDark } = useTheme();
  const profiles = [
    { label: 'Work', color: '#3B82F6', delay: 0 },
    { label: 'Personal', color: '#8B5CF6', delay: 0.3 },
    { label: 'Social', color: '#10B981', delay: 0.6 },
  ];

  return (
    <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer" className="block w-full" style={{ textDecoration: 'none' }}>
      <div
        className="w-full rounded-3xl overflow-hidden flex flex-col items-center justify-center"
        style={{ height: 320, background: isDark ? 'linear-gradient(135deg, #0F172A, #1E3A5F, #0EA5E9)' : 'linear-gradient(135deg, #8B5CF6, #D946EF)' }}
      >
        <img src={FLICKIT_LOGO} alt="Flickit" className="mb-3" style={{ height: 22, opacity: 0.85 }} />
        <p className="text-white text-xl font-bold text-center px-6 mb-5">One App. Multiple Identities.</p>

        {/* Animated profile cards stacking in */}
        <div className="flex gap-3 mb-5">
          {profiles.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: p.delay, duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
              className="flex flex-col items-center justify-center rounded-2xl px-4 py-3 text-white text-xs font-semibold"
              style={{ background: p.color, minWidth: 70 }}
            >
              <span className="text-xl mb-1">{i === 0 ? '💼' : i === 1 ? '😊' : '🌐'}</span>
              {p.label}
            </motion.div>
          ))}
        </div>

        <p className="text-white/60 text-xs text-center px-8">
          Separate work, personal &amp; social profiles — all in one flick.
        </p>

        <motion.div
          whileTap={{ scale: 0.95 }}
          className="mt-5 px-7 py-2.5 rounded-full text-sm font-bold text-white"
          style={{ background: '#0EA5E9' }}
        >
          Download Now →
        </motion.div>
      </div>
    </a>
  );
}

/* ── Ad 3: Wallet Cards ── */
export function FlickitAd3() {
  const { isDark } = useTheme();
  return (
    <a href={DOWNLOAD_URL} target="_blank" rel="noreferrer" className="block w-full" style={{ textDecoration: 'none' }}>
      <div
        className="w-full rounded-3xl overflow-hidden flex flex-col items-center justify-center relative"
        style={{ height: 320, background: isDark ? 'linear-gradient(135deg, #0D9488, #06B6D4, #38BDF8)' : 'linear-gradient(135deg, #10B981, #34D399)' }}
      >
        <img src={FLICKIT_LOGO} alt="Flickit" className="mb-4" style={{ height: 24, opacity: 0.9 }} />
        {/* Stacked wallet card animation */}
        <div className="relative mb-4" style={{ height: 80, width: 160 }}>
          {[3, 2, 1, 0].map(i => (
            <motion.div
              key={i}
              animate={{ y: [i * -6, i * -6 - 4, i * -6] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              className="absolute rounded-2xl"
              style={{
                width: 140,
                height: 80,
                left: i * 5,
                top: i * 6,
                background: `rgba(255,255,255,${0.12 + i * 0.08})`,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>

        <p className="text-white text-xl font-bold text-center px-6">In Your Wallet. Always Ready.</p>
        <p className="text-white/70 text-sm text-center mt-2 px-8">
          Unlimited Apple &amp; Google Wallet cards. Share offline, no internet needed.
        </p>

        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mt-5 px-7 py-2.5 rounded-full text-sm font-bold text-[#0D9488]"
          style={{ background: '#fff' }}
        >
          Get Flickit Free →
        </motion.div>

        <img src={FLICKIT_LOGO} alt="Flickit" className="mt-3" style={{ height: 18, opacity: 0.6 }} />
      </div>
    </a>
  );
}