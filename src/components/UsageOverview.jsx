import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import { motion } from "framer-motion";
import { Building2, ChevronRight, Clock } from "lucide-react";
import {
  getMinutesUsed,
  getUsagePeriodLabel,
  getDisplayCap,
  getRemainingMinutes,
  getUsagePercent,
} from "@/utils/planConfig";

function formatMinutes(total) {
  const mins = Math.max(0, Math.round(total));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins} min`;
}

export default function UsageOverview() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const user = await appClient.auth.me();
        if (user?.email) {
          const subs = await appClient.entities.PlanSubscription.filter({
            user_email: user.email,
          });
          if (subs.length > 0) setSubscription(subs[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  if (loading) return null;

  const used = getMinutesUsed(subscription);
  const cap = getDisplayCap(subscription);
  const remaining = cap != null ? getRemainingMinutes(subscription) : null;
  const percent = cap != null ? getUsagePercent(subscription) : 0;
  const periodLabel = getUsagePeriodLabel();

  return (
    <motion.div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1a1a2e, #16213e)"
          : "linear-gradient(135deg, #667eea, #764ba2)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2"
        >
          <Building2 className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">Usage</span>
        </motion.div>
        <button
          type="button"
          onClick={() => navigate("/Usage")}
          className="text-xs text-white/70 flex items-center gap-1 hover:text-white transition-colors"
        >
          Details <ChevronRight className="w-3 h-3" />
        </button>
      </motion.div>

      <div>
        <p className="text-xs text-white/60 mb-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {periodLabel}
        </p>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-2xl font-bold text-white">{formatMinutes(used)}</span>
          <span className="text-xs text-white/60">recorded</span>
        </div>

        {cap != null ? (
          <>
            <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-white/80"
              />
            </div>
            <p className="text-xs text-white/50 mt-1">
              {formatMinutes(used)} of {formatMinutes(cap)} · {formatMinutes(remaining)} remaining
            </p>
          </>
        ) : (
          <p className="text-xs text-white/50">
            Minutes are tracked for your organization. Limits are set by your administrator.
          </p>
        )}
      </div>
    </motion.div>
  );
}
