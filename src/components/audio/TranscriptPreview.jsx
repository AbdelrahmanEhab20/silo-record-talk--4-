import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { MessageSquare, Loader2 } from 'lucide-react';

export default function TranscriptPreview({
  transcript = '',
  isProcessing = false,
  wordCount = 0
}) {
  const { isDark } = useTheme();
  const bg = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const border = isDark ? 'border-white/8' : 'border-gray-100';
  const textSub = isDark ? 'text-white/40' : 'text-gray-400';

  return (
    <div className={`${bg} rounded-2xl border ${border} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Live Transcript
        </h3>
        <div className={`text-xs ${textSub}`}>
          {wordCount} words
          {isProcessing && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
        </div>
      </div>

      <div className={`h-32 overflow-y-auto rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
        {transcript ? (
          <p className={`text-xs leading-relaxed ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            {transcript}
            {isProcessing && <span className="animate-pulse">▌</span>}
          </p>
        ) : (
          <p className={`text-xs italic ${textSub}`}>
            Transcript will appear here as you record...
          </p>
        )}
      </div>

      <div className={`text-xs ${textSub} mt-3 flex items-center gap-1`}>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        {isProcessing ? 'Processing...' : 'Ready'}
      </div>
    </div>
  );
}