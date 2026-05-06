import React, { useEffect, useRef } from "react";
import { Smartphone } from "lucide-react";

const isDesktop = () => {
  const ua = navigator.userAgent;
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) && window.innerWidth >= 768;
};

export default function LiveTranscriptBox({ segments = [], isDark, textSub, card, border }) {
  const scrollRef = useRef(null);
  const desktop = isDesktop();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  const wordCount = segments.reduce((sum, s) => sum + (s.text || '').split(' ').filter(Boolean).length, 0);

  return (
    <div className={`rounded-2xl border ${border} ${card} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Live Transcript</h3>
        </div>
        <span className={`text-xs ${textSub}`}>{wordCount} words</span>
      </div>
      {desktop && (
        <div className="mx-4 mb-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-400 leading-snug">
            <span className="font-semibold">Live Transcript is Limited on Desktop.</span> For a better live transcript experience, use a mobile device to record the session.
          </p>
        </div>
      )}
      <div ref={scrollRef} className="h-44 overflow-y-auto px-4 pb-4 scroll-smooth">
        {segments.length === 0 ? (
          <p className={`text-xs italic ${textSub} mt-2`}>Transcript will appear here as you speak…</p>
        ) : (
          <div className="space-y-2">
            {segments.map((seg, i) => (
              <div key={i} className="flex gap-2">
                <span className={`text-[10px] font-mono ${textSub} shrink-0 w-10 mt-0.5`}>{seg.timestamp}</span>
                <span className={`text-xs leading-relaxed ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{seg.text}</span>
              </div>
            ))}
            <span className={`animate-pulse text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>▌</span>
          </div>
        )}
      </div>
    </div>
  );
}