import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { FEATURES } from "@/utils/featureFlags";

export default function CalendarConnect() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-[#A1A1A6]" : "text-gray-500";
  const cardBg = isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200";

  if (!FEATURES.calendarIntegrations) {
    return (
      <div className={`min-h-screen ${bg} ${text}`}>
        <div className="max-w-lg mx-auto px-5 py-6 pb-20">
          <div className="flex items-center gap-3 mb-8">
            <button
              type="button"
              onClick={() => navigate("/Calendar")}
              className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold">Connect calendar</h1>
          </div>

          <div className={`${cardBg} border rounded-2xl p-6 text-center`}>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-purple-400" />
            </div>
            <p className="text-lg font-semibold mb-2">Coming in a future release</p>
            <p className={`text-sm ${sub} mb-6`}>
              Google Calendar and Outlook / Microsoft 365 connections are not available yet.
              You can still use the in-app calendar to view sessions by date.
            </p>
            <button
              type="button"
              onClick={() => navigate("/Calendar")}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
            >
              Back to calendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  navigate("/Calendar", { replace: true });
  return null;
}
