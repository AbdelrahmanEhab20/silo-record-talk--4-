import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/lib/ThemeContext";
import { Building2, ChevronRight } from "lucide-react";
import { getMinutesUsed, getUsagePeriodLabel } from "@/utils/planConfig";

function formatMinutes(total) {
  const mins = Math.max(0, Math.round(total));
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
}

export default function PlansSection({ subscription }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const used = getMinutesUsed(subscription);
  const periodLabel = getUsagePeriodLabel();

  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-semibold uppercase tracking-wider"
        style={{ color: isDark ? "#A1A1A6" : "#6E6E73" }}
      >
        Usage
      </h3>

      <button
        type="button"
        onClick={() => navigate("/Usage")}
        className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
        style={{
          backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
          border: `1px solid ${isDark ? "#2C2C2E" : "#E8E8ED"}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #A855F7, #6366F1)",
            }}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm" style={{ color: isDark ? "#FFFFFF" : "#000000" }}>
              {periodLabel}
            </p>
            <p className="text-xs" style={{ color: isDark ? "#A1A1A6" : "#6E6E73" }}>
              {formatMinutes(used)} recorded
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4" style={{ color: isDark ? "#6E6E73" : "#C7C7CC" }} />
      </button>
    </div>
  );
}
