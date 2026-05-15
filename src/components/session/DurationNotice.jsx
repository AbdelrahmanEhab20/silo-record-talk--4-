import React from "react";
import { AlertCircle } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { getMinutesUsed, getUsagePeriodLabel } from "@/utils/planConfig";

export default function DurationNotice({ durationSeconds, subscription }) {
  const { isDark } = useTheme();

  if (!durationSeconds) return null;

  const minutes = Math.ceil(durationSeconds / 60);
  const used = getMinutesUsed(subscription);
  const periodLabel = getUsagePeriodLabel();

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        isDark ? "border-blue-500/25 bg-blue-500/10" : "border-blue-200 bg-blue-50"
      }`}
    >
      <AlertCircle
        className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? "text-blue-400" : "text-blue-600"}`}
      />
      <div className="text-xs space-y-1">
        <p className={`font-semibold ${isDark ? "text-blue-300" : "text-blue-900"}`}>
          {minutes} minute{minutes !== 1 ? "s" : ""} will be added to your usage
        </p>
        <p className={isDark ? "text-blue-200/70" : "text-blue-700/70"}>
          {periodLabel}: {used} min recorded so far (tracked for your organization)
        </p>
      </div>
    </div>
  );
}
