import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { Pause, Play, Square, Volume2, Mic, Radio, ChevronRight } from 'lucide-react';

export default function LiveRecordingControls({
  isRecording = true,
  isPaused = false,
  duration = 0,
  soundLevel = 0,
  waveformBars = [],
  onPause,
  onResume,
  onStop,
  onMark,
  audioMode = 'microphone',
  isMicEnabled = false,
  onChangeSource
}) {
  const { isDark } = useTheme();
  const [timeDisplay, setTimeDisplay] = useState('00:00');
  const [waveform, setWaveform] = useState(waveformBars || Array(24).fill(0));
  const [showSignalPopover, setShowSignalPopover] = useState(false);

  // Update waveform when data changes
  useEffect(() => {
    if (waveformBars && waveformBars.length > 0) {
      setWaveform(waveformBars);
    }
  }, [waveformBars]);

  useEffect(() => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    setTimeDisplay(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  }, [duration]);

  const bg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const border = isDark ? 'border-white/8' : 'border-gray-100';

  const soundBadge = {
    Excellent: { color: 'text-green-400', bg: 'bg-green-400/20' },
    Good: { color: 'text-blue-400', bg: 'bg-blue-400/20' },
    Weak: { color: 'text-amber-400', bg: 'bg-amber-400/20' }
  };

  const currentBadge = soundLevel >= 0.7 ? 'Excellent' : soundLevel >= 0.4 ? 'Good' : 'Weak';
  const badge = soundBadge[currentBadge];

  return (
    <div className={`${bg} rounded-2xl border ${border} p-6 space-y-6`}>
      {/* Timer */}
      <div className="text-center">
        <div className="text-5xl font-bold tracking-wider font-mono mb-2">
          {timeDisplay}
        </div>
        <div className="flex items-center justify-center gap-2">
          {isRecording && <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />}
          <span className={`text-xs uppercase tracking-widest font-semibold ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            {isPaused ? 'Paused' : isRecording ? 'Recording' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Waveform Visualization - Real-time responsive */}
      <div className="flex items-end justify-center gap-1 h-16 px-8">
        {waveform.map((barValue, i) => {
          // Responsive bar height based on actual audio levels
          const baseHeight = Math.max(4, barValue);
          const boostedHeight = Math.min(100, baseHeight * 1.2);
          
          return (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-purple-400 to-blue-400 rounded-sm transition-all duration-100"
              style={{
                height: `${boostedHeight}%`,
                opacity: 0.5 + (barValue / 100) * 0.5,
                minHeight: '3px'
              }}
            />
          );
        })}
      </div>

      {/* Signal icon + Change Source row */}
      <div className="flex items-center justify-between">
        {/* Signal icon with notification dot */}
        <div className="relative">
          <button
            onClick={() => setShowSignalPopover(v => !v)}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'bg-white/8 hover:bg-white/15' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            {/* Notification dot - color reflects signal quality */}
            <span className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
              isDark ? 'border-[#1C1C1E]' : 'border-white'
            } ${
              soundLevel >= 60 ? 'bg-green-400' : soundLevel >= 30 ? 'bg-amber-400' : 'bg-red-400'
            }`} />
          </button>

          {/* Popover */}
          {showSignalPopover && (
            <div className={`absolute left-0 bottom-11 z-50 w-52 rounded-xl shadow-xl border p-3 space-y-2 ${
              isDark ? 'bg-[#2C2C2E] border-white/10' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-widest ${
                  isDark ? 'text-white/40' : 'text-gray-500'
                }`}>Signal</span>
                <span className={`text-xs font-bold ${
                  soundLevel >= 60 ? 'text-green-400' : soundLevel >= 30 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {soundLevel >= 60 ? 'Good' : soundLevel >= 30 ? 'Weak' : 'No Signal'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      soundLevel >= 60 ? 'bg-green-400' : soundLevel >= 30 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.round(soundLevel)}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right">{Math.round(soundLevel)}%</span>
              </div>
              <div className={`text-xs ${
                isDark ? 'text-white/40' : 'text-gray-500'
              } flex items-center gap-1.5`}>
                {audioMode === 'microphone' ? <Mic className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                <span className="capitalize">{audioMode.replace('_', ' + ')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Change Source button */}
        {onChangeSource && (
          <button
            onClick={onChangeSource}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDark ? 'bg-white/8 hover:bg-white/15 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {audioMode === 'microphone' ? <Mic className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="capitalize">{audioMode.replace('_', ' + ')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isPaused && isRecording && (
          <button
            onClick={onPause}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        )}
        {isPaused && (
          <button
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        )}
        <button
          onClick={onStop}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors"
        >
          <Square className="w-4 h-4" />
          Stop
        </button>
        <button
          onClick={onMark}
          className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
          title="Mark important moment"
        >
          ⭐
        </button>
      </div>
    </div>
  );
}