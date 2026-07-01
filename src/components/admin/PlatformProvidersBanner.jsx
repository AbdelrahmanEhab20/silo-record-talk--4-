import React from "react";
import { Cpu, Mic, Sparkles } from "lucide-react";

/**
 * Read-only summary of how AI runs on this deployment (Render env vars).
 * Legacy admin dropdowns are hidden until Phase 2 wires AISettings to the backend.
 */
export default function PlatformProvidersBanner({ isDark, textMain, textSub, card }) {
  const rows = [
    {
      icon: Mic,
      title: "Uploaded audio transcription",
      detail: "AssemblyAI — set ASSEMBLYAI_API_KEY on the Render backend.",
    },
    {
      icon: Sparkles,
      title: "Summaries, folder reports, word analysis, Ask Silo",
      detail: "Groq — set GROQ_API_KEY and GROQ_MODEL on the Render backend.",
    },
    {
      icon: Cpu,
      title: "Live microphone recording",
      detail: "Browser Web Speech API (client-side). No server key required.",
    },
  ];

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
      <div>
        <p className={`text-sm font-semibold ${textMain}`}>Active AI providers</p>
        <p className={`text-xs mt-1 ${textSub}`}>
          This deployment uses server environment variables on Render. Changes here require a backend redeploy,
          not this admin panel.
        </p>
      </div>
      {rows.map(({ icon: Icon, title, detail }) => (
        <div
          key={title}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
            isDark ? "border-white/8 bg-white/[0.03]" : "border-gray-100 bg-gray-50"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className={`text-sm font-medium ${textMain}`}>{title}</p>
            <p className={`text-xs mt-0.5 ${textSub}`}>{detail}</p>
          </div>
        </div>
      ))}
      <p className={`text-[10px] ${textSub}`}>
        Usage limits and per-feature provider routing will return in a future update (see docs/PHASE2_USAGE_LIMITS.md).
      </p>
    </div>
  );
}
