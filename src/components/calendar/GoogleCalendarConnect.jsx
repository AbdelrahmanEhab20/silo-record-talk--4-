import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Loader2, LogOut, RefreshCw } from "lucide-react";

const CONNECTOR_ID = "69f36381360cadf794b1d9be";

export default function GoogleCalendarConnect({ connected, loading, onConnect, onDisconnect }) {
  const { isDark } = useTheme();
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/50" : "text-gray-500";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";

  if (loading) {
    return (
      <div className={`rounded-2xl border p-5 flex items-center gap-3 ${card}`}>
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        <span className={`text-sm ${sub}`}>Checking Google Calendar connection…</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${card}`}>
        <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
          <CalendarDays className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${text}`}>Google Calendar</p>
          <p className="text-xs text-green-400">Connected</p>
        </div>
        <button
          onClick={onDisconnect}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30" : "border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300"}`}
        >
          <LogOut className="w-3 h-3" />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 ${card}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${text}`}>Google Calendar</p>
          <p className={`text-xs ${sub}`}>Not connected</p>
        </div>
      </div>
      <p className={`text-xs ${sub} mb-4`}>Connect your Google Calendar to view upcoming events and create reminders from action items.</p>
      <button
        onClick={onConnect}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg, #4285F4, #34A853)" }}
      >
        Connect Google Calendar
      </button>
    </div>
  );
}