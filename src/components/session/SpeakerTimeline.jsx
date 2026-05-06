import React, { useMemo, useState } from "react";
import { usePlayback } from "@/lib/PlaybackContext";
import { useTheme } from "@/lib/ThemeContext";

// Color palette for speakers (cycles through unique colors)
const SPEAKER_COLORS = [
  "bg-blue-500/30 border-blue-500",
  "bg-purple-500/30 border-purple-500",
  "bg-pink-500/30 border-pink-500",
  "bg-green-500/30 border-green-500",
  "bg-orange-500/30 border-orange-500",
  "bg-red-500/30 border-red-500",
  "bg-indigo-500/30 border-indigo-500",
  "bg-cyan-500/30 border-cyan-500",
];

const TEXT_COLORS = [
  "text-blue-400",
  "text-purple-400",
  "text-pink-400",
  "text-green-400",
  "text-orange-400",
  "text-red-400",
  "text-indigo-400",
  "text-cyan-400",
];

// Parse transcript to extract speaker segments with timestamps
function parseTranscriptSegments(transcript) {
  if (!transcript) return [];

  const segments = [];
  let currentTime = 0;

  // Match pattern: [HH:MM:SS] Speaker: text or [MM:SS] Speaker: text
  const lines = transcript.split('\n');
  
  for (const line of lines) {
    const timeMatch = line.match(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/);
    const speakerMatch = line.match(/\]\s*([^:]+):/);

    if (timeMatch) {
      const h = timeMatch[3] ? parseInt(timeMatch[1]) : 0;
      const m = timeMatch[3] ? parseInt(timeMatch[2]) : parseInt(timeMatch[1]);
      const s = timeMatch[3] ? parseInt(timeMatch[3]) : parseInt(timeMatch[2]);
      currentTime = h * 3600 + m * 60 + s;
    }

    if (speakerMatch) {
      const speakerLabel = speakerMatch[1].trim();
      segments.push({
        speaker: speakerLabel,
        startTime: currentTime,
        line: line,
      });
    }
  }

  // Calculate duration for each segment
  return segments.map((seg, i) => ({
    ...seg,
    duration: i < segments.length - 1 ? segments[i + 1].startTime - seg.startTime : 60,
  }));
}

export default function SpeakerTimeline({ transcript, speaker_mapping, duration }) {
  const { isDark } = useTheme();
  const { setSeekTime } = usePlayback();
  const [hoveredSpeaker, setHoveredSpeaker] = useState(null);

  const segments = useMemo(() => parseTranscriptSegments(transcript), [transcript]);

  // Group segments by speaker
  const speakerData = useMemo(() => {
    const map = new Map();
    segments.forEach((seg) => {
      const displayName = speaker_mapping?.[seg.speaker] || seg.speaker;
      if (!map.has(displayName)) {
        map.set(displayName, { segments: [], totalTime: 0 });
      }
      const data = map.get(displayName);
      data.segments.push(seg);
      data.totalTime += seg.duration;
    });
    return map;
  }, [segments, speaker_mapping]);

  // Assign colors
  const speakerColors = useMemo(() => {
    const colors = {};
    Array.from(speakerData.keys()).forEach((speaker, i) => {
      colors[speaker] = {
        bg: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
        text: TEXT_COLORS[i % TEXT_COLORS.length],
      };
    });
    return colors;
  }, [speakerData]);

  if (segments.length === 0 || !duration) return null;

  const handleSegmentClick = (segment) => {
    setSeekTime(segment.startTime);
  };

  const bg = isDark ? 'bg-[#1C1C1E]' : 'bg-gray-50';
  const border = isDark ? 'border-white/8' : 'border-gray-200';
  const textMuted = isDark ? 'text-white/40' : 'text-gray-500';

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 space-y-3`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${textMuted}`}>
        Speaker Timeline
      </p>

      {/* Main timeline bar */}
      <div className="relative h-12 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-lg overflow-hidden border border-white/5">
        {segments.map((seg, i) => {
          const start = (seg.startTime / duration) * 100;
          const width = ((seg.duration || 10) / duration) * 100;
          const displayName = speaker_mapping?.[seg.speaker] || seg.speaker;
          const colors = speakerColors[displayName];
          const isHovered = hoveredSpeaker === displayName;

          return (
            <button
              key={i}
              onClick={() => handleSegmentClick(seg)}
              onMouseEnter={() => setHoveredSpeaker(displayName)}
              onMouseLeave={() => setHoveredSpeaker(null)}
              className={`absolute h-full border-r border-white/10 transition-all ${colors.bg} hover:opacity-100 ${
                isHovered ? 'opacity-100' : 'opacity-75'
              }`}
              style={{
                left: `${start}%`,
                width: `${Math.max(width, 0.5)}%`,
              }}
              title={`${displayName} at ${Math.floor(seg.startTime / 60)}:${String(seg.startTime % 60).padStart(2, '0')}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Array.from(speakerData.entries()).map(([speaker, data]) => {
          const colors = speakerColors[speaker];
          const percentage = ((data.totalTime / duration) * 100).toFixed(0);
          const isHovered = hoveredSpeaker === speaker;

          return (
            <button
              key={speaker}
              onClick={() => {
                const firstSeg = data.segments[0];
                if (firstSeg) setSeekTime(firstSeg.startTime);
              }}
              onMouseEnter={() => setHoveredSpeaker(speaker)}
              onMouseLeave={() => setHoveredSpeaker(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${colors.bg} ${colors.text} border-opacity-50 hover:border-opacity-100 ${
                isHovered ? 'ring-2 ring-offset-2 ring-offset-transparent' : ''
              }`}
            >
              {speaker}
              <span className={`ml-1 text-[10px] ${textMuted}`}>{percentage}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}