import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { AlertCircle, Mic, Monitor, HelpCircle } from 'lucide-react';

export default function UnsupportedFallback({
  reason = 'unsupported',
  onSelectMicrophone,
  onSelectScreen,
  onLearnMore
}) {
  const { isDark } = useTheme();
  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]';
  const card = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const border = isDark ? 'border-white/8' : 'border-gray-100';

  return (
    <div className={`${bg} min-h-screen py-8 px-5 pb-24 flex items-center`}>
      <div className="max-w-2xl mx-auto w-full">
        {/* Alert Card */}
        <div className={`${card} rounded-2xl border ${border} p-8 text-center mb-8`}>
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Internal Audio Not Available</h1>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'} mb-4`}>
            Direct device audio capture isn't available for this session or device configuration.
          </p>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            {reason === 'ios' && 'iOS restricts direct internal audio capture. Use microphone or screen recording instead.'}
            {reason === 'permission' && 'Required permissions aren\'t available. Use microphone or screen recording instead.'}
            {reason === 'unsupported' && 'Your device doesn\'t support internal audio capture. Use microphone or screen recording instead.'}
          </p>
        </div>

        {/* Fallback Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Microphone Option */}
          <button
            onClick={onSelectMicrophone}
            className={`${card} rounded-2xl border ${border} p-6 text-left hover:border-purple-400 transition-colors group`}
          >
            <div className="flex items-start gap-4">
              <Mic className="w-8 h-8 text-blue-400 group-hover:text-purple-400 transition-colors" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Use Microphone</h3>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  Capture your voice clearly with your device microphone.
                </p>
              </div>
            </div>
          </button>

          {/* Screen Recording Option */}
          <button
            onClick={onSelectScreen}
            className={`${card} rounded-2xl border ${border} p-6 text-left hover:border-purple-400 transition-colors group`}
          >
            <div className="flex items-start gap-4">
              <Monitor className="w-8 h-8 text-green-400 group-hover:text-purple-400 transition-colors" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Screen + Audio</h3>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  Perfect for demos, webinars, and visual sessions.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Help Section */}
        <div className={`${card} rounded-2xl border ${border} p-6`}>
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-2">Learn More</h3>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'} mb-3`}>
                Want to know why internal audio might not be available? We'll explain platform limitations and how to enable it on supported devices.
              </p>
              <button
                onClick={onLearnMore}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} transition-colors`}
              >
                Read Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}