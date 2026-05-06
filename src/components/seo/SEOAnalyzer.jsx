import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/lib/ThemeContext";
import { Loader2, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

export default function SEOAnalyzer() {
  const { isDark } = useTheme();
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const inputCls = isDark ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const sub = isDark ? "text-white/40" : "text-gray-400";

  const analyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert SEO auditor. Analyze this page content and return a detailed SEO audit.

URL: ${url || "Not provided"}
Content:
${content.slice(0, 3000)}

Return a JSON audit with:
- seo_score: overall score 0-100
- readability_score: 0-100
- title_analysis: { current: string, suggestion: string, score: number, issues: string[] }
- meta_analysis: { current: string, suggestion: string, score: number, issues: string[] }
- content_analysis: { word_count: number, keyword_density: string, issues: string[] }
- quick_wins: array of 5 specific actionable improvements (strings)
- missing_elements: array of missing SEO elements (strings)
- strengths: array of what's already good (strings)
- internal_linking_suggestions: array of anchor text + suggested URL pairs
- schema_recommendations: array of schema types to add`,
      response_json_schema: {
        type: "object",
        properties: {
          seo_score: { type: "number" },
          readability_score: { type: "number" },
          title_analysis: { type: "object", properties: { current: { type: "string" }, suggestion: { type: "string" }, score: { type: "number" }, issues: { type: "array", items: { type: "string" } } } },
          meta_analysis: { type: "object", properties: { current: { type: "string" }, suggestion: { type: "string" }, score: { type: "number" }, issues: { type: "array", items: { type: "string" } } } },
          content_analysis: { type: "object", properties: { word_count: { type: "number" }, keyword_density: { type: "string" }, issues: { type: "array", items: { type: "string" } } } },
          quick_wins: { type: "array", items: { type: "string" } },
          missing_elements: { type: "array", items: { type: "string" } },
          strengths: { type: "array", items: { type: "string" } },
          internal_linking_suggestions: { type: "array", items: { type: "object", properties: { anchor: { type: "string" }, url: { type: "string" } } } },
          schema_recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    setResult(res);
    setLoading(false);
  };

  const ScoreRing = ({ score, label }) => {
    const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke={isDark ? "rgba(255,255,255,0.1)" : "#f0f0f0"} strokeWidth="6" />
            <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={`${(score / 100) * 163.4} 163.4`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color }}>{score}</span>
          </div>
        </div>
        <span className={`text-[10px] ${sub}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className={`${card} border rounded-2xl p-5`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${sub}`}>On-Page SEO Analyzer</h2>
        <div className="space-y-3">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Page URL (optional)"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputCls}`}
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste your page content, title, and meta description here..."
            rows={5}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm resize-none ${inputCls}`}
          />
          <button
            onClick={analyze}
            disabled={loading || !content.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
          >
            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</span> : "Analyze Page"}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Scores */}
          <div className={`${card} border rounded-2xl p-5`}>
            <div className="flex justify-around">
              <ScoreRing score={result.seo_score} label="SEO Score" />
              <ScoreRing score={result.readability_score} label="Readability" />
              <ScoreRing score={result.title_analysis?.score || 0} label="Title" />
              <ScoreRing score={result.meta_analysis?.score || 0} label="Meta" />
            </div>
          </div>

          {/* Quick Wins */}
          <div className={`${card} border rounded-2xl p-5`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${sub}`}><TrendingUp className="w-3.5 h-3.5" />Quick Wins</h3>
            <div className="space-y-2">
              {result.quick_wins?.map((win, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className={`text-xs leading-relaxed ${isDark ? "text-white/70" : "text-gray-700"}`}>{win}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Issues & Strengths */}
          <div className="grid grid-cols-1 gap-4">
            <div className={`${card} border rounded-2xl p-5`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 text-red-400`}><AlertCircle className="w-3.5 h-3.5" />Missing Elements</h3>
              <div className="space-y-1.5">
                {result.missing_elements?.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <span className={`text-xs ${isDark ? "text-white/60" : "text-gray-600"}`}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${card} border rounded-2xl p-5`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 text-green-400`}><CheckCircle className="w-3.5 h-3.5" />Strengths</h3>
              <div className="space-y-1.5">
                {result.strengths?.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <span className={`text-xs ${isDark ? "text-white/60" : "text-gray-600"}`}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Title & Meta Suggestions */}
          <div className={`${card} border rounded-2xl p-5 space-y-4`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${sub}`}>Improvement Suggestions</h3>
            <div>
              <div className={`text-xs font-medium mb-1 ${sub}`}>Current Title</div>
              <div className={`text-sm px-3 py-2 rounded-lg ${isDark ? "bg-red-500/10 text-white/70" : "bg-red-50 text-gray-700"} mb-2`}>{result.title_analysis?.current || "—"}</div>
              <div className={`text-xs font-medium mb-1 text-green-400`}>Suggested Title</div>
              <div className={`text-sm px-3 py-2 rounded-lg ${isDark ? "bg-green-500/10 text-white/70" : "bg-green-50 text-gray-700"}`}>{result.title_analysis?.suggestion || "—"}</div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-1 ${sub}`}>Suggested Meta Description</div>
              <div className={`text-xs px-3 py-2 rounded-lg ${isDark ? "bg-green-500/10 text-white/60" : "bg-green-50 text-gray-600"} leading-relaxed`}>{result.meta_analysis?.suggestion || "—"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}