import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { CalendarDays, Clock } from "lucide-react";
import { FEATURES } from "@/utils/featureFlags";

const UPCOMING = [
  { id: "google", name: "Google Calendar", color: "#4285F4" },
  { id: "outlook", name: "Outlook / Microsoft 365", color: "#0078D4" },
];

export default function GoogleCalendarConnect({
  connected,
  loading,
  onConnect,
  onDisconnect,
}) {
  const { isDark } = useTheme();
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/50" : "text-gray-500";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";

  if (!FEATURES.calendarIntegrations) {
    return (
      <div className={`rounded-2xl border p-5 ${card}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${text}`}>External calendars</p>
            <p className={`text-xs ${sub} mt-0.5`}>
              Google Calendar and Outlook sync are planned for a later release. Your Silo
              sessions still appear on this calendar.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {UPCOMING.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                isDark ? "border-white/8 bg-white/3" : "border-gray-100 bg-gray-50"
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${p.color}20` }}
              >
                <CalendarDays className="w-4 h-4" style={{ color: p.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${text}`}>{p.name}</p>
                <p className={`text-[10px] ${sub}`}>Coming soon</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`rounded-2xl border p-5 flex items-center gap-3 ${card}`}>
        <span className={`text-sm ${sub}`}>Checking calendar connection…</span>
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
          type="button"
          onClick={onDisconnect}
          className={`text-xs px-3 py-1.5 rounded-lg border ${
            isDark ? "border-white/10 text-white/40" : "border-gray-200 text-gray-500"
          }`}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 ${card}`}>
      <p className={`text-sm font-semibold ${text} mb-1`}>Google Calendar</p>
      <p className={`text-xs ${sub} mb-4`}>
        Connect to view upcoming events and add action items to your calendar.
      </p>
      <button
        type="button"
        onClick={onConnect}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #4285F4, #34A853)" }}
      >
        Connect Google Calendar
      </button>
    </div>
  );
}
