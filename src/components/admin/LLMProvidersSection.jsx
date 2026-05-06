import React, { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, CheckCircle2, Circle, ChevronDown, Zap, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PROVIDER_TYPES = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic (Claude)", models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"] },
  { value: "google", label: "Google (Gemini)", models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"] },
  { value: "groq", label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "whisper-large-v3"] },
  { value: "deepseek", label: "DeepSeek", models: ["deepseek-chat", "deepseek-coder"] },
  { value: "assemblyai", label: "AssemblyAI", models: ["best", "nano"] },
  { value: "custom", label: "Custom / Self-hosted", models: [] },
];

function newProvider() {
  return {
    id: `provider_${Date.now()}`,
    name: "",
    type: "openai",
    api_key_secret_name: "",
    default_model: "",
    base_url: "",
    enabled: true,
  };
}

export default function LLMProvidersSection({ providers, onChange, isDark, textSub, textMain }) {
  const [showKey, setShowKey] = useState({});
  const [testState, setTestState] = useState({}); // { [id]: 'testing' | 'ok' | 'fail' | message }

  const testProvider = async (provider) => {
    if (!provider.api_key_secret_name) {
      setTestState(prev => ({ ...prev, [provider.id]: { status: 'fail', msg: 'No API key secret name set.' } }));
      return;
    }
    setTestState(prev => ({ ...prev, [provider.id]: { status: 'testing' } }));
    try {
      const res = await base44.functions.invoke('testLLMProvider', {
        provider_type: provider.type,
        api_key_secret_name: provider.api_key_secret_name,
        model: provider.default_model,
        base_url: provider.base_url || undefined,
      });
      if (res.data?.success) {
        setTestState(prev => ({ ...prev, [provider.id]: { status: 'ok', msg: res.data.response || 'Connection successful!' } }));
      } else {
        setTestState(prev => ({ ...prev, [provider.id]: { status: 'fail', msg: res.data?.error || 'Test failed.' } }));
      }
    } catch (e) {
      setTestState(prev => ({ ...prev, [provider.id]: { status: 'fail', msg: e.message || 'Test failed.' } }));
    }
    setTimeout(() => setTestState(prev => ({ ...prev, [provider.id]: null })), 8000);
  };

  const addProvider = () => onChange([...providers, newProvider()]);

  const removeProvider = (id) => onChange(providers.filter(p => p.id !== id));

  const updateProvider = (id, field, value) => {
    onChange(providers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const inputCls = `w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${
    isDark
      ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/20 focus:border-purple-500/60 [color-scheme:dark]"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-300 focus:border-purple-400 [color-scheme:light]"
  }`;

  const labelCls = `text-xs font-medium mb-1 block ${textSub}`;

  return (
    <div className="space-y-4">
      <p className={`text-xs leading-relaxed ${textSub}`}>
        Add custom LLM providers here. Once added, they'll be available as options across all feature settings below.
        API keys are stored by secret name — make sure the secret is set in the Base44 dashboard.
      </p>

      {/* Built-in Base44 */}
      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${isDark ? "border-green-500/20 bg-green-500/5" : "border-green-200 bg-green-50"}`}>
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
        <div>
          <p className={`text-sm font-semibold ${textMain}`}>Base44 Built-in LLM</p>
          <p className={`text-xs ${textSub}`}>Always available — no API key required. Used as default for all features.</p>
        </div>
      </div>

      {/* Custom Providers */}
      {providers.map((provider) => {
        const provType = PROVIDER_TYPES.find(t => t.value === provider.type) || PROVIDER_TYPES[0];
        return (
          <div key={provider.id} className={`rounded-xl border p-4 space-y-3 ${isDark ? "border-white/8 bg-white/3" : "border-gray-100 bg-gray-50/50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateProvider(provider.id, "enabled", !provider.enabled)}
                  className="shrink-0"
                >
                  {provider.enabled
                    ? <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    : <Circle className={`w-4 h-4 ${textSub}`} />}
                </button>
                <span className={`text-sm font-semibold ${provider.enabled ? textMain : textSub}`}>
                  {provider.name || "Unnamed Provider"}
                </span>
              </div>
              <button
                onClick={() => removeProvider(provider.id)}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-red-500/15" : "hover:bg-red-50"}`}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Display Name</label>
                <input
                  className={inputCls}
                  placeholder="e.g. My OpenAI"
                  value={provider.name}
                  onChange={e => updateProvider(provider.id, "name", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Provider Type</label>
                <div className="relative">
                  <select
                    className={`${inputCls} appearance-none pr-8`}
                    value={provider.type}
                    onChange={e => {
                      const pt = PROVIDER_TYPES.find(t => t.value === e.target.value);
                      onChange(providers.map(p => p.id === provider.id ? {
                        ...p,
                        type: e.target.value,
                        default_model: pt?.models?.length ? pt.models[0] : p.default_model,
                      } : p));
                    }}
                  >
                    {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>API Key Secret Name</label>
              <div className="relative flex items-center">
                <input
                  className={`${inputCls} pr-10`}
                  placeholder="e.g. OPENAI_API_KEY"
                  type={showKey[provider.id] ? "text" : "password"}
                  value={provider.api_key_secret_name}
                  onChange={e => updateProvider(provider.id, "api_key_secret_name", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                  className={`absolute right-2.5 ${textSub}`}
                >
                  {showKey[provider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className={`text-[10px] mt-1 ${textSub}`}>Must match the secret name set in Base44 dashboard → Secrets. Use ALL_CAPS (e.g. <code>ASSEMBLYAI_API_KEY</code>).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Default Model</label>
                {provType.models.length > 0 ? (
                  <div className="relative">
                    <select
                      className={`${inputCls} appearance-none pr-8`}
                      value={provider.default_model}
                      onChange={e => updateProvider(provider.id, "default_model", e.target.value)}
                    >
                      {provType.models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
                  </div>
                ) : (
                  <input
                    className={inputCls}
                    placeholder="e.g. my-model-name"
                    value={provider.default_model}
                    onChange={e => updateProvider(provider.id, "default_model", e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className={labelCls}>Base URL (optional)</label>
                <input
                  className={inputCls}
                  placeholder="https://api.openai.com/v1"
                  value={provider.base_url}
                  onChange={e => updateProvider(provider.id, "base_url", e.target.value)}
                />
              </div>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => testProvider(provider)}
                disabled={testState[provider.id]?.status === 'testing'}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-60 ${
                  isDark
                    ? "border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                    : "border-purple-300 text-purple-600 hover:bg-purple-50"
                }`}
              >
                {testState[provider.id]?.status === 'testing'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Zap className="w-3.5 h-3.5" />}
                {testState[provider.id]?.status === 'testing' ? 'Testing…' : 'Test Connection'}
              </button>
              {testState[provider.id]?.status === 'ok' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {testState[provider.id].msg}
                </span>
              )}
              {testState[provider.id]?.status === 'fail' && (
                <span className="text-xs text-red-400">✗ {testState[provider.id].msg}</span>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={addProvider}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${
          isDark
            ? "border-white/10 text-white/40 hover:border-purple-500/40 hover:text-purple-400"
            : "border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-500"
        }`}
      >
        <Plus className="w-4 h-4" />
        Add LLM Provider
      </button>
    </div>
  );
}