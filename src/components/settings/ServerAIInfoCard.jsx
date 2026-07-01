import React from "react";
import { Sparkles } from "lucide-react";

/** Read-only replacement for AIProviderSettings until per-user BYOK is wired. */
export default function ServerAIInfoCard() {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">App Default (server-managed)</p>
          <p className="text-xs text-gray-500 dark:text-[#A1A1A6] mt-1 leading-relaxed">
            Transcription and AI analysis are configured by your administrator on the server (AssemblyAI + Groq).
            Per-user API keys are not used in this deployment.
          </p>
        </div>
      </div>
    </div>
  );
}
