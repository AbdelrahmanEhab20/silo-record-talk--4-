import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, X, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

// compact=true: shows inline row (for use inside Recording page)
// compact=false (default): shows banner card (for use on Home page)
export default function ProcessingBanner({ compact = false }) {
  const { isDark } = useTheme();
  const [processingSessions, setProcessingSessions] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  const fetchPending = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) return;
      // Fetch all sessions that are currently processing
      const allSessions = await base44.entities.Session.filter({ user_email: user.email }, '-created_date');
      const pending = allSessions.filter(
        s => (s.processing_status === 'pending' || s.processing_status === 'processing') && !dismissed.includes(s.id)
      );
      setProcessingSessions(pending);
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, [dismissed]);

  useEffect(() => {
    const unsub = base44.entities.Session.subscribe((event) => {
      if (event.type === 'create' && event.data?.processing_status === 'pending') {
        fetchPending();
      }
      if (event.type === 'update' && (event.data?.processing_status === 'done' || event.data?.processing_status === 'failed')) {
        setProcessingSessions(prev => prev.filter(s => s.id !== event.id));
      }
    });
    return unsub;
  }, []);

  if (processingSessions.length === 0) return null;

  const latest = processingSessions[0];
  const count = processingSessions.length;

  if (compact) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border-t border-purple-500/20">
            <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0" />
            <p className="text-[11px] text-purple-300 flex-1 min-w-0 truncate">
              {count === 1
                ? `Analyzing "${latest.title}"…`
                : `${count} previous sessions processing…`}
            </p>
            <button
              onClick={() => setDismissed(prev => [...prev, ...processingSessions.map(s => s.id)])}
              className="text-purple-400/50 hover:text-purple-300 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`mb-3 px-4 py-3 rounded-2xl flex items-center gap-3 ${
          isDark ? "bg-purple-500/15 border border-purple-500/25" : "bg-purple-50 border border-purple-200"
        }`}
      >
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
            {count === 1 ? `Analyzing "${latest.title}"…` : `${count} sessions processing…`}
          </p>
          <p className={`text-[10px] mt-0.5 ${isDark ? "text-purple-400/70" : "text-purple-500"}`}>
            AI analysis running in background — your session is saved
          </p>
        </div>
        <button
          onClick={() => setDismissed(prev => [...prev, ...processingSessions.map(s => s.id)])}
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isDark ? "text-purple-400/60 hover:text-purple-300" : "text-purple-400 hover:text-purple-600"}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}