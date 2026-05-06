import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Pencil, Check, X, Loader2 } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function AttendeeCard({ attendee, index, audioUrl, transcript, onUpdate, onApplyToAll }) {
  const { isDark } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(attendee.name || "");
  const [editRole, setEditRole] = useState(attendee.role || "");
  const [audioLoading, setAudioLoading] = useState(false);
  const [showApplyMenu, setShowApplyMenu] = useState(false);
  const audioRef = useRef(null);

  // Find the first occurrence of this speaker in the transcript and return a time range
  const getTimeRange = () => {
    if (!transcript || !attendee.name) return { startTime: 0, endTime: 15 };

    const timeToSeconds = (time) => {
      const parts = time.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return NaN;
    };

    const lines = transcript.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes(attendee.name.toLowerCase())) {
        const tsMatch = line.match(/\[(\d+:\d+(?::\d+)?)\]/);
        if (tsMatch) {
          const t = timeToSeconds(tsMatch[1]);
          if (!isNaN(t)) {
            return { startTime: Math.max(0, t - 0.5), endTime: t + 12 };
          }
        }
      }
    }

    // No timestamp found but speaker exists — just play from start
    if (transcript.toLowerCase().includes(attendee.name.toLowerCase())) {
      return { startTime: 0, endTime: 12 };
    }

    return null;
  };

  const timeRange = getTimeRange();

  useEffect(() => () => clearTimeout(stopTimeoutRef.current), []);

  const stopTimeoutRef = useRef(null);

  const playAudioClip = () => {
    if (!audioUrl || !timeRange) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      clearTimeout(stopTimeoutRef.current);
      return;
    }

    setAudioLoading(true);
    clearTimeout(stopTimeoutRef.current);

    const doPlay = () => {
      audio.currentTime = timeRange.startTime;
      audio.play().then(() => {
        setAudioLoading(false);
        setIsPlaying(true);
        const clipDuration = (timeRange.endTime - timeRange.startTime) * 1000;
        stopTimeoutRef.current = setTimeout(() => {
          audio.pause();
          setIsPlaying(false);
        }, clipDuration);
      }).catch((e) => {
        console.error("Play error:", e);
        setAudioLoading(false);
      });
    };

    // If audio src is already set and ready, seek and play directly
    if (audio.src === audioUrl && audio.readyState >= 2) {
      doPlay();
      return;
    }

    audio.src = audioUrl;
    audio.onerror = (e) => {
      console.error("Audio error:", e);
      setAudioLoading(false);
    };
    audio.addEventListener("canplay", doPlay, { once: true });
    audio.load();
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(index, { ...attendee, name: editName, role: editRole });
    }
    setEditMode(false);
    setShowApplyMenu(false);
  };

  const handleApplyToAll = () => {
    if (onApplyToAll && attendee.name !== editName) {
      onApplyToAll(attendee.name, editName);
    }
    setShowApplyMenu(false);
  };

  const bgGradient = `hsl(${(index * 67 + 200) % 360}, 60%, 55%)`;

  return (
    <div
      className={`rounded-xl border p-3 mb-3 ${
        isDark ? "border-white/8 bg-white/4" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: bgGradient }}
        >
          {editName?.[0]?.toUpperCase() || "?"}
        </div>

        <div className="flex-1 min-w-0">
          {editMode ? (
            <>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={`w-full text-sm font-semibold px-2 py-1 rounded border mb-2 outline-none transition-colors ${
                  isDark
                    ? "bg-[#2C2C2E] border-white/20 text-white placeholder-white/50 focus:border-purple-500/50"
                    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-400"
                }`}
                placeholder="Name"
              />
              <input
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className={`w-full text-xs px-2 py-1 rounded border outline-none transition-colors ${
                  isDark
                    ? "bg-[#2C2C2E] border-white/20 text-white/80 placeholder-white/40 focus:border-purple-500/50"
                    : "bg-gray-50 border-gray-300 text-gray-600 placeholder-gray-400 focus:border-purple-400"
                }`}
                placeholder="Role/Title"
              />
            </>
          ) : (
            <>
              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                {editName}
              </p>
              {editRole && (
                <p className={`text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>{editRole}</p>
              )}
            </>
          )}

          {/* Voice sample quote */}
          {attendee.sample_quote && !editMode && (
            <p className={`text-xs mt-2 italic leading-snug ${isDark ? "text-white/40" : "text-gray-400"}`}>
              "{attendee.sample_quote}"
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {editMode ? (
            <>
              <button
                onClick={handleSave}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-emerald-500/80 hover:bg-emerald-500 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              {editName !== attendee.name && (
                <div className="relative">
                  <button
                    onClick={() => setShowApplyMenu(!showApplyMenu)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-xs font-semibold ${
                      isDark
                        ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                        : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                    }`}
                    title="Apply this name change to all mentions"
                  >
                    ⇄
                  </button>
                  {showApplyMenu && (
                    <div className={`absolute right-0 top-8 z-10 rounded-lg border shadow-lg p-2 whitespace-nowrap text-xs ${
                      isDark
                        ? "bg-[#1C1C1E] border-white/10 text-white"
                        : "bg-white border-gray-200 text-gray-900"
                    }`}>
                      <button
                        onClick={handleApplyToAll}
                        className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                          isDark
                            ? "hover:bg-purple-500/20 hover:text-purple-400"
                            : "hover:bg-purple-50 hover:text-purple-600"
                        }`}
                      >
                        Apply to all "{attendee.name}"
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditName(attendee.name);
                  setEditRole(attendee.role || "");
                  setShowApplyMenu(false);
                }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isDark
                    ? "bg-white/8 text-white/40 hover:bg-white/12"
                    : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={playAudioClip}
                disabled={audioLoading || !timeRange}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  !timeRange
                    ? isDark
                      ? "bg-white/4 text-white/20 cursor-not-allowed"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : isPlaying || audioLoading
                    ? isDark
                      ? "bg-purple-500/30 text-purple-400"
                      : "bg-purple-100 text-purple-600"
                    : isDark
                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                }`}
                title={timeRange ? (isPlaying ? "Stop" : "Play voice sample") : "Voice sample not available"}
              >
                {audioLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setEditMode(true)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isDark
                    ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                }`}
                title="Edit name and role"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}