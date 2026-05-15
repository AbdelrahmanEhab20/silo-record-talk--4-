import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import {
  getMinutesUsed,
  getUsagePeriodLabel,
  getDisplayCap,
  getRemainingMinutes,
  getUsagePercent,
} from "@/utils/planConfig";

function formatMinutes(total) {
  const mins = Math.max(0, Math.round(total));
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
}

export default function MinutesStatusBar() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const user = await appClient.auth.me();
        const subs = await appClient.entities.PlanSubscription.filter({
          user_email: user.email,
        });
        if (subs.length > 0) setSub(subs[0]);
      } catch {
        /* optional — bar hidden until subscription loads */
      }
    };
    fetchSub();
  }, []);

  const used = getMinutesUsed(sub);
  const cap = getDisplayCap(sub);
  const remaining = cap != null ? getRemainingMinutes(sub) : null;
  const pct = cap != null ? getUsagePercent(sub) : 0;
  const periodLabel = getUsagePeriodLabel();

  return (
    <button
      type="button"
      onClick={() => navigate("/Usage")}
      className={`mx-5 mb-4 w-[calc(100%-2.5rem)] text-left px-4 py-3 rounded-2xl border transition-colors ${
        isDark ? "bg-white/5 border-white/8 hover:bg-white/8" : "bg-white border-gray-100 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-semibold ${isDark ? "text-white/70" : "text-gray-700"}`}>
          {periodLabel}
        </span>
        <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
          {cap != null ? `${formatMinutes(remaining)} left` : `${formatMinutes(used)} used`}
        </span>
      </div>
      {cap != null ? (
        <>
          <div className={`w-full h-1.5 rounded-full ${isDark ? "bg-white/10" : "bg-gray-100"}`}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #A855F7, #6366F1)",
              }}
            />
          </div>
          <p className={`text-[10px] mt-1 ${isDark ? "text-white/30" : "text-gray-400"}`}>
            {formatMinutes(used)} of {formatMinutes(cap)} recorded
          </p>
        </>
      ) : (
        <p className={`text-[10px] mt-0.5 ${isDark ? "text-white/30" : "text-gray-400"}`}>
          {formatMinutes(used)} recorded · Tap for details
        </p>
      )}
    </button>
  );
}
