import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import { Search, Loader2, Plus, Target, TrendingUp, Zap } from "lucide-react";

const intentColors = {
  informational: "bg-blue-500/20 text-blue-400",
  transactional: "bg-green-500/20 text-green-400",
  navigational: "bg-purple-500/20 text-purple-400",
  commercial: "bg-orange-500/20 text-orange-400",
};

const volumeColors = {
  low: "text-gray-400",
  medium: "text-yellow-400",
  high: "text-green-400",
  very_high: "text-emerald-400",
};

export default function KeywordEngine() {
  const { isDark } = useTheme();
  const [seed, setSeed] = useState("");
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState({});

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const input = isDark ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const sub = isDark ? "text-white/40" : "text-gray-400";

  const generate = async () => {
    if (!seed.trim()) return;
    setLoading(true);
    setKeywords([]);
    const result = await appClient.integrations.Core.InvokeLLM({
      prompt: `You are an expert SEO strategist. Generate a comprehensive keyword research report for the seed keyword: "${seed}" in language: ${lang === "ar" ? "Arabic" : "English"}.

The app context: SILO is an AI-powered voice recording and meeting notes SaaS.

Return a JSON array of 20 keywords with this structure:
- keyword: the keyword phrase
- seed_keyword: "${seed}"
- type: "seed" | "long_tail" | "question" | "related"
- intent: "informational" | "transactional" | "navigational" | "commercial"
- difficulty_score: number 0-100 (lower = easier to rank)
- volume_estimate: "low" | "medium" | "high" | "very_high"
- conversion_potential: "low" | "medium" | "high"
- priority_score: number 0-100 (higher = better opportunity)
- language: "${lang}"

Prioritize high-conversion, low-difficulty long-tail keywords. Include question-based queries.`,
      response_json_schema: {
        type: "object",
        properties: {
          keywords: {
            type: "array",
            items: {
              type: "object",
              properties: {
                keyword: { type: "string" },
                seed_keyword: { type: "string" },
                type: { type: "string" },
                intent: { type: "string" },
                difficulty_score: { type: "number" },
                volume_estimate: { type: "string" },
                conversion_potential: { type: "string" },
                priority_score: { type: "number" },
                language: { type: "string" }
              }
            }
          }
        }
      }
    });
    setKeywords(result.keywords || []);
    setLoading(false);
  };

  const saveKeyword = async (kw) => {
    setSaving(kw.keyword);
    await appClient.entities.Keyword.create({ ...kw, status: "researched" });
    setSaved(prev => ({ ...prev, [kw.keyword]: true }));
    setSaving(null);
  };

  const sorted = [...keywords].sort((a, b) => b.priority_score - a.priority_score);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className={`${card} border rounded-2xl p-5`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${sub}`}>Keyword Research</h2>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
            <input
              value={seed}
              onChange={e => setSeed(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
              placeholder="Enter seed keyword (e.g. AI meeting notes)"
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm ${input}`}
            />
          </div>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className={`px-3 py-2.5 rounded-xl border text-sm ${input}`}
          >
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
          <button
            onClick={generate}
            disabled={loading || !seed.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Research"}
          </button>
        </div>
      </div>

      {/* Results */}
      {sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((kw, i) => (
            <div key={i} className={`${card} border rounded-2xl p-4 flex items-start gap-3`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{kw.keyword}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${intentColors[kw.intent] || "bg-gray-500/20 text-gray-400"}`}>{kw.intent}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isDark ? "bg-white/5 text-white/40" : "bg-gray-100 text-gray-500"}`}>{kw.type}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className={sub}>Difficulty: <span className={kw.difficulty_score < 40 ? "text-green-400" : kw.difficulty_score < 70 ? "text-yellow-400" : "text-red-400"}>{kw.difficulty_score}</span></span>
                  <span className={sub}>Volume: <span className={volumeColors[kw.volume_estimate]}>{kw.volume_estimate}</span></span>
                  <span className={sub}>Conversion: <span className={kw.conversion_potential === "high" ? "text-green-400" : kw.conversion_potential === "medium" ? "text-yellow-400" : "text-gray-400"}>{kw.conversion_potential}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold text-purple-400">{kw.priority_score}</div>
                  <div className={`text-[10px] ${sub}`}>score</div>
                </div>
                <button
                  onClick={() => !saved[kw.keyword] && saveKeyword(kw)}
                  disabled={saving === kw.keyword || saved[kw.keyword]}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${saved[kw.keyword] ? "bg-green-500/20 text-green-400" : isDark ? "bg-white/5 hover:bg-white/10 text-white/40" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
                >
                  {saving === kw.keyword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}