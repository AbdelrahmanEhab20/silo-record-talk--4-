import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { Mail, Hash, Loader2, Copy, Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

const FORMATS = [
  { id: "email", label: "Email Draft", icon: Mail, description: "Formal email summary for Gmail" },
  { id: "slack", label: "Slack Message", icon: Hash, description: "Concise update for Slack" },
];

export default function DraftGenerator({ summary, transcript }) {
  const { isDark } = useTheme();
  const [selectedFormat, setSelectedFormat] = useState("email");
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cardBg = isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200";
  const subText = isDark ? "text-white/40" : "text-gray-400";

  const generateDraft = async () => {
    const content = summary || transcript;
    if (!content) return;
    setLoading(true);
    setDraft(null);

    const prompts = {
      email: `You are a professional email assistant. Based on the meeting notes below, write a professional follow-up email. Use plain text formatting (no markdown, no asterisks, no special characters).

Format:
- Subject line at top
- Dear [Team/recipient],
- Brief opening paragraph (2-3 sentences)
- Key Discussion Points section with clean bullet points (use - for bullets)
- Action Items section with numbered list (1., 2., 3., etc.) including owner and deadline if available
- Professional closing with signature

Use proper spacing, clear headings, and clean formatting. Make it ready to paste directly into Gmail.

Meeting Notes:
${content.slice(0, 3000)}`,
      slack: `You are a professional assistant. Based on the meeting notes below, write a concise Slack message update. Use Slack markdown formatting (*bold*, _italic_, bullet points with •). Include: a brief header, 3-5 key takeaways, and any action items. Keep it scannable and under 300 words.\n\nMeeting Notes:\n${content.slice(0, 3000)}`,
    };

    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt: prompts[selectedFormat] });
      setDraft(result);
      setExpanded(true);
    } catch (e) {
      console.error("Draft generation failed", e);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold">Generate Draft</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Format picker */}
          <div className="flex gap-2">
            {FORMATS.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => { setSelectedFormat(id); setDraft(null); }}
                className={`flex-1 flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  selectedFormat === id
                    ? "border-purple-500/60 bg-purple-500/10"
                    : isDark
                    ? "border-white/8 bg-white/3 hover:bg-white/6"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${selectedFormat === id ? "text-purple-400" : subText}`} />
                  <span className={`text-xs font-medium ${selectedFormat === id ? "text-purple-400" : ""}`}>{label}</span>
                </div>
                <span className={`text-[10px] ${subText}`}>{description}</span>
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={generateDraft}
            disabled={loading || (!summary && !transcript)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating…" : `Generate ${selectedFormat === "email" ? "Email" : "Slack Message"}`}
          </button>

          {/* Draft output */}
          {draft && (
            <div className={`relative rounded-xl border ${isDark ? "bg-white/3 border-white/8" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/6">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${subText}`}>
                  {selectedFormat === "email" ? "Email Draft" : "Slack Message"}
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg transition-all ${
                    copied
                      ? "bg-green-500/20 text-green-400"
                      : isDark
                      ? "bg-white/8 text-white/50 hover:text-white"
                      : "bg-gray-200 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap font-sans ${isDark ? "text-white/70" : "text-gray-700"}`}>
                {draft.split('\n').map((line, i) => {
                  const isSubject = line.toLowerCase().startsWith('subject:');
                  const isHeading = /^(Dear|Key Discussion|Action Items|Best regards|Sincerely)/.test(line.trim());
                  const isNumbered = /^\d+\./.test(line.trim());
                  const isBullet = /^-\s/.test(line.trim());
                  
                  return (
                    <div
                      key={i}
                      className={`${
                        isSubject ? 'font-semibold text-purple-400 mb-3' :
                        isHeading ? 'font-semibold mt-3 mb-2' :
                        isNumbered || isBullet ? 'ml-4 mb-1' :
                        line.trim() === '' ? 'mb-2' :
                        'mb-1'
                      }`}
                    >
                      {line || '\u200b'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}