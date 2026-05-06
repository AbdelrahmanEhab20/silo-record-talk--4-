import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/lib/ThemeContext';
import { Crown, Zap, ChevronRight } from 'lucide-react';
import { PLAN_CONFIG, isPro } from '@/utils/planConfig';

export default function PlansSection({ subscription }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const proUser = isPro(subscription);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: isDark ? '#A1A1A6' : '#6E6E73' }}>
        Your Plan
      </h3>

      <button
        onClick={() => navigate('/Pricing')}
        className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
        style={{
          backgroundColor: proUser ? (isDark ? '#1a1a2e' : '#F0EBFF') : (isDark ? '#1C1C1E' : '#FFFFFF'),
          border: `1px solid ${proUser ? '#A855F7' : (isDark ? '#2C2C2E' : '#E8E8ED')}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: proUser
                ? 'linear-gradient(135deg, #A855F7, #6366F1)'
                : (isDark ? '#2C2C2E' : '#F2F2F7'),
            }}
          >
            {proUser
              ? <Crown className="w-5 h-5 text-white" />
              : <Zap className="w-5 h-5" style={{ color: '#A855F7' }} />
            }
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm" style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
              {proUser ? 'Pro Plan' : 'Free Plan'}
            </p>
            <p className="text-xs" style={{ color: isDark ? '#A1A1A6' : '#6E6E73' }}>
              {proUser ? '1,800 min/month · No ads' : '30 min/day · Ads enabled'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!proUser && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}
            >
              Upgrade
            </span>
          )}
          <ChevronRight className="w-4 h-4" style={{ color: isDark ? '#6E6E73' : '#C7C7CC' }} />
        </div>
      </button>
    </div>
  );
}