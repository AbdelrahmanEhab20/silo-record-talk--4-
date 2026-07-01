/**
 * Legacy Base44 per-feature LLM routing UI. Not read by Node backend at runtime.
 * See docs/AI_PROVIDERS.md.
 */
import React from "react";
import { ChevronDown } from "lucide-react";

const FEATURES = [
  { key: "full_retranscription", label: "Audio Transcription", description: "Used when processing recorded/uploaded audio files" },
  { key: "ai_analysis", label: "AI Analysis (Summary, Tags, Title)", description: "Generates session summaries, tags and titles" },
  { key: "audio_upload_processing", label: "Audio Upload Processing", description: "Processing for manually uploaded audio files" },
  { key: "video_url_processing", label: "Video URL Processing", description: "Transcript extraction from video URLs" },
  { key: "image_processing", label: "Image / Notes Processing", description: "OCR and text extraction from uploaded images" },
  { key: "text_processing", label: "Text Session Processing", description: "Analysis of pasted text sessions" },
  { key: "chunk_processing", label: "Live Chunk Processing", description: "Real-time audio chunk transcription" },
];

const TRANSCRIPTION_FEATURES = ["full_retranscription", "audio_upload_processing", "chunk_processing"];

export default function FeatureAISection({ settings, onChange, providers, isDark, textSub, textMain }) {
  const enabledProviders = (providers || []).filter(p => p.enabled);

  const allProviderOptions = [
    { value: "builtin", label: "Built-in Built-in LLM (default)" },
    ...enabledProviders.map(p => ({ value: p.id, label: p.name || p.type })),
  ];

  // For transcription features, also offer OpenAI Whisper if OPENAI_API_KEY is configured
  const transcriptionOptions = [
    { value: "builtin", label: "Built-in InvokeLLM (audio vision)" },
    { value: "openai_whisper", label: "OpenAI Whisper (requires OPENAI_API_KEY secret)" },
    ...enabledProviders.filter(p => p.type === "openai" || p.type === "groq").map(p => ({
      value: p.id,
      label: `${p.name || p.type} (${p.default_model || "default model"})`
    })),
  ];

  const inputCls = `w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors appearance-none ${
    isDark
      ? "bg-[#2C2C2E] border-white/10 text-white focus:border-purple-500/60 [color-scheme:dark]"
      : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-400 [color-scheme:light]"
  }`;

  const getFeatureValue = (key) => settings?.[key]?.primary || "builtin";
  const setFeatureValue = (key, value) => {
    onChange({ ...settings, [key]: { primary: value, fallback: null } });
  };

  const isTranscription = (key) => TRANSCRIPTION_FEATURES.includes(key);

  return (
    <div className="space-y-3">
      <p className={`text-xs leading-relaxed ${textSub}`}>
        Select which AI provider handles each feature. Changes take effect immediately after saving.
      </p>

      {FEATURES.map(({ key, label, description }) => {
        const options = isTranscription(key) ? transcriptionOptions : allProviderOptions;
        const currentValue = getFeatureValue(key);
        const isWhisper = currentValue === "openai_whisper";

        return (
          <div key={key} className={`rounded-xl border p-4 ${isDark ? "border-white/8 bg-white/3" : "border-gray-100 bg-gray-50/50"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${textMain}`}>{label}</p>
                <p className={`text-xs mt-0.5 ${textSub}`}>{description}</p>
              </div>
              <div className="relative shrink-0 w-52">
                <select
                  className={`${inputCls} pr-8`}
                  value={currentValue}
                  onChange={e => setFeatureValue(key, e.target.value)}
                >
                  {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
              </div>
            </div>
            {isWhisper && (
              <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                ⚠️ Requires <code className="font-mono">OPENAI_API_KEY</code> secret to be set in Built-in dashboard → Secrets.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}