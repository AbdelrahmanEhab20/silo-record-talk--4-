import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import AudioPlayer from "./AudioPlayer";
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { appClient } from "@/api/appClient";
import AudioDownloadMenu from "./AudioDownloadMenu";

const isTruncatedPreview = (text) => {
  const t = String(text || "");
  return t.includes("...[truncated") || t.includes("see transcript_file_url") || t.includes("upload failed; transcript truncated");
};

export default function SubSessionAudioPlayers({ sessionId, subsessions, onTranscriptUpdated }) {
  const { isDark } = useTheme();
  const [expandedIdx, setExpandedIdx] = useState(0); // first part open by default
  const [retranscribing, setRetranscribing] = useState({}); // { [subId]: true }

  const handleRetranscribe = async (sub) => {
    if (!sub.audio_file_url) return;
    setRetranscribing(prev => ({ ...prev, [sub.id]: true }));
    try {
      await appClient.entities.Session.update(sub.id, { processing_status: 'pending' });
      // force_transcribe: true ensures Whisper re-runs AND diarization runs on result
      await appClient.functions.invoke('processSessionBackground', { session_id: sub.id, force_transcribe: true });
      if (onTranscriptUpdated) onTranscriptUpdated(sub.id);
    } catch (e) {
      console.warn('Re-transcribe failed:', e);
    }
    setRetranscribing(prev => ({ ...prev, [sub.id]: false }));
  };

  if (!subsessions) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
      </div>
    );
  }

  if (subsessions.length === 0) return null;

  const sorted = [...subsessions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  return (
    <div className="space-y-2">
      {sorted.map((sub, idx) => (
        <div key={sub.id} className={`rounded-2xl border ${card} overflow-hidden`}>
          {/* Part header */}
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-600"}`}>
                {idx + 1}
              </span>
              <span className={`text-sm font-semibold ${isDark ? "text-white/80" : "text-gray-700"}`}>
                Part {idx + 1}
              </span>
              {sub.duration > 0 && (
                <span className={`text-xs ${textSub}`}>
                  {Math.floor(sub.duration / 60)}:{String(Math.floor(sub.duration % 60)).padStart(2, "0")}
                </span>
              )}
              {sub.processing_status === "processing" && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-600"}`}>
                  Processing
                </span>
              )}
              {sub.processing_status === "failed" && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-600"}`}>
                  Failed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {sub.audio_file_url && (
                <AudioDownloadMenu audioUrl={sub.audio_file_url} partLabel={`Part ${idx + 1}`} />
              )}
              {sub.audio_file_url && (() => {
                const text = (sub.transcript_text || "").trim();
                const looksTruncated = isTruncatedPreview(text);
                const isDone = sub.processing_status === "done";
                const isLoading = retranscribing[sub.id];

                // Disable only when truly done with non-truncated transcript
                const isDisabled = isDone && !!text && !looksTruncated && !isLoading;
                
                return (
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!isDisabled) handleRetranscribe(sub); }}
                    disabled={isDisabled || isLoading}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                      isLoading
                        ? (isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600')
                        : isDisabled
                          ? (isDark ? 'bg-white/3 text-white/20 cursor-not-allowed' : 'bg-gray-50 text-gray-300 cursor-not-allowed')
                          : (isDark ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300' : 'bg-purple-100 hover:bg-purple-200 text-purple-600')
                    }`}
                    title={
                      isLoading
                        ? "Transcribing..."
                        : isDisabled
                          ? "Already transcribed"
                          : looksTruncated
                            ? "Rebuild full transcript for this part"
                            : "Transcribe this part"
                    }
                  >
                    {isLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RefreshCw className="w-3 h-3" />}
                    <span>
                      {isLoading
                        ? "Transcribing…"
                        : isDisabled
                          ? "Transcribed"
                          : looksTruncated
                            ? "Fix Transcript"
                            : "Transcribe"}
                    </span>
                  </button>
                );
              })()}
              {expandedIdx === idx ? (
                <ChevronUp className={`w-4 h-4 ${textSub}`} />
              ) : (
                <ChevronDown className={`w-4 h-4 ${textSub}`} />
              )}
            </div>
          </button>

          {/* Expanded: audio player */}
          {expandedIdx === idx && (
            <div className="px-4 pb-4">
              {sub.audio_file_url ? (
                <AudioPlayer
                  audioUrl={sub.audio_file_url}
                  transcript={sub.transcript_text}
                  fallbackDuration={sub.duration}
                />
              ) : (
                <p className={`text-xs ${textSub} py-2`}>No audio available for this part.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}