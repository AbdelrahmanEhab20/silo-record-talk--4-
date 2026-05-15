import React from "react";
import { Building2 } from "lucide-react";
import ProPlanSettings from "@/components/admin/ProPlanSettings";

/**
 * Organization-wide defaults (reuses deployment limit controls from ProPlanSettings).
 * Per-user caps and org admin UI will be added in a later phase.
 */
export default function OrgUsageSettings({ value, onChange, providers, isDark, textMain, textSub }) {
  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
          isDark ? "border-purple-500/20 bg-purple-500/5" : "border-purple-100 bg-purple-50"
        }`}
      >
        <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
        <p className={`text-xs ${textSub}`}>
          Default limits for <strong className="text-purple-400">all users</strong> in this deployment.
          Minutes are tracked per account; org admins will manage users and quotas in a future dashboard.
        </p>
      </div>
      <ProPlanSettings
        value={value}
        onChange={onChange}
        providers={providers}
        isDark={isDark}
        textMain={textMain}
        textSub={textSub}
      />
    </div>
  );
}
