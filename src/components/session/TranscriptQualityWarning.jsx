import React from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TranscriptQualityWarning({
  issue,
  isRetranscribing = false,
  onRetranscribe,
  onDismiss
}) {
  const isDark = document.documentElement.classList.contains('dark');

  const issueConfig = {
    empty: {
      title: 'No Voice Captured',
      message: 'We couldn\'t detect any speech in the audio. Try transcribing again or check your audio file.',
      icon: '🔇'
    },
    insufficient: {
      title: 'Insufficient Data',
      message: 'The transcript is too short or unclear to generate a meaningful summary. Try transcribing again or upload clearer audio.',
      icon: '📝'
    },
    unclear: {
      title: 'Audio Quality Issue',
      message: 'The audio quality is too low to create an accurate summary. Try transcribing again or check your audio source.',
      icon: '📢'
    }
  };

  const config = issueConfig[issue] || issueConfig.insufficient;

  return (
    <div className={`rounded-xl border border-dashed p-4 mb-6 ${
      isDark 
        ? 'bg-amber-500/10 border-amber-500/30' 
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex gap-3">
        <div className="text-2xl mt-0.5">{config.icon}</div>
        <div className="flex-1">
          <h4 className={`text-sm font-semibold mb-1 ${
            isDark ? 'text-amber-300' : 'text-amber-900'
          }`}>
            {config.title}
          </h4>
          <p className={`text-xs mb-3 leading-relaxed ${
            isDark ? 'text-amber-200/70' : 'text-amber-800'
          }`}>
            {config.message}
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={onRetranscribe}
              disabled={isRetranscribing}
              variant="outline"
              size="sm"
              className={`text-xs gap-1.5 rounded-full ${
                isDark
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
              }`}
            >
              {isRetranscribing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Transcript Again
            </Button>
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}