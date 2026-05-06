import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import { Loader2, Zap, Download, Save } from "lucide-react";

const TEMPLATES = [
  { id: "persona", label: "Best AI Note App for [Persona]", template: "Best AI note-taking app for {variable}", variables: ["students", "doctors", "lawyers", "journalists", "remote workers", "entrepreneurs", "executives", "sales reps", "researchers", "consultants"] },
  { id: "industry", label: "AI Meeting Notes for [Industry]", template: "AI meeting notes for {variable}", variables: ["healthcare", "legal", "finance", "real estate", "tech startups", "education", "marketing agencies", "consulting firms", "HR teams", "product teams"] },
  { id: "usecase", label: "How to Record [Use Case]", template: "How to record and transcribe {variable}", variables: ["interviews", "lectures", "meetings", "podcasts", "therapy sessions", "sales calls", "client meetings", "brainstorming sessions", "customer feedback", "training sessions"] },
  { id: "vs", label: "SILO vs [Competitor]", template: "SILO vs {variable}: Best AI transcription app", variables: ["Otter.ai", "Fireflies.ai", "Notion AI", "Whisper", "Rev.ai", "Descript", "Grain", "tl;dv", "Fathom", "MeetGeek"] },
];

export default function ProgrammaticSEO() {
  const { isDark } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [selectedVars, setSelectedVars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const sub = isDark ? "text-white/40" : "text-gray-400";

  const toggleVar = (v) => {
    setSelectedVars(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const generate = async () => {
    if (selectedVars.length === 0) return;
    setLoading(true);
    setGenerated([]);

    const pages = await appClient.integrations.Core.InvokeLLM({
      prompt: `You are an SEO expert. Generate programmatic SEO page metadata for SILO (AI voice recording + meeting notes SaaS) for these keyword variations:

Template: "${selectedTemplate.template}"
Variables: ${selectedVars.join(", ")}

For each variable, generate:
- slug: URL-friendly slug (e.g. "ai-meeting-notes-healthcare")
- title: SEO title <60 chars
- meta_description: <160 chars, high CTR
- h1: compelling H1
- target_keyword: the full keyword phrase
- content_outline: array of 6 H2 section titles for the page
- estimated_traffic: estimated monthly visitors (number)

Return JSON array of page objects.`,
      response_json_schema: {
        type: "object",
        properties: {
          pages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                slug: { type: "string" },
                title: { type: "string" },
                meta_description: { type: "string" },
                h1: { type: "string" },
                target_keyword: { type: "string" },
                content_outline: { type: "array", items: { type: "string" } },
                estimated_traffic: { type: "number" }
              }
            }
          }
        }
      }
    });

    setGenerated(pages.pages || []);
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const page of generated) {
      await appClient.entities.SEOPage.create({
        ...page,
        page_type: "programmatic",
        template_variable: selectedTemplate.id,
        status: "draft",
        content: page.content_outline?.map((h, i) => `## ${h}`).join("\n\n") || "",
      });
      setSavedCount(c => c + 1);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className={`${card} border rounded-2xl p-5`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${sub}`}>Programmatic SEO Generator</h2>

        {/* Template Selection */}
        <div className="space-y-2 mb-5">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTemplate(t); setSelectedVars([]); setGenerated([]); }}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                selectedTemplate.id === t.id
                  ? "border-purple-500 bg-purple-500/10"
                  : isDark ? "border-white/8 bg-white/2 hover:border-white/15" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Variable Selection */}
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>Select Variables ({selectedVars.length} selected)</p>
          <div className="flex flex-wrap gap-2">
            {selectedTemplate.variables.map(v => (
              <button
                key={v}
                onClick={() => toggleVar(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedVars.includes(v)
                    ? "text-white"
                    : isDark ? "bg-white/5 text-white/50 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={selectedVars.includes(v) ? { background: "linear-gradient(135deg, #A855F7, #6366F1)" } : {}}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || selectedVars.length === 0}
          className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating {selectedVars.length} pages...</> : <><Zap className="w-4 h-4" />Generate {selectedVars.length} Pages</>}
        </button>
      </div>

      {/* Results */}
      {generated.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>{generated.length} pages generated</span>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
            >
              {saving ? <><Loader2 className="w-3 h-3 animate-spin" />Saving ({savedCount}/{generated.length})</> : <><Save className="w-3 h-3" />Save All to Library</>}
            </button>
          </div>
          <div className="space-y-3">
            {generated.map((page, i) => (
              <div key={i} className={`${card} border rounded-2xl p-4`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{page.title}</div>
                    <div className={`text-xs mb-2 ${sub}`}>/{page.slug}</div>
                    <div className={`text-xs leading-relaxed ${isDark ? "text-white/50" : "text-gray-500"}`}>{page.meta_description}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-green-400">~{page.estimated_traffic?.toLocaleString()}</div>
                    <div className={`text-[10px] ${sub}`}>est. visits/mo</div>
                  </div>
                </div>
                {page.content_outline?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${sub}`}>Content Outline</div>
                    <div className="space-y-1">
                      {page.content_outline.map((h, j) => (
                        <div key={j} className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>• {h}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}