import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import LLMProvidersSection from "@/components/admin/LLMProvidersSection";
import OrgUsageSettings from "@/components/admin/OrgUsageSettings";
import FeatureAISection from "@/components/admin/FeatureAISection";
import BrandingPanel from "@/components/admin/BrandingPanel";
import {
  Shield, Cpu, ChevronDown, ChevronUp, Save, Users, Palette
} from "lucide-react";
import { isSystemAdmin } from "@/lib/roles";

const SETTING_KEY = "global";

const DEFAULT_SETTINGS = {
  setting_key: SETTING_KEY,
  llm_providers: [],
  live_transcription: { primary: "browser_native", fallback: "builtin" },
  chunk_processing: { primary: "builtin", fallback: null },
  ai_analysis: { primary: "builtin", fallback: null },
  full_retranscription: { primary: "builtin", fallback: null },
  video_url_processing: { primary: "builtin", fallback: null },
  audio_upload_processing: { primary: "builtin", fallback: null },
  image_processing: { primary: "builtin", fallback: null },
  text_processing: { primary: "builtin", fallback: null },
  org_usage_limits: {},
};

const TABS = [
  { key: "ai", label: "AI Models", icon: Cpu },
  { key: "usage", label: "Usage & Limits", icon: Users },
  { key: "branding", label: "Branding", icon: Palette },
];

export default function AdminSettings() {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [isAdmin, setIsAdmin] = useState(null);
  const [openSection, setOpenSection] = useState("llm_providers");
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
        const records = await appClient.entities.AISettings.filter({ setting_key: SETTING_KEY });
        if (records.length > 0) {
          setSettingsId(records[0].id);
          setSettings({ ...DEFAULT_SETTINGS, ...records[0] });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    init();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settingsId) {
        await appClient.entities.AISettings.update(settingsId, settings);
      } else {
        const created = await appClient.entities.AISettings.create(settings);
        setSettingsId(created.id);
      }
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const updateProviders = (providers) => setSettings(prev => ({ ...prev, llm_providers: providers }));

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

  const providers = settings?.llm_providers || [];

  return (
    <div className={`min-h-screen ${bg} py-8 px-5 pb-24`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>AI & Platform Settings</h1>
            <p className={`text-xs ${textSub}`}>Admin only — configure AI models and org usage limits</p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-2xl mb-6 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
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

        {/* Save Button — per tab (Branding manages its own save) */}
        {activeTab !== "branding" && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--brand-accent, #A855F7), var(--brand-primary, #6366F1))" }}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : savedMsg ? "Saved ✓" : "Save"}
            </button>
          </div>
        )}

        {/* AI Models Tab */}
        {activeTab === "ai" && (
          <div className="space-y-3">
            {/* LLM Providers Section */}
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
              <button
                onClick={() => setOpenSection(openSection === "llm_providers" ? null : "llm_providers")}
                className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${textMain}`}>LLM Provider Integrations</p>
                    <p className={`text-xs ${textSub}`}>
                      {providers.length === 0 ? "No custom providers yet — built-in provider is always available" : `${providers.length} custom provider${providers.length > 1 ? "s" : ""} configured`}
                    </p>
                  </div>
                </div>
                {openSection === "llm_providers" ? <ChevronUp className={`w-4 h-4 ${textSub}`} /> : <ChevronDown className={`w-4 h-4 ${textSub}`} />}
              </button>
              {openSection === "llm_providers" && (
                <div className="px-5 pb-5">
                  <LLMProvidersSection providers={providers} onChange={updateProviders} isDark={isDark} textSub={textSub} textMain={textMain} />
                </div>
              )}
            </div>

            {/* Feature AI Provider Assignment */}
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
              <button
                onClick={() => setOpenSection(openSection === "feature_ai" ? null : "feature_ai")}
                className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${textMain}`}>Feature AI Providers</p>
                    <p className={`text-xs ${textSub}`}>Control which AI powers transcription, analysis, and each feature</p>
                  </div>
                </div>
                {openSection === "feature_ai" ? <ChevronUp className={`w-4 h-4 ${textSub}`} /> : <ChevronDown className={`w-4 h-4 ${textSub}`} />}
              </button>
              {openSection === "feature_ai" && (
                <div className="px-5 pb-5">
                  <FeatureAISection
                    settings={settings}
                    onChange={(updated) => setSettings(prev => ({ ...prev, ...updated }))}
                    providers={providers}
                    isDark={isDark}
                    textSub={textSub}
                    textMain={textMain}
                  />
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === "usage" && (
          <div className={`rounded-2xl border p-5 ${card}`}>
            <OrgUsageSettings
              value={settings?.org_usage_limits || {}}
              onChange={(val) => setSettings((prev) => ({ ...prev, org_usage_limits: val }))}
              providers={providers}
              isDark={isDark}
              textMain={textMain}
              textSub={textSub}
            />
          </div>
        )}

        {activeTab === "branding" && (
          <BrandingPanel isDark={isDark} textMain={textMain} textSub={textSub} card={card} />
        )}
      </div>
    </div>
  );
}