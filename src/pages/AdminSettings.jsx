import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
// Legacy Base44 admin UI — not wired on Render backend; kept for Phase 2/3.
// import LLMProvidersSection from "@/components/admin/LLMProvidersSection";
// import OrgUsageSettings from "@/components/admin/OrgUsageSettings";
// import FeatureAISection from "@/components/admin/FeatureAISection";
import BrandingPanel from "@/components/admin/BrandingPanel";
import PlatformProvidersBanner from "@/components/admin/PlatformProvidersBanner";
import { Shield, Cpu, Palette } from "lucide-react";
import { isSystemAdmin } from "@/lib/roles";

// const SETTING_KEY = "global";
// const DEFAULT_SETTINGS = { ... }; // Phase 2: AISettings persistence

// Usage & Limits tab hidden until Phase 2 wires org_usage_limits — see docs/PHASE2_USAGE_LIMITS.md
// { key: "usage", label: "Usage & Limits", icon: Users },

const TABS = [
  { key: "ai", label: "AI Providers", icon: Cpu },
  { key: "branding", label: "Branding", icon: Palette },
];

export default function AdminSettings() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState("ai");

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  useEffect(() => {
    const init = async () => {
      try {
        const user = await appClient.auth.me();
        if (!isSystemAdmin(user)) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        // Phase 2: reload AISettings for editable limits
        // const records = await appClient.entities.AISettings.filter({ setting_key: SETTING_KEY });
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center px-6`}>
        <div className={`rounded-3xl border p-10 text-center max-w-sm w-full ${card}`}>
          <Shield className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className={`text-xl font-bold mb-2 ${textMain}`}>Admin Access Only</h2>
          <p className={`text-sm ${textSub}`}>This page is restricted to system administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} py-8 px-5 pb-24`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>AI & Platform Settings</h1>
            <p className={`text-xs ${textSub}`}>Admin only — branding and server AI configuration</p>
          </div>
        </div>

        <div className={`flex gap-1 p-1 rounded-2xl mb-6 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === key
                  ? isDark ? "bg-white/10 text-white" : "bg-white text-gray-900 shadow-sm"
                  : textSub
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "ai" && (
          <PlatformProvidersBanner isDark={isDark} textMain={textMain} textSub={textSub} card={card} />
        )}

        {/*
          Legacy Base44 admin sections — saved to AISettings but not applied by Node backend.
          Re-enable with Phase 2/3; see docs/PHASE2_USAGE_LIMITS.md and docs/AI_PROVIDERS.md.

        {activeTab === "ai" && (
          <div className="space-y-3">
            ... LLMProvidersSection ...
            ... FeatureAISection ...
          </div>
        )}

        {activeTab === "usage" && (
          <div className={`rounded-2xl border p-5 ${card}`}>
            <OrgUsageSettings ... />
          </div>
        )}
        */}

        {activeTab === "branding" && (
          <BrandingPanel isDark={isDark} textMain={textMain} textSub={textSub} card={card} />
        )}
      </div>
    </div>
  );
}
