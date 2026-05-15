import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { motion } from "framer-motion";

export default function MinutesUsageDisplay({ used, total, label, isDaily }) {
  const { isDark } = useTheme();
  const percent = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const remaining = Math.max(0, total - used);
  const isLow = total > 0 && percent > 80;

  const color = isLow ? "#F59E0B" : "#A855F7";

  const fmt = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins} min`;
  };

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: isDark ? "#1C1C1E" : "#F5F5F7" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold" style={{ color: isDark ? "#E5E5EA" : "#3C3C43" }}>
          {label || (isDaily ? "Daily usage" : "Monthly usage")}
        </p>
        {total > 0 && (
          <p className="text-xs" style={{ color: isDark ? "#8B8B90" : "#A1A1A6" }}>
            {fmt(remaining)} left
          </p>
        )}
      </div>
      {total > 0 && (
        <>
          <div
            className="w-full h-2 rounded-full overflow-hidden mb-1"
            style={{ backgroundColor: isDark ? "#404040" : "#E8E8ED" }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percent, 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <p className="text-xs" style={{ color: isDark ? "#6E6E73" : "#A1A1A6" }}>
            {fmt(used)} of {fmt(total)} used
          </p>
        </>
      )}
      {total <= 0 && (
        <p className="text-xs" style={{ color: isDark ? "#6E6E73" : "#A1A1A6" }}>
          {fmt(used)} recorded
        </p>
      )}
    </div>
  );
}
