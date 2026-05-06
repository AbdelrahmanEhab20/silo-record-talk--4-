import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/lib/ThemeContext';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Zap, Crown, Building2, ChevronRight, Star } from 'lucide-react';
import { PLAN_CONFIG, isPro } from '@/utils/planConfig';

export default function Pricing() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'yearly'
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const subs = await base44.entities.PlanSubscription.filter({ user_email: user.email });
          if (subs.length > 0) setSubscription(subs[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleProUpgrade = async () => {
    setCheckingOut(true);
    try {
      const user = await base44.auth.me();
      const response = await base44.functions.invoke('createCheckoutSession', {
        plan: 'pro',
        billing_interval: billing,
        user_email: user.email,
      });
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (e) {
      console.error(e);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const bg = isDark ? '#000000' : '#F5F5F7';
  const card = isDark ? '#1C1C1E' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#000000';
  const sub = isDark ? '#A1A1A6' : '#6E6E73';
  const border = isDark ? '#2C2C2E' : '#E8E8ED';
  const currentPlan = subscription?.plan_type || 'free';
  const proMonthly = PLAN_CONFIG.pro.priceMonthly;
  const proYearly = PLAN_CONFIG.pro.priceYearly;
  const proMonthlyIfYearly = PLAN_CONFIG.pro.priceYearlyMonthly;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: bg }}>
      {/* Nav */}
      <div
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(245,245,247,0.85)',
          borderColor: border,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/Settings')}
            className="p-2 rounded-xl transition-colors"
            style={{ backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', color: text }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: text }}>Plans & Pricing</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">
        {/* Hero */}
        <div className="text-center mb-2">
          <h2 className="text-3xl font-bold mb-2" style={{ color: text }}>
            Simple, Flexible Pricing
          </h2>
          <p className="text-base" style={{ color: sub }}>
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Billing Toggle (for Pro) */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setBilling('monthly')}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: billing === 'monthly' ? (isDark ? '#FFFFFF' : '#000000') : 'transparent',
              color: billing === 'monthly' ? (isDark ? '#000000' : '#FFFFFF') : sub,
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: billing === 'yearly' ? (isDark ? '#FFFFFF' : '#000000') : 'transparent',
              color: billing === 'yearly' ? (isDark ? '#000000' : '#FFFFFF') : sub,
            }}
          >
            Yearly
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500 text-white font-semibold">
              −20%
            </span>
          </button>
        </div>

        {/* FREE CARD */}
        <FreeCard
          isDark={isDark} card={card} text={text} sub={sub} border={border}
          isCurrentPlan={currentPlan === 'free'}
          subscription={subscription}
        />

        {/* PRO CARD */}
        <ProCard
          isDark={isDark} card={card} text={text} sub={sub}
          billing={billing}
          proMonthly={proMonthly}
          proYearly={proYearly}
          proMonthlyIfYearly={proMonthlyIfYearly}
          isCurrentPlan={currentPlan === 'pro'}
          onUpgrade={handleProUpgrade}
          checkingOut={checkingOut}
        />

        {/* ENTERPRISE CARD */}
        <EnterpriseCard isDark={isDark} card={card} text={text} sub={sub} border={border} />

        {/* Footer */}
        <p className="text-center text-xs pb-4" style={{ color: sub }}>
          All plans include end-to-end encryption. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

function FreeCard({ isDark, card, text, sub, border, isCurrentPlan, subscription }) {
  const adsEnabled = subscription?.ads_enabled !== false;
  const [localAds, setLocalAds] = useState(adsEnabled);

  const toggleAds = async () => {
    setLocalAds(!localAds);
    try {
      const user = await base44.auth.me();
      const subs = await base44.entities.PlanSubscription.filter({ user_email: user.email });
      if (subs.length > 0) {
        await base44.entities.PlanSubscription.update(subs[0].id, { ads_enabled: !localAds });
      }
    } catch (e) {
      console.error(e);
      setLocalAds(localAds); // revert
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-6 border"
      style={{ backgroundColor: card, borderColor: isCurrentPlan ? '#A855F7' : border, borderWidth: isCurrentPlan ? 2 : 1 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
            <Zap className="w-5 h-5" style={{ color: '#A855F7' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: text }}>Free</h3>
            <p className="text-xs" style={{ color: sub }}>30 minutes daily with ads</p>
          </div>
        </div>
        {isCurrentPlan && (
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.1)', color: '#A855F7' }}>
            Current
          </span>
        )}
      </div>

      <div className="mb-5">
        <span className="text-4xl font-bold" style={{ color: text }}>$0</span>
        <span className="text-sm ml-1" style={{ color: sub }}>forever</span>
      </div>

      {/* Ads Toggle */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: text }}>Enable Ads</p>
            <p className="text-xs" style={{ color: sub }}>Watch 1 ad = +10 min/day</p>
          </div>
          <button
            onClick={toggleAds}
            className="relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0"
            style={{ backgroundColor: localAds ? '#A855F7' : (isDark ? '#3A3A3C' : '#C7C7CC') }}
          >
            <motion.div
              animate={{ x: localAds ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>
        <AnimatePresence>
          {localAds && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mt-2"
            >
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-xs text-green-500 font-medium">Ads enabled — earn extra minutes daily</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ul className="space-y-2.5">
        {PLAN_CONFIG.free.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#A855F7' }} />
            <span className="text-sm" style={{ color: sub }}>{f}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function ProCard({ isDark, card, text, sub, billing, proMonthly, proYearly, proMonthlyIfYearly, isCurrentPlan, onUpgrade, checkingOut }) {
  const displayPrice = billing === 'yearly' ? proMonthlyIfYearly : proMonthly;
  const billedAs = billing === 'yearly' ? `$${proYearly}/year` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 8px 40px rgba(139,92,246,0.35)',
      }}
    >
      {/* Glow */}
      <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at top right, #C084FC, transparent 60%)' }} />

      <div className="relative">
        {/* Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Pro</h3>
              <p className="text-xs text-white/70">Your AI Second Brain</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20">
            <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
            <span className="text-xs font-semibold text-white">Most Popular</span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-1">
          <span className="text-5xl font-bold text-white">${displayPrice.toFixed(2)}</span>
          <span className="text-white/70 text-sm ml-1">/mo</span>
        </div>
        {billedAs && (
          <p className="text-xs text-white/60 mb-5">Billed as {billedAs} · Save 20%</p>
        )}
        {!billedAs && <div className="mb-5" />}

        {/* Main value */}
        <div className="rounded-2xl p-4 mb-5 bg-white/10 backdrop-blur-sm">
          <p className="text-3xl font-bold text-white">30 hours</p>
          <p className="text-sm text-white/70">per month (1,800 minutes)</p>
        </div>

        <ul className="space-y-2.5 mb-6">
          {PLAN_CONFIG.pro.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <Check className="w-4 h-4 flex-shrink-0 text-white" />
              <span className="text-sm text-white/90">{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onUpgrade}
          disabled={isCurrentPlan || checkingOut}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            backgroundColor: isCurrentPlan ? 'rgba(255,255,255,0.2)' : '#FFFFFF',
            color: isCurrentPlan ? 'rgba(255,255,255,0.7)' : '#7C3AED',
          }}
        >
          {checkingOut ? (
            <><div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> Processing...</>
          ) : isCurrentPlan ? (
            <><Check className="w-4 h-4" /> Current Plan</>
          ) : (
            <>Upgrade to Pro <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function EnterpriseCard({ isDark, card, text, sub, border }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-3xl p-6 border"
      style={{ backgroundColor: isDark ? '#1C1C1E' : '#FAFAFA', borderColor: isDark ? '#2C2C2E' : '#E8E8ED' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
          <Building2 className="w-5 h-5" style={{ color: '#6B7280' }} />
        </div>
        <div>
          <h3 className="font-bold text-lg" style={{ color: text }}>Enterprise / Government</h3>
          <p className="text-xs" style={{ color: sub }}>Built for organizations and secure environments</p>
        </div>
      </div>

      <div className="mb-5">
        <span className="text-2xl font-bold" style={{ color: text }}>Custom Pricing</span>
      </div>

      <ul className="space-y-2.5 mb-6">
        {PLAN_CONFIG.enterprise.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#6B7280' }} />
            <span className="text-sm" style={{ color: sub }}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => navigate('/ContactUs')}
        className="w-full py-3 rounded-2xl font-semibold text-sm text-center transition-all"
        style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: text }}
      >
        Contact Us
      </button>
    </motion.div>
  );
}