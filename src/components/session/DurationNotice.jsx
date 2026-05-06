import React from "react";
import { AlertCircle } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function DurationNotice({ durationSeconds, subscription }) {
  const { isDark } = useTheme();
  
  if (!durationSeconds) return null;

  const minutes = Math.ceil(durationSeconds / 60);
  const planType = subscription?.plan_type || "free";
  const isProActive = subscription?.subscription_status === "active" && planType === "pro";
  const dailyRemaining = subscription?.daily_minutes_used 
    ? Math.max(0, (30 + (subscription?.daily_bonus_minutes || 0)) - subscription.daily_minutes_used)
    : 30;
  const monthlyRemaining = subscription?.monthly_minutes_used 
    ? Math.max(0, 1800 - subscription.monthly_minutes_used)
    : 1800;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      isDark 
        ? "border-blue-500/25 bg-blue-500/10" 
        : "border-blue-200 bg-blue-50"
    }`}>
      <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
      <div className="text-xs space-y-1">
        <p className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
          {minutes} minute{minutes !== 1 ? 's' : ''} will be deducted from your {planType} plan
        </p>
        <p className={isDark ? 'text-blue-200/70' : 'text-blue-700/70'}>
          {isProActive 
            ? `Monthly remaining: ${monthlyRemaining} minutes` 
            : `Daily remaining: ${dailyRemaining} minutes`}
        </p>
      </div>
    </div>
  );
}