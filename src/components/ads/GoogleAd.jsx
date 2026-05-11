import React, { useEffect, useRef, useState } from 'react';
import RotatingAdSlot from '@/components/ads/RotatingAdSlot';
import { useTheme } from '@/lib/ThemeContext';

/**
 * GoogleAd - renders an AdSense auto ad unit
 * Only shows for free plan users (pass subscription prop to hide for Pro)
 *
 * @typedef {Object} GoogleAdProps
 * @property {string} [slot] - AdSense ad slot ID (optional)
 * @property {'auto'|'fluid'|'rectangle'} [adFormat]
 * @property {{ plan_type?: string, subscription_status?: string }} [subscription]
 * @property {string} [className]
 *
 * @param {GoogleAdProps} props
 */
function GoogleAdInner(props) {
  const { slot, adFormat = 'auto', subscription, className = '' } = props;
  const { isDark } = useTheme();
  const adRef = useRef(null);
  const pushed = useRef(false);
  const isPro = subscription?.plan_type === 'pro' && subscription?.subscription_status === 'active';

  useEffect(() => {
    if (isPro || pushed.current) return;
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (e) {
      // AdSense not loaded yet — silently ignore
    }
  }, [isPro]);

  const [adFilled, setAdFilled] = useState(null);

  useEffect(() => {
    if (isPro) return;
    const t = setTimeout(() => {
      const ads = document.querySelectorAll('.adsbygoogle[data-ad-status]');
      const filled = Array.from(ads).some(a => a.getAttribute('data-ad-status') === 'filled');
      setAdFilled(filled);
    }, 2500);
    return () => clearTimeout(t);
  }, [isPro]);

  if (isPro) return null;

  return (
    <div className={`relative w-full ${className}`}>
      <span className="absolute top-1.5 right-1.5 z-10 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/30 text-white/60 leading-none pointer-events-none">Ad</span>
      <div
        className="w-full overflow-hidden rounded-2xl"
        style={{
          minHeight: 60,
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          padding: adFilled === false ? '10px 12px' : 0,
        }}
      >
        {/* Always render AdSense so it can fill */}
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: adFilled === false ? 'none' : 'block' }}
          data-ad-client="ca-pub-9081109939109003"
          data-ad-slot={slot}
          data-ad-format={adFormat}
          data-full-width-responsive="true"
        />
        {/* Show rotating ads if AdSense didn't fill */}
        {adFilled === false && <RotatingAdSlot size="banner" interval={5000} />}
      </div>
    </div>
  );
}

/** @type {import('react').FC<any>} */
const GoogleAd = GoogleAdInner;
export default GoogleAd;