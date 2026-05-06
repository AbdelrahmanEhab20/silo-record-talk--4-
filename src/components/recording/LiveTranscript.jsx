import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPEAKER_COLORS = ['#A855F7', '#38BDF8', '#4ADE80', '#FB923C', '#F472B6'];
const speakerColorMap = {};
let colorIndex = 0;
const getSpeakerColor = (speaker) => {
  if (!speaker) return '#A855F7';
  if (!speakerColorMap[speaker]) {
    speakerColorMap[speaker] = SPEAKER_COLORS[colorIndex % SPEAKER_COLORS.length];
    colorIndex++;
  }
  return speakerColorMap[speaker];
};

export default function LiveTranscript({ segments }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current;
      // Auto-scroll if user is near bottom (within 100px)
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [segments]);

  if (!segments || segments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/20 text-base">Live transcript appears here if enabled by your browser permissions; otherwise, generate it after recording.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-1 space-y-3 scroll-smooth">
      <AnimatePresence initial={false}>
        {segments.map((seg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex gap-3"
          >
            <span className="text-xs text-white/25 font-mono mt-0.5 shrink-0 w-12">
              {seg.timestamp}
            </span>
            <div className="flex-1 min-w-0">
              {seg.speaker && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider mr-1.5"
                  style={{ color: getSpeakerColor(seg.speaker) }}
                >
                  {seg.speaker}
                </span>
              )}
              <span className="text-white/80 text-sm leading-relaxed">{seg.text}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}