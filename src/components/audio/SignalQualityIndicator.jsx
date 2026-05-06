import React from 'react';

export default function SignalQualityIndicator({ soundLevel = 0 }) {
  const getSignalStatus = () => {
    if (soundLevel < 10) return { label: 'No Signal', color: 'text-red-400', bg: 'bg-red-400/20' };
    if (soundLevel < 25) return { label: 'Weak', color: 'text-amber-400', bg: 'bg-amber-400/20' };
    if (soundLevel < 50) return { label: 'Good', color: 'text-blue-400', bg: 'bg-blue-400/20' };
    return { label: 'Excellent', color: 'text-green-400', bg: 'bg-green-400/20' };
  };

  const signalStatus = getSignalStatus();

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-3 h-3">
        <div
          className={`absolute inset-0 rounded-full transition-all ${signalStatus.bg}`}
          style={{
            transform: `scale(${0.5 + soundLevel / 200})`,
            opacity: 0.3 + soundLevel / 150
          }}
        />
        <div className={`absolute inset-0 rounded-full ${signalStatus.color}`} />
      </div>
      <span className={`text-xs font-medium ${signalStatus.color}`}>
        {signalStatus.label}
      </span>
    </div>
  );
}