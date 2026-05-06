import React, { useState } from "react";
import { Users, ChevronDown, ChevronUp, Mic, AudioLines, Brain, RefreshCw, Video, Upload, Image, FileText, Zap, GraduationCap, Mail } from "lucide-react";

const FEATURE_SECTIONS = [
  { key: "live_transcription", label: "Live Transcription", icon: Mic, includeBrowserNative: true, description: "Real-time speech-to-text during active recording. Covers mic, system audio, and hybrid capture modes. Browser Native uses the Web Speech API; other providers use Whisper-compatible APIs." },
  { key: "chunk_processing", label: "Audio Chunk Processing", icon: AudioLines, description: "Periodically transcribes audio chunks sent from the recorder to the backend via Whisper. Used when Browser Native is unavailable or when higher accuracy is needed." },
  { key: "ai_analysis", label: "AI Analysis & Insights", icon: Brain, description: "Generates meeting summaries, bullet points, action items, keyword tags, sentiment, session type, dialect detection, and powers the Silo AI assistant chat." },
  { key: "full_retranscription", label: "Full Re-transcription", icon: RefreshCw, description: "Re-transcribes the complete session audio after recording stops — either a single file or merged multi-part sub-sessions — for a clean final transcript." },
  { key: "video_url_processing", label: "Video URL Processing", icon: Video, description: "Extracts transcripts or captions from external video URLs (YouTube, Zoom recordings, Loom, etc.) and runs AI analysis on the result." },
  { key: "audio_upload_processing", label: "Uploaded Audio Transcription", icon: Upload, description: "Transcribes audio or video files uploaded directly by users. Supports MP3, MP4, M4A, WAV, and other common formats." },
  { key: "image_processing", label: "Image Text Extraction", icon: Image, description: "Uses vision AI to extract and interpret text from uploaded images — handwritten notes, whiteboards, slides, or scanned documents." },
  { key: "text_processing", label: "Pasted Text Analysis", icon: FileText, description: "Processes plain text pasted by users — normalizes, structures, and runs full AI analysis to generate summaries, tags, and insights." },
  { key: "flashcard_generation", label: "Flashcard & Quiz Generation", icon: GraduationCap, description: "Generates flashcard decks and multiple-choice quizzes from session transcripts and summaries. Used in the Learning / Study tools panel on session detail pages." },
  { key: "followup_email", label: "Follow-Up Email Drafting", icon: Mail, description: "Drafts follow-up emails based on session content — action items, decisions, and key points — ready for the user to review and send." },
];

const DEFAULT_FREE = {
  daily_minutes: 30,
  max_sessions_per_day: 5,
  max_file_upload_mb: 25,
  ai_analysis_enabled: true,
  export_enabled: false,
  workspace_enabled: false,
  calendar_enabled: false,
  speaker_id_enabled: false,
  flashcards_enabled: true,
  max_folders: 3,
  feature_llm: {},
};

function buildOptions(providers, includeBrowserNative) {
  const opts = [];
  if (includeBrowserNative) opts.push({ value: "browser_native", label: "🌐 Browser Native (Web Speech API)" });
  opts.push({ value: "builtin", label: "⚡ Built-in Built-in LLM (default)" });
  providers.filter(p => p.enabled && p.name).forEach(p => {
    opts.push({ value: p.id, label: `🔌 ${p.name} (${p.default_model || p.type})` });
  });
  return opts;
}

function getLabelShort(key, providers) {
  if (!key || key === "builtin") return "Built-in Built-in";
  if (key === "browser_native") return "Browser Native";
  const p = providers.find(p => p.id === key);
  return p ? p.name : key;
}

function FeatureRow({ featureKey, label, icon: Icon, description, includeBrowserNative, providers, value, onChange, isDark, textMain, textSub }) {
  const [open, setOpen] = useState(false);
  const selectCls = `w-full px-3 py-2 rounded-xl text-sm border outline-none appearance-none pr-8 transition-colors ${
    isDark
      ? "bg-[#2C2C2E] border-white/10 text-white focus:border-blue-500/60 [color-scheme:dark]"
      : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-400 [color-scheme:light]"
  }`;
  const options = buildOptions(providers, includeBrowserNative);
  const fallbackOptions = [{ value: "", label: "None — no fallback" }, ...options.filter(o => o.value !== "browser_native")];
  const activeLLM = getLabelShort(value?.primary, providers);

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? "border-white/8" : "border-gray-100"}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isDark ? "bg-white/3 hover:bg-white/5" : "bg-gray-50 hover:bg-gray-100"}`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-400" />
          <span className={`text-sm font-medium ${textMain}`}>{label}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${isDark ? "bg-green-500/15 text-green-300" : "bg-green-50 text-green-600"}`}>
            <Zap className="w-2.5 h-2.5" />{activeLLM}
          </span>
          {value?.fallback && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
              + fallback
            </span>
          )}
        </div>
        {open ? <ChevronUp className={`w-3.5 h-3.5 ${textSub}`} /> : <ChevronDown className={`w-3.5 h-3.5 ${textSub}`} />}
      </button>

      {open && (
        <div className={`px-4 py-3 space-y-3 ${isDark ? "bg-black/20" : "bg-white"}`}>
          {description && (
            <p className={`text-xs leading-relaxed pb-1 border-b ${isDark ? "text-white/45 border-white/8" : "text-gray-400 border-gray-100"}`}>{description}</p>
          )}
          <div>
            <label className={`text-xs font-semibold mb-1.5 block ${textMain}`}>Primary LLM</label>
            <div className="relative">
              <select className={selectCls} value={value?.primary || "builtin"}
                onChange={e => onChange({ ...value, primary: e.target.value })}>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
            </div>
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1.5 block ${textMain}`}>Fallback LLM</label>
            <div className="relative">
              <select className={selectCls} value={value?.fallback || ""}
                onChange={e => onChange({ ...value, fallback: e.target.value || null })}>
                {fallbackOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className={`w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Toggle = ({ field, label, desc, data, set, isDark, textMain, textSub }) => (
  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isDark ? "border-white/8 bg-white/3" : "border-gray-100 bg-gray-50"}`}>
    <div>
      <p className={`text-sm font-medium ${textMain}`}>{label}</p>
      {desc && <p className={`text-xs ${textSub}`}>{desc}</p>}
    </div>
    <button
      onClick={() => set(field, !data[field])}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${data[field] ? "bg-blue-500" : isDark ? "bg-white/15" : "bg-gray-200"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${data[field] ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  </div>
);

export default function FreePlanSettings({ value, onChange, providers = [], isDark, textMain, textSub }) {
  const data = { ...DEFAULT_FREE, ...value, feature_llm: value?.feature_llm || {} };

  const set = (field, val) => onChange({ ...data, [field]: val });

  const inputCls = `w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${
    isDark
      ? "bg-[#2C2C2E] border-white/10 text-white focus:border-blue-500/60 [color-scheme:dark]"
      : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-400 [color-scheme:light]"
  }`;

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${isDark ? "border-blue-500/20 bg-blue-500/5" : "border-blue-100 bg-blue-50"}`}>
        <Users className="w-4 h-4 text-blue-400 shrink-0" />
        <p className={`text-xs ${textSub}`}>Configure limits and AI models for <strong className="text-blue-400">Free</strong> plan users.</p>
      </div>

      {/* Usage Limits */}
      <div>
        <p className={`text-xs font-semibold mb-3 ${textMain}`}>Usage Limits</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>Daily Minutes</label>
            <input type="number" className={inputCls} value={data.daily_minutes} min={0}
              onChange={e => set("daily_minutes", Number(e.target.value))} />
          </div>
          <div>
            <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>Sessions / Day</label>
            <input type="number" className={inputCls} value={data.max_sessions_per_day} min={0}
              onChange={e => set("max_sessions_per_day", Number(e.target.value))} />
          </div>
          <div>
            <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>Max Upload (MB)</label>
            <input type="number" className={inputCls} value={data.max_file_upload_mb} min={0}
              onChange={e => set("max_file_upload_mb", Number(e.target.value))} />
          </div>
          <div>
            <label className={`text-xs font-medium mb-1.5 block ${textSub}`}>Max Folders</label>
            <input type="number" className={inputCls} value={data.max_folders} min={0}
              onChange={e => set("max_folders", Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Feature Access */}
      <div>
        <p className={`text-xs font-semibold mb-3 ${textMain}`}>Feature Access</p>
        <div className="space-y-2">
          <Toggle field="ai_analysis_enabled" label="AI Analysis & Insights" desc="Summaries, tags, action items" data={data} set={set} isDark={isDark} textMain={textMain} textSub={textSub} />
          <Toggle field="export_enabled" label="Export Studio" desc="Export to PDF, DOCX, etc." data={data} set={set} isDark={isDark} textMain={textMain} textSub={textSub} />
          <Toggle field="workspace_enabled" label="Workspaces & Sharing" desc="Team collaboration features" data={data} set={set} isDark={isDark} textMain={textMain} textSub={textSub} />
          <Toggle field="calendar_enabled" label="Calendar Integration" desc="Link sessions to calendar events" data={data} set={set} isDark={isDark} textMain={textMain} textSub={textSub} />
          <Toggle field="speaker_id_enabled" label="Speaker Identification" desc="Identify individual speakers" data={data} set={set} isDark={isDark} textMain={textMain} textSub={textSub} />
          <Toggle field="flashcards_enabled" label="Flashcards & Quizzes" desc="Learning tools from sessions" data={data} set={set} isDark={isDark} textMain={textMain} textSub={textSub} />
        </div>
      </div>

      {/* AI Models per Feature */}
      <div>
        <p className={`text-xs font-semibold mb-1 ${textMain}`}>AI Models per Feature</p>
        <p className={`text-xs mb-3 ${textSub}`}>Override which LLM is used for each feature specifically for Free plan users.</p>
        <div className="space-y-2">
          {FEATURE_SECTIONS.map(({ key, label, icon, description, includeBrowserNative }) => (
            <FeatureRow
              key={key}
              featureKey={key}
              label={label}
              icon={icon}
              description={description}
              includeBrowserNative={includeBrowserNative}
              providers={providers}
              value={data.feature_llm?.[key] || { primary: "builtin", fallback: null }}
              onChange={(val) => set("feature_llm", { ...data.feature_llm, [key]: val })}
              isDark={isDark}
              textMain={textMain}
              textSub={textSub}
            />
          ))}
        </div>
      </div>
    </div>
  );
}