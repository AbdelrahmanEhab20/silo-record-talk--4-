import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { motion } from "framer-motion";
import { ChevronLeft, Building2, Clock, BarChart3 } from "lucide-react";
import {
  getMinutesUsed,
  getUsagePeriodLabel,
  getDisplayCap,
  getRemainingMinutes,
  getUsagePercent,
  DEPLOYMENT_MODE,
} from "@/utils/planConfig";
import { isOrgAdmin } from "@/lib/roles";

function formatMinutes(total) {
  const mins = Math.max(0, Math.round(total));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins} min`;
}

export default function Usage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [subscription, setSubscription] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await appClient.auth.me();
        setUser(u);
        if (u?.email) {
          const subs = await appClient.entities.PlanSubscription.filter({
            user_email: u.email,
          });
          if (subs.length > 0) setSubscription(subs[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const bg = isDark ? "#000000" : "#F5F5F7";
  const card = isDark ? "#1C1C1E" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#000000";
  const sub = isDark ? "#A1A1A6" : "#6E6E73";
  const border = isDark ? "#2C2C2E" : "#E8E8ED";

  const used = getMinutesUsed(subscription);
  const cap = getDisplayCap(subscription);
  const remaining = cap != null ? getRemainingMinutes(subscription) : null;
  const percent = cap != null ? getUsagePercent(subscription) : 0;

  return (
    <motion.div className="min-h-screen pb-24" style={{ backgroundColor: bg }}>
      <div
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: isDark ? "rgba(0,0,0,0.85)" : "rgba(245,245,247,0.85)",
          borderColor: border,
          backdropFilter: "blur(20px)",
        }}
      >
        <motion.div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/Settings")}
            className="p-2 rounded-xl transition-colors"
            style={{ backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF", color: text }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: text }}>
            Usage
          </h1>
        </motion.div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">
        <div className="text-center mb-2">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: isDark
                ? "linear-gradient(135deg, #A855F7, #6366F1)"
                : "linear-gradient(135deg, #667eea, #764ba2)",
            }}
          >
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: text }}>
            Your usage
          </h2>
          <p className="text-sm" style={{ color: sub }}>
            Standalone deployment — minutes are tracked per account for your organization.
          </p>
        </div>

        {loading ? (
          <motion.div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </motion.div>
        ) : (
          <>
            <div className="rounded-3xl p-6 border" style={{ backgroundColor: card, borderColor: border }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: sub }}>
                {getUsagePeriodLabel()}
              </p>
              <p className="text-4xl font-bold mb-1" style={{ color: text }}>
                {formatMinutes(used)}
              </p>
              <p className="text-sm mb-4" style={{ color: sub }}>
                Total recording minutes
              </p>

              {cap != null ? (
                <>
                  <motion.div
                    className="w-full h-2.5 rounded-full overflow-hidden mb-2"
                    style={{ backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #A855F7, #6366F1)",
                      }}
                    />
                  </motion.div>
                  <p className="text-xs" style={{ color: sub }}>
                    {formatMinutes(remaining)} remaining of {formatMinutes(cap)} allocated
                  </p>
                </>
              ) : (
                <p className="text-xs" style={{ color: sub }}>
                  No usage cap is configured yet. Your organization administrator can set limits
                  when the admin dashboard is enabled.
                </p>
              )}
            </div>

            <div className="rounded-3xl p-6 border space-y-4" style={{ backgroundColor: card, borderColor: border }}>
              <p className="text-sm font-semibold" style={{ color: text }}>
                Account
              </p>
              <motion.div className="flex items-center gap-3 text-sm" style={{ color: sub }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Clock className="w-4 h-4 shrink-0" />
                <span>{user?.email || "—"}</span>
              </motion.div>
              <div className="flex items-center gap-3 text-sm" style={{ color: sub }}>
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Deployment: {DEPLOYMENT_MODE}</span>
              </div>
            </div>

            {isOrgAdmin(user) ? (
              <button
                type="button"
                onClick={() => navigate("/admin/org")}
                className="w-full rounded-2xl p-4 border text-left transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: isDark ? "rgba(168,85,247,0.08)" : "rgba(102,126,234,0.08)",
                  borderColor: isDark ? "rgba(168,85,247,0.25)" : "rgba(102,126,234,0.25)",
                }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: text }}>
                  Organization admin
                </p>
                <p className="text-xs leading-relaxed" style={{ color: sub }}>
                  Manage users, invitations, and usage across your organization.
                </p>
              </button>
            ) : (
              <div
                className="rounded-2xl p-4 border"
                style={{
                  backgroundColor: isDark ? "rgba(168,85,247,0.08)" : "rgba(102,126,234,0.08)",
                  borderColor: isDark ? "rgba(168,85,247,0.25)" : "rgba(102,126,234,0.25)",
                }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: text }}>
                  Organization admin
                </p>
                <p className="text-xs leading-relaxed" style={{ color: sub }}>
                  Contact your administrator if you need access to invite users or view org-wide usage.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
