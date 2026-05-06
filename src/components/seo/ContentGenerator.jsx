import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import { Loader2, FileText, Copy, Check, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ContentGenerator() {
  const { isDark } = useTheme();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("blog");
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const inputCls = isDark ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const sub = isDark ? "text-white/40" : "text-gray-400";

  const generate = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setResult(null);
    setSaved(false);

    const typePrompts = {
      blog: `Write an authoritative, human-like SEO blog post (900-1200 words) targeting the keyword: "${keyword}". 
Format in Markdown with H2/H3 structure, bullet points, and a FAQ section at the end.
Include featured snippet optimization (a direct 40-60 word answer near the top).
Tone: clear, authoritative, Silicon Valley product clarity. No keyword stuffing.`,
      landing: `Write a high-converting SEO landing page for: "${keyword}".
Include: Hero headline, value proposition, 3 key benefits with descriptions, social proof section, FAQ, and strong CTA.
Format in Markdown. Tone: benefit-driven, persuasive but not salesy.`,
      pillar: `Write a comprehensive pillar page (1200-1500 words) for the topic: "${keyword}".
Include a table of contents, deep coverage of subtopics, internal linking anchors, and an FAQ section.
Format in Markdown. This should be the definitive resource on the topic.`,
    };

    const res = await appClient.integrations.Core.InvokeLLM({
      prompt: `${typePrompts[type]}

App context: SILO is an AI-powered voice recording, meeting notes, and transcription SaaS for Arabic and English speakers.
Language: ${lang === "ar" ? "Arabic" : "English"}

Return JSON with:
- title: SEO-optimized page title (<60 chars)
- meta_description: compelling meta description (<160 chars, high CTR)
- h1: main H1 heading
- content: full markdown content
- secondary_keywords: array of 5 related keywords naturally included
- schema_type: "Article" | "FAQPage" | "WebPage"
- word_count: approximate word count`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          meta_description: { type: "string" },
          h1: { type: "string" },
          content: { type: "string" },
          secondary_keywords: { type: "array", items: { type: "string" } },
          schema_type: { type: "string" },
          word_count: { type: "number" }
        }
      },
      model: "claude_sonnet_4_6"
    });

    setResult(res);
    setLoading(false);
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    await appClient.entities.SEOPage.create({
      title: result.title,
      meta_description: result.meta_description,
      h1: result.h1,
      content: result.content,
      target_keyword: keyword,
      secondary_keywords: result.secondary_keywords,
      page_type: type === "blog" ? "blog" : type === "landing" ? "landing" : "pillar",
      word_count: result.word_count,
      status: "draft",
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <div className={`${card} border rounded-2xl p-5`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${sub}`}>Content Generator</h2>
        <div className="space-y-3">
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Target keyword (e.g. AI meeting notes for remote teams)"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputCls}`}
          />
          <div className="flex gap-2">
            {["blog", "landing", "pillar"].map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                  type === t ? "text-white" : isDark ? "bg-white/5 text-white/40" : "bg-gray-100 text-gray-500"
                }`}
                style={type === t ? { background: "linear-gradient(135deg, #A855F7, #6366F1)" } : {}}
              >
                {t === "blog" ? "Blog Post" : t === "landing" ? "Landing Page" : "Pillar Page"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={lang} onChange={e => setLang(e.target.value)} className={`px-3 py-2.5 rounded-xl border text-sm ${inputCls}`}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
            <button
              onClick={generate}
              disabled={loading || !keyword.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
            >
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Generating...</span> : "Generate Content"}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className={`${card} border rounded-2xl overflow-hidden`}>
          {/* Meta info */}
          <div className="p-5 border-b border-white/5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${sub}`}>Title ({result.title?.length} chars)</div>
                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{result.title}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={copy} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"}`}>
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className={`w-3.5 h-3.5 ${sub}`} />}
                </button>
                <button onClick={save} disabled={saving || saved} className={`w-8 h-8 rounded-full flex items-center justify-center ${saved ? "bg-green-500/20 text-green-400" : isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"}`}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className={`w-3.5 h-3.5 ${saved ? "text-green-400" : sub}`} />}
                </button>
              </div>
            </div>
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${sub}`}>Meta Description ({result.meta_description?.length} chars)</div>
              <div className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-gray-600"}`}>{result.meta_description}</div>
            </div>
            <div className="flex gap-4 text-xs">
              <span className={sub}>~{result.word_count} words</span>
              <span className={sub}>Schema: {result.schema_type}</span>
              <span className={sub}>{result.secondary_keywords?.length || 0} secondary keywords</span>
            </div>
          </div>
          {/* Content preview */}
          <div className="p-5 max-h-96 overflow-y-auto scrollbar-hide">
            <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`} style={{ fontSize: "13px" }}>
              <ReactMarkdown>{result.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}