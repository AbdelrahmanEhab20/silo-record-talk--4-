import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { X, CalendarPlus, Loader2, Check, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

const TARGET_STORAGE_KEY = "silo:calendar:add-target";

export default function AddToCalendarModal({ item, sessionTitle, onClose, onAdded }) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState(item?.task || "");
  const [date, setDate] = useState(item?.deadline || "");
  const [time, setTime] = useState("09:00");
  const [description, setDescription] = useState(sessionTitle ? `From meeting: ${sessionTitle}` : "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [providers, setProviders] = useState({ google: false, outlook: false, loading: true });
  const [target, setTarget] = useState(() => {
    try {
      return localStorage.getItem(TARGET_STORAGE_KEY) || "google";
    } catch {
      return "google";
    }
  });

  const updateTarget = (next) => {
    setTarget(next);
    try { localStorage.setItem(TARGET_STORAGE_KEY, next); } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const [g, o] = await Promise.all([
          appClient.googleCalendar.status().catch(() => ({})),
          appClient.outlookCalendar.status().catch(() => ({})),
        ]);
        const next = { google: !!g?.connected, outlook: !!o?.connected, loading: false };
        setProviders(next);
        if (target === "google" && !next.google && next.outlook) updateTarget("outlook");
        else if (target === "outlook" && !next.outlook && next.google) updateTarget("google");
      } catch {
        setProviders({ google: false, outlook: false, loading: false });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    try {
      const client = target === "outlook" ? appClient.outlookCalendar : appClient.googleCalendar;
      const res = await client.createEvent(event);
      if (res?.error === "not_connected") {
        throw new Error(
          target === "outlook" ? "Outlook not connected" : "Google Calendar not connected"
        );
      }
      setLoading(false);
      setDone(true);
      setTimeout(() => {
        onAdded?.();
        onClose();
      }, 1200);
    } catch (err) {
      setLoading(false);
      console.error("Add to calendar failed:", err);
      alert(err.message || "Failed to add event");
    }
  };

  const noneConnected = !providers.loading && !providers.google && !providers.outlook;
  const bothConnected = providers.google && providers.outlook;

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
            <h3 className={`text-base font-bold ${text}`}>Add to calendar</h3>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/50" : "bg-gray-100 text-gray-500"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          {noneConnected ? (
            <div className={`rounded-xl border p-4 text-sm ${isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              No calendar is connected. Open Calendar → connect Google or Outlook first.
            </div>
          ) : bothConnected ? (
            <div>
              <label className={labelCls}>Add to</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "google", label: "Google", color: "#4285F4" },
                  { id: "outlook", label: "Outlook", color: "#0078D4" },
                ].map((opt) => {
                  const active = target === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateTarget(opt.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition ${
                        active
                          ? "text-white"
                          : isDark
                          ? "border-white/10 text-white/60"
                          : "border-gray-200 text-gray-600"
                      }`}
                      style={active ? { background: opt.color, borderColor: opt.color } : {}}
                    >
                      <CalendarDays className="w-4 h-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
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
          disabled={!title.trim() || !date || loading || done || noneConnected}
          className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          style={{
            background: done
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : target === "outlook"
              ? "linear-gradient(135deg, #0078D4, #106EBE)"
              : "linear-gradient(135deg, #4285F4, #34A853)",
          }}
        >
          {done ? (
            <><Check className="w-4 h-4" /> Added!</>
          ) : loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><CalendarPlus className="w-4 h-4" /> Add to {target === "outlook" ? "Outlook" : "Google"}</>
          )}
        </button>
      </motion.div>
    </div>
  );
}