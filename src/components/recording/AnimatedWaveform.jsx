import React from 'react';

export default function AnimatedWaveform({ bars = Array(24).fill(0), soundLevel = 0, isRecording = false }) {
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((level, i) => {
        const normalized = Math.min(100, (level || 0));
        const hasSoundAtBar = normalized > 15;
        const barHeight = hasSoundAtBar ? 12 + (normalized / 100) * 48 : 8;
        
        return hasSoundAtBar ? (
          <div
            key={i}
            className="transition-all duration-100"
            style={{
              width: '4px',
              height: `${barHeight}px`,
              background: 'linear-gradient(180deg, #7C3AED 0%, #A78BFA 100%)',
              borderRadius: '2px',
              boxShadow: '0 0 6px rgba(124, 58, 237, 0.7)',
            }}
          />
        ) : (
          <div
            key={i}
            style={{
              width: '4px',
              height: '8px',
              borderTop: '1px dashed rgba(167, 139, 250, 0.4)',
            }}
          />
        );
      })}
    </div>
  );
}