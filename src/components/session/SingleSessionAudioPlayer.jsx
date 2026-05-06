import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import AudioPlayer from "./AudioPlayer";
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { appClient } from "@/api/appClient";
import AudioDownloadMenu from "./AudioDownloadMenu";

export default function SingleSessionAudioPlayer({ session, sessionId, onTranscriptUpdated }) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [retranscribing, setRetranscribing] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState(null);

  // When player detects a real duration and session has none stored, save it
  const handleDurationDetected = async (dur) => {
    if (!dur || dur <= 0 || !isFinite(dur)) return;
    setDetectedDuration(dur);
    if (!session.duration || session.duration <= 0) {
      try {
        await appClient.entities.Session.update(sessionId, { duration: Math.floor(dur) });
      } catch (e) {
        console.warn('Could not save detected duration:', e);
      }
    }
  };

  const handleRetranscribe = async () => {
    if (!session.audio_file_url) return;
    setRetranscribing(true);
    try {
      await appClient.entities.Session.update(sessionId, { processing_status: 'pending' });
      await appClient.functions.invoke('processSessionBackground', { session_id: sessionId, force_transcribe: true });
      if (onTranscriptUpdated) onTranscriptUpdated(sessionId);
    } catch (e) {
      console.warn('Re-transcribe failed:', e);
    }
    setRetranscribing(false);
  };

  if (!session.audio_file_url) return null;

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  return (
    <div className={`rounded-2xl border ${card} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`text-sm font-semibold ${isDark ? "text-white/80" : "text-gray-700"}`}>
            Audio
          </span>
          {(() => {
            const dur = (session.duration > 0 && isFinite(session.duration)) ? session.duration : detectedDuration;
            if (!dur || dur <= 0) return null;
            return (
              <span className={`text-xs ${textSub}`}>
                {Math.floor(dur / 60)}:{String(Math.floor(dur % 60)).padStart(2, "0")}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          {session.audio_file_url && <AudioDownloadMenu audioUrl={session.audio_file_url} />}
          {session.audio_file_url && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRetranscribe(); }}
              disabled={retranscribing}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
              title="Re-transcribe"
            >
              {retranscribing
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              <span>{retranscribing ? 'Transcribing…' : 'Re-transcribe'}</span>
            </button>
          )}
          {expanded ? (
            <ChevronUp className={`w-4 h-4 ${textSub}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${textSub}`} />
          )}
        </div>
      </button>

      {/* Expanded: audio player */}
      {expanded && (
        <div className="px-4 pb-4">
          <AudioPlayer
            audioUrl={session.audio_file_url}
            transcript={session.transcript_text}
            fallbackDuration={session.duration || detectedDuration}
            onDurationDetected={handleDurationDetected}
          />
        </div>
      )}
    </div>
  );
}