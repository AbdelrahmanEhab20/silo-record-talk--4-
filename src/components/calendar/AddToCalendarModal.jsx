import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { X, CalendarPlus, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";

export default function AddToCalendarModal({ item, sessionTitle, onClose, onAdded }) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState(item?.task || "");
  const [date, setDate] = useState(item?.deadline || "");
  const [time, setTime] = useState("09:00");
  const [description, setDescription] = useState(sessionTitle ? `From meeting: ${sessionTitle}` : "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/50" : "text-gray-500";
  const inputCls = `w-full text-sm px-3 py-2.5 rounded-xl border outline-none transition-colors ${
    isDark
      ? "bg-[#2C2C2E] border-white/10 text-white placeholder:text-white/25 focus:border-purple-500/50"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400"
  }`;
  const labelCls = `text-[10px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-white/40" : "text-gray-400"}`;

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;
    setLoading(true);

    const startDateTime = new Date(`${date}T${time}:00`).toISOString();
    const endDateTime = new Date(`${date}T${time}:00`);
    endDateTime.setHours(endDateTime.getHours() + 1);

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const event = {
      summary: title,
      description,
      start: { dateTime: startDateTime, timeZone: userTimeZone },
      end: { dateTime: endDateTime.toISOString(), timeZone: userTimeZone },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
    };

    const res = await base44.functions.invoke('googleCalendarUser', { action: 'create', event });
    if (res.data?.error === 'not_connected') throw new Error('Google Calendar not connected');
    setLoading(false);
    setDone(true);
    setTimeout(() => {
      onAdded?.();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className={`w-full max-w-lg rounded-t-2xl p-5 pb-8 ${isDark ? "bg-[#1C1C1E]" : "bg-white"}`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <CalendarPlus className="w-5 h-5 text-purple-400" />
            <h3 className={`text-base font-bold ${text}`}>Add to Google Calendar</h3>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/50" : "bg-gray-100 text-gray-500"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className={labelCls}>Event Title</label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Action item title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input className={inputCls} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input className={inputCls} type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !date || loading || done}
          className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          style={{ background: done ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #4285F4, #34A853)" }}
        >
          {done ? <><Check className="w-4 h-4" /> Added!</> : loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CalendarPlus className="w-4 h-4" /> Add to Calendar</>}
        </button>
      </motion.div>
    </div>
  );
}