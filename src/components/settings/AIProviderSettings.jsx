/**
 * Legacy per-user AI provider picker (OpenAI Whisper, Google, AWS, Azure, Custom LLM).
 * Not wired on the migrated Render backend — user fields are saved but ignored at runtime.
 * Re-enable when BYOK or per-user routing is implemented. See docs/AI_PROVIDERS.md.
 */
import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Check, Eye, EyeOff, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const PROVIDERS = [
  {
    id: "app_default",
    name: "App Default",
    description: "Use the app's built-in AI settings. No configuration needed.",
    logo: "✨",
    fields: [],
  },
  {
    id: "openai",
    name: "OpenAI Whisper",
    description: "Multilingual, highly accurate. Powers GPT & Whisper.",
    logo: "🤖",
    fields: [
      {
        key: "openai_api_key",
        label: "OpenAI API Key",
        placeholder: "sk-...",
        hint: "Get it from platform.openai.com/api-keys",
      },
    ],
  },
  {
    id: "google",
    name: "Google Cloud Speech",
    description: "Real-time streaming, 125+ languages, speaker diarization.",
    logo: "🔵",
    fields: [
      {
        key: "google_stt_api_key",
        label: "Google Cloud API Key",
        placeholder: "AIza...",
        hint: "Enable Speech-to-Text API in Google Cloud Console",
      },
    ],
  },
  {
    id: "amazon",
    name: "Amazon Transcribe",
    description: "Scalable, custom vocabulary, channel identification.",
    logo: "🟠",
    fields: [
      { key: "amazon_transcribe_key", label: "AWS Access Key ID", placeholder: "AKIA...", hint: "" },
      {
        key: "amazon_transcribe_secret",
        label: "AWS Secret Access Key",
        placeholder: "••••••••",
        hint: "",
        secret: true,
      },
      { key: "amazon_region", label: "AWS Region", placeholder: "us-east-1", hint: "e.g. us-east-1, eu-west-1" },
    ],
  },
  {
    id: "azure",
    name: "Azure Speech",
    description: "Custom speech models, robust enterprise security.",
    logo: "🔷",
    fields: [
      {
        key: "azure_speech_key",
        label: "Azure Speech API Key",
        placeholder: "••••••••",
        hint: "Found in Azure Portal → Cognitive Services → Keys",
        secret: true,
      },
      { key: "azure_speech_region", label: "Azure Region", placeholder: "eastus", hint: "e.g. eastus, westeurope" },
    ],
  },
  {
    id: "custom",
    name: "Custom LLM",
    description: "Use your own OpenAI-compatible LLM endpoint (e.g. Ollama, vLLM, LM Studio).",
    logo: "⚙️",
    fields: [
      {
        key: "custom_llm_endpoint",
        label: "API Endpoint URL",
        placeholder: "https://your-llm.example.com/v1",
        hint: "Must be OpenAI-compatible (e.g. /v1/chat/completions)",
      },
      {
        key: "custom_llm_api_key",
        label: "API Key (optional)",
        placeholder: "sk-...",
        hint: "Leave empty if your endpoint doesn't require auth",
        secret: true,
      },
      {
        key: "custom_llm_model",
        label: "Model Name",
        placeholder: "llama3, mistral, gpt-4...",
        hint: "The model identifier your endpoint expects",
      },
    ],
  },
];

export default function AIProviderSettings() {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    appClient.auth.me().then((u) => {
      setForm({
        ai_provider: u?.ai_provider || "app_default",
        openai_api_key: u?.openai_api_key || "",
        google_stt_api_key: u?.google_stt_api_key || "",
        amazon_transcribe_key: u?.amazon_transcribe_key || "",
        amazon_transcribe_secret: u?.amazon_transcribe_secret || "",
        amazon_region: u?.amazon_region || "us-east-1",
        azure_speech_key: u?.azure_speech_key || "",
        azure_speech_region: u?.azure_speech_region || "eastus",
        custom_llm_endpoint: u?.custom_llm_endpoint || "",
        custom_llm_api_key: u?.custom_llm_api_key || "",
        custom_llm_model: u?.custom_llm_model || "",
      });
    });
  }, []);

  const selectedProvider = PROVIDERS.find((p) => p.id === form.ai_provider) || PROVIDERS[0];

  const handleSave = async () => {
    setSaving(true);
    await appClient.auth.updateMe(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleSecret = (key) => setShowSecrets((s) => ({ ...s, [key]: !s[key] }));

  const isUsingAppKey = form.ai_provider === "openai" && !form.openai_api_key;
  const providerLabel =
    PROVIDERS.find((p) => p.id === form.ai_provider)?.name || "App Default";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between bg-white dark:bg-[#1C1C1E] rounded-2xl px-4 py-3 shadow-sm"
      >
        <div className="text-left">
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
            AI & Speech-to-Text Settings
          </p>
          <p className="text-[11px] text-gray-400 dark:text-[#A1A1A6] mt-0.5">
            {providerLabel} selected
          </p>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {!collapsed && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, ai_provider: p.id }))}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border transition-all text-left relative ${
                  form.ai_provider === p.id
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#1C1C1E] hover:border-purple-300 dark:hover:border-purple-700"
                }`}
              >
                <span className="text-xl">{p.logo}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[13px] font-semibold truncate ${
                      form.ai_provider === p.id
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-gray-800 dark:text-white"
                    }`}
                  >
                    {p.name}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-[#A1A1A6] leading-tight mt-0.5 line-clamp-2">
                    {p.description}
                  </p>
                </div>
                {form.ai_provider === p.id && (
                  <Check className="w-3.5 h-3.5 text-purple-500 ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedProvider.logo}</span>
              <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                {selectedProvider.name} Credentials
              </p>
            </div>

            {form.ai_provider === "app_default" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-green-700 dark:text-green-400">
                  Using the app&apos;s built-in AI settings. No API key required.
                </p>
              </div>
            )}

            {isUsingAppKey && form.ai_provider !== "app_default" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-blue-600 dark:text-blue-400">
                  No key entered — using the deployment default. Add your own key for dedicated usage.
                </p>
              </div>
            )}

            {selectedProvider.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-[#A1A1A6] mb-1.5">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                    value={form[field.key] || ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-xl px-3 py-2.5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#636366] focus:outline-none focus:ring-2 focus:ring-purple-500/40 pr-10"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() => toggleSecret(field.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                      {showSecrets[field.key] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                {field.hint && (
                  <p className="text-[11px] text-gray-400 dark:text-[#636366] mt-1">{field.hint}</p>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] transition-all active:scale-[0.98]"
            style={{
              background: saved ? "#22c55e" : "linear-gradient(135deg, #a855f7, #6366f1)",
              color: "white",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saving ? "Saving..." : saved ? "Saved!" : "Save API Settings"}
          </button>
        </>
      )}
    </div>
  );
}
