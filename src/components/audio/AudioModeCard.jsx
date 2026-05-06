import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { Check, Lock, AlertCircle } from 'lucide-react';

export default function AudioModeCard({
  mode,
  label,
  description,
  icon,
  supported = true,
  selected = false,
  recommended = false,
  onClick,
  reason = null
}) {
  const { isDark } = useTheme();
  const bg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const border = isDark ? 'border-white/8' : 'border-gray-100';
  const hover = isDark ? 'hover:bg-[#2C2C2E]' : 'hover:bg-gray-50';

  return (
    <button
      onClick={onClick}
      disabled={!supported}
      className={`
        w-full p-4 rounded-2xl border transition-all
        ${bg} ${border}
        ${!supported ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${hover}`}
        ${selected ? (isDark ? 'ring-2 ring-purple-400 bg-purple-400/5' : 'ring-2 ring-purple-500 bg-purple-50') : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {label}
            </h3>
            {recommended && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-blue-400/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                Recommended
              </span>
            )}
            {selected && <Check className="w-4 h-4 text-purple-400 ml-auto" />}
            {!supported && <Lock className="w-4 h-4 text-gray-400 ml-auto" />}
          </div>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            {description}
          </p>
          {!supported && reason && (
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-white/5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                {reason}
              </p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}