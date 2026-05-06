import React from "react";
import { motion } from "framer-motion";

export default function RecordingIndicator({ duration }) {
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-5xl font-light text-white tracking-widest tabular-nums" style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em' }}>
        {formatTime(duration)}
      </span>
      <div className="flex items-center gap-2">
        <motion.div
          className="w-2.5 h-2.5 rounded-full bg-red-500"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="text-xs font-medium text-gray-400 tracking-widest">RECORDING</span>
      </div>
    </div>
  );
}