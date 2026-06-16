import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import {
  getMinutesUsed,
  getUsagePeriodLabel,
  getDisplayCap,
  getRemainingMinutes,
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
  const periodLabel = getUsagePeriodLabel();

  return (
    <button
      type="button"
      onClick={() => navigate("/Usage")}
      className={`w-full text-left px-3.5 py-2.5 rounded-2xl border flex items-center gap-2.5 transition-colors ${
        isDark ? "bg-white/5 border-white/8 hover:bg-white/8" : "bg-white border-gray-100 hover:bg-gray-50"
      }`}
    >
      <span aria-hidden className="text-base leading-none">
        👑
      </span>
      <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
        {periodLabel}
      </span>
      <span className="ml-auto flex items-center gap-2">
        <span className={`text-xs ${isDark ? "text-white/60" : "text-gray-500"}`}>
          {cap != null ? `${formatMinutes(remaining)} left` : `${formatMinutes(used)} used`}
        </span>
        <ChevronRight className={`w-4 h-4 ${isDark ? "text-white/40" : "text-gray-400"}`} />
      </span>
    </button>
  );
}
