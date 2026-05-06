import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { motion } from 'framer-motion';

export default function PricingCard({ plan, isSelected, onSelect }) {
  const { isDark } = useTheme();

  const cardBg = isDark
    ? plan.highlighted ? '#2C2C2E' : '#1C1C1E'
    : 'white';

  const cardBorder = isDark
    ? plan.highlighted ? '#8B5CF6' : '#404040'
    : plan.highlighted ? '#E0E0E2' : '#E8E8ED';

  const borderWidth = plan.highlighted ? '2px' : '1px';

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="cursor-pointer transition-all duration-300"
    >
      <div
        className="rounded-2xl p-6 md:p-7 relative overflow-hidden"
        style={{
          backgroundColor: cardBg,
          border: `${borderWidth} solid ${cardBorder}`,
          boxShadow: plan.highlighted
            ? isDark
              ? '0 0 30px rgba(139,92,246,0.15), 0 0 60px rgba(139,92,246,0.08)'
              : '0 4px 20px rgba(139,92,246,0.1)'
            : isDark
            ? 'none'
            : '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Gradient accent line at top for highlighted plan */}
        {plan.highlighted && (
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: 'linear-gradient(90deg, #C084FC, #818CF8, #38BDF8)',
            }}
          />
        )}

        {/* Badge */}
        {plan.badge && (
          <div className="mb-4 inline-flex">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: isDark
                  ? 'rgba(139,92,246,0.2)'
                  : 'rgba(139,92,246,0.1)',
                color: isDark ? '#D8B4FE' : '#A855F7',
              }}
            >
              {plan.badge}
            </div>
          </div>
        )}

        {/* Plan Name */}
        <h3
          className="text-2xl font-bold mb-1"
          style={{ color: isDark ? '#FFFFFF' : '#000000' }}
        >
          {plan.name}
        </h3>

        {/* Price */}
        {plan.price !== null && (
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span
                className="text-3xl md:text-4xl font-bold"
                style={{ color: isDark ? '#FFFFFF' : '#000000' }}
              >
                ${plan.price}
              </span>
              <span
                className="text-sm"
                style={{ color: isDark ? '#A1A1A6' : '#86868B' }}
              >
                /month
              </span>
            </div>
          </div>
        )}

        {/* Main Value - Meetings */}
        <div className="mb-3 pb-6 border-b" style={{ borderColor: isDark ? '#404040' : '#E8E8ED' }}>
          <div
            className="text-4xl md:text-5xl font-bold mb-1"
            style={{
              background: 'linear-gradient(135deg, #C084FC, #818CF8, #38BDF8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {plan.monthlyMeetings}
          </div>
          <p
            className="text-sm"
            style={{ color: isDark ? '#A1A1A6' : '#86868B' }}
          >
            meetings per month
          </p>
          <p
            className="text-xs mt-2"
            style={{ color: isDark ? '#8B8B90' : '#A1A1A6' }}
          >
            Up to {plan.maxMeetingMinutes} minutes per meeting
          </p>
        </div>

        {/* Features */}
        <div className="mb-6 space-y-3">
          {plan.features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <Check
                className="w-5 h-5 mt-0.5 shrink-0"
                style={{ color: '#38BDF8' }}
              />
              <span
                className="text-sm"
                style={{ color: isDark ? '#E5E5EA' : '#3C3C43' }}
              >
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 text-sm font-medium ${
            isSelected ? 'ring-2 ring-offset-2' : ''
          }`}
          style={
            plan.id === 'free'
              ? {
                  backgroundColor: isDark ? '#404040' : '#F2F2F7',
                  color: isDark ? '#FFFFFF' : '#000000',
                  ringColor: isDark ? '#8B5CF6' : '#C084FC',
                  ringOffsetColor: isDark ? '#000000' : '#F5F5F7',
                }
              : {
                  background: plan.highlighted
                    ? 'linear-gradient(135deg, #C084FC, #818CF8, #38BDF8)'
                    : isDark
                    ? '#8B5CF6'
                    : '#A855F7',
                  color: 'white',
                  ringColor: isDark ? '#8B5CF6' : '#C084FC',
                  ringOffsetColor: isDark ? '#000000' : '#F5F5F7',
                }
          }
        >
          {plan.cta}
        </button>
      </div>
    </motion.div>
  );
}