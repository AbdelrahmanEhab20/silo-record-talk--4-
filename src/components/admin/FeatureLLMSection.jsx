import React from "react";
import { ChevronDown } from "lucide-react";

function buildOptions(providers, includeBrowserNative) {
  const opts = [];
  if (includeBrowserNative) {
    opts.push({ value: "browser_native", label: "🌐 Browser Native (Web Speech API)" });
  }
  opts.push({ value: "base44", label: "⚡ Base44 Built-in LLM (default)" });
  providers.filter(p => p.enabled && p.name).forEach(p => {
    opts.push({ value: p.id, label: `🔌 ${p.name} (${p.default_model || p.type})` });
  });
  return opts;
}

export default function FeatureLLMSection({
  featureKey,
  label,
  description,
  value,
  onChange,
  providers,
  includeBrowserNative,
  isDark,
  textSub,
  textMain,
}) {
  const options = buildOptions(providers, includeBrowserNative);
  const fallbackOptions = [
    { value: "", label: "None — no fallback" },
    ...options.filter(o => o.value !== "browser_native"), // fallback can't be browser native
  ];

  const selectCls = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none appearance-none pr-8 transition-colors ${
    isDark
      ? "bg-[#2C2C2E] border-white/10 text-white focus:border-purple-500/60 [color-scheme:dark]"
      : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-400 [color-scheme:light]"
  }`;

  return (
    <div className="space-y-4">
      <p className={`text-xs leading-relaxed ${textSub}`}>{description}</p>

      <div className="grid grid-cols-1 gap-3">
        {/* Primary */}
        <div>
          <label className={`text-xs font-semibold mb-1.5 block ${textMain}`}>
            Primary LLM
            <span className={`ml-2 text-[10px] font-normal ${textSub}`}>Used first for this feature</span>
          </label>
          <div className="relative">
            <select
              className={selectCls}
              value={value.primary || "base44"}
              onChange={e => onChange({ ...value, primary: e.target.value })}
            >
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
          </div>
        </div>

        {/* Fallback */}
        <div>
          <label className={`text-xs font-semibold mb-1.5 block ${textMain}`}>
            Fallback LLM (Plan B)
            <span className={`ml-2 text-[10px] font-normal ${textSub}`}>Used if primary is unavailable or fails</span>
          </label>
          <div className="relative">
            <select
              className={selectCls}
              value={value.fallback || ""}
              onChange={e => onChange({ ...value, fallback: e.target.value || null })}
            >
              {fallbackOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
          </div>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex gap-2 flex-wrap">
        {value.primary && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${isDark ? "bg-purple-500/15 text-purple-300" : "bg-purple-50 text-purple-600"}`}>
            Primary: {getLabelShort(value.primary, providers)}
          </span>
        )}
        {value.fallback && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-600"}`}>
            Fallback: {getLabelShort(value.fallback, providers)}
          </span>
        )}
        {!value.fallback && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${isDark ? "bg-white/5 text-white/30" : "bg-gray-100 text-gray-400"}`}>
            No fallback configured
          </span>
        )}
      </div>
    </div>
  );
}

function getLabelShort(key, providers) {
  if (key === "base44") return "Base44 LLM";
  if (key === "browser_native") return "Browser Native";
  const p = providers.find(p => p.id === key);
  return p ? p.name : key;
}