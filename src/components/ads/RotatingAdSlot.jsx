import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FlickitAd1, FlickitAd2, FlickitAd3 } from '@/components/ads/FlickitAds';

const DOWNLOAD_URL = 'https://flickit.me/downloadflickit';

const FLICKIT_ICON = 'https://media.base44.com/images/public/6996947e358dd648b0520980/95b5f6984_White.png';
const SILO_ICON = 'https://media.base44.com/images/public/6996947e358dd648b0520980/516955f86_Silologopng-icon.png';

const MINI_ADS = [
  { key: 'flickit1', bg: 'linear-gradient(135deg, #06B6D4, #3B82F6)', icon: FLICKIT_ICON, title: 'Flickit', body: 'Share contacts instantly with a flick!', link: DOWNLOAD_URL },
  { key: 'silo1', bg: 'linear-gradient(135deg, #A855F7, #6366F1)', icon: SILO_ICON, title: 'Silo Pro', body: 'Unlock 1,800 min/month. No ads.', link: null },
  { key: 'flickit2', bg: 'linear-gradient(135deg, #0F172A, #0EA5E9)', icon: FLICKIT_ICON, title: 'Flickit', body: 'Multi profiles — work, personal & social.', link: DOWNLOAD_URL },
  { key: 'silo2', bg: 'linear-gradient(135deg, #10B981, #0EA5E9)', icon: SILO_ICON, title: 'Silo AI', body: 'AI meeting summaries & action items.', link: null },
  { key: 'flickit3', bg: 'linear-gradient(135deg, #0D9488, #38BDF8)', icon: FLICKIT_ICON, title: 'Flickit', body: 'Unlimited Apple & Google Wallet cards.', link: DOWNLOAD_URL },
];

const FULL_ADS = [FlickitAd1, FlickitAd2, FlickitAd3];

export default function RotatingAdSlot({ size = 'banner', interval = 5000 }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [fullIndex, setFullIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % MINI_ADS.length), interval);
    return () => clearInterval(t);
  }, [interval]);

  useEffect(() => {
    if (size !== 'full') return;
    const t = setInterval(() => setFullIndex(i => (i + 1) % FULL_ADS.length), interval);
    return () => clearInterval(t);
  }, [interval, size]);

  if (size === 'full') {
    const Ad = FULL_ADS[fullIndex];
    return (
      <div className="relative">
        <span className="absolute top-2 right-2 z-20 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/30 text-white/60 leading-none pointer-events-none">Ad</span>
      <AnimatePresence mode="wait">
        <motion.div
          key={fullIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
        >
          <Ad />
        </motion.div>
      </AnimatePresence>
      </div>
    );
  }

  const ad = MINI_ADS[index];

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={ad.key}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-2 w-full"
      >
        <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: ad.icon === SILO_ICON ? 'transparent' : ad.bg }}>
          <img src={ad.icon} alt={ad.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate" style={{ color: '#fff', lineHeight: 1.2 }}>{ad.title}</p>
          <p className="text-xs truncate opacity-70" style={{ color: '#fff', lineHeight: 1.3 }}>{ad.body}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  if (ad.link) {
    return (
      <a href={ad.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 w-full" style={{ textDecoration: 'none' }}>
        {content}
      </a>
    );
  }
  return (
    <div className="flex items-center gap-2 w-full cursor-pointer" onClick={() => navigate('/Pricing')}>
      {content}
    </div>
  );
}