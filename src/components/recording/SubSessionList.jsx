import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Clock, FileText, ChevronDown, ChevronUp, RotateCw } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";

export default function SubSessionList({ subsessions, onRetryFailed }) {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  if (!subsessions || subsessions.length === 0) return null;

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  const formatDuration = (secs) => {
    if (!secs) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleRetry = async (sub) => {
    if (!sub.sessionId || sub.status !== "failed") return;
    // Trigger reprocessing
    await appClient.functions.invoke('processSessionBackground', { 
      session_id: sub.sessionId, 
      force_transcribe: true 
    }).catch(e => console.warn("Retry failed:", e));
  };

  const statusIcon = (status, sub) => {
    if (status === "done") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (status === "failed") return <span className="text-red-400 text-xs">✕</span>;
    return <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />;
  };

  const statusLabel = (status) => {
    if (status === "done") return "Processed";
    if (status === "failed") return "Failed";
    if (status === "processing") return "Processing…";
    return "Uploading…";
  };

  const doneCount = subsessions.filter(s => s.status === "done").length;

  return (
    <div className={`rounded-2xl border ${card} overflow-hidden`}>
      {/* Header — always visible, click to toggle */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>
            Completed Parts ({subsessions.length})
          </span>
          {doneCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">
              {doneCount} ready
            </span>
          )}
          {subsessions.some(s => s.status === "uploading" || s.status === "processing") && (
            <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
          )}
        </div>
        {isOpen ? (
          <ChevronUp className={`w-4 h-4 ${textSub}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${textSub}`} />
        )}
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 space-y-2">
              <AnimatePresence initial={false}>
                {subsessions.map((sub, idx) => (
                  <motion.div
                    key={sub.localId || idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isDark ? "bg-white/5" : "bg-gray-50"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isDark ? "bg-white/10 text-white/60" : "bg-gray-200 text-gray-500"}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isDark ? "text-white/80" : "text-gray-700"}`}>
                          Part {idx + 1}
                        </span>
                        <span className={`text-[10px] flex items-center gap-1 ${textSub}`}>
                          <Clock className="w-2.5 h-2.5" />
                          {formatDuration(sub.duration)}
                        </span>
                        {sub.wordCount > 0 && (
                          <span className={`text-[10px] flex items-center gap-1 ${textSub}`}>
                            <FileText className="w-2.5 h-2.5" />
                            {sub.wordCount} words
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] truncate mt-0.5 ${textSub}`}>
                        {sub.transcript ? sub.transcript.slice(0, 80) + (sub.transcript.length > 80 ? "…" : "") : "No transcript yet"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                       {statusIcon(sub.status, sub)}
                       <span className={`text-[10px] ${textSub}`}>{statusLabel(sub.status)}</span>
                       {sub.status === "failed" && (
                         <button
                           onClick={() => handleRetry(sub)}
                           className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                           title="Retry processing"
                         >
                           <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                         </button>
                       )}
                     </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <p className={`text-[10px] mt-1 text-center ${textSub}`}>
                All parts will be merged when you press Stop
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}