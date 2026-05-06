import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { useNavigate } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Lightbulb, BarChart3, MessageCircle, Zap, Target, Layers, Hash, AlignLeft, Repeat, Brain, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const SENTIMENT_COLORS = {
  positive: { bar: "#22c55e", bg: "bg-green-500/15", text: "text-green-400", label: "Positive" },
  neutral:  { bar: "#6366f1", bg: "bg-indigo-500/15", text: "text-indigo-400", label: "Neutral" },
  negative: { bar: "#ef4444", bg: "bg-red-500/15",   text: "text-red-400",   label: "Negative" },
};

const CHART_COLORS = ["#A855F7","#6366F1","#22d3ee","#22c55e","#f59e0b","#ef4444","#ec4899","#8b5cf6","#14b8a6","#f97316"];

const CATEGORY_COLORS = {
  Growth: "#22c55e", Innovation: "#6366F1", Sustainability: "#14b8a6",
  Collaboration: "#f59e0b", "Policy / Governance": "#A855F7",
};

function SectionHeader({ icon: Icon, title, color = "text-purple-400" }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-xs font-bold uppercase tracking-widest text-white/40">{title}</span>
    </div>
  );
}

function WordCloud({ keywords, isDark }) {
  if (!keywords?.length) return null;
  const max = Math.max(...keywords.map(k => k.frequency || 1));
  return (
    <div className="flex flex-wrap gap-2 justify-center py-4">
      {keywords.slice(0, 20).map((kw, i) => {
        const size = 10 + Math.round(((kw.frequency || 1) / max) * 18);
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const opacity = 0.4 + ((kw.relevance_score || kw.frequency || 1) / 100) * 0.6;
        return (
          <span key={i}
            className="px-2 py-1 rounded-full font-semibold cursor-default select-none transition-transform hover:scale-110"
            style={{ fontSize: size, color, background: `${color}18`, border: `1px solid ${color}30`, opacity }}>
            {kw.keyword}
          </span>
        );
      })}
    </div>
  );
}

function StrengthBadge({ strength }) {
  const map = {
    High:   { cls: "bg-green-500/15 text-green-400 border-green-500/30",   dot: "bg-green-400" },
    Medium: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",   dot: "bg-amber-400" },
    Low:    { cls: "bg-red-500/15   text-red-400   border-red-500/30",     dot: "bg-red-400" },
  };
  const s = map[strength] || map.Low;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {strength}
    </span>
  );
}

function CustomTooltip({ active, payload, label, isDark }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-xl px-3 py-2 text-xs shadow-xl border ${isDark ? "bg-[#1C1C1E] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export default function WordAnalysis() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("id");
  const [transcript, setTranscript] = useState(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  // Helper: resolve full text from inline or file URL
  const resolveTranscriptText = async (inline, fileUrl) => {
    const text = (inline || "").trim();
    const isTruncated = text.includes("...[truncated") || text.includes("see transcript_file_url") || text.includes("[upload failed");
    if (fileUrl && (!text || isTruncated)) {
      try {
        const res = await fetch(fileUrl);
        if (res.ok) {
          const full = (await res.text()).trim();
          if (full) return full;
        }
      } catch (e) {
        console.warn("Failed to fetch transcript file:", e);
      }
    }
    return text;
  };

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      try {
        const user = await appClient.auth.me();
        const [sess, subsessions] = await Promise.all([
          appClient.entities.Session.get(sessionId),
          appClient.entities.Session.filter({ parent_session_id: sessionId, is_subsession: true }),
        ]);
        if (sess.user_email !== user.email) return;
        setSessionTitle(sess.title || "Session");

        // Build full transcript: merge subsessions if they exist, otherwise use main session
        let fullTranscript = "";
        if (subsessions && subsessions.length > 0) {
          const sorted = [...subsessions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          const parts = await Promise.all(
            sorted.map(async (sub, idx) => {
              const text = await resolveTranscriptText(sub.transcript_text, sub.transcript_file_url);
              return text ? `[Part ${idx + 1}]\n${text}` : "";
            })
          );
          fullTranscript = parts.filter(Boolean).join("\n\n");
          // If subsessions are empty/missing, fall back to main session
          if (!fullTranscript.trim()) {
            fullTranscript = await resolveTranscriptText(sess.transcript_text, sess.transcript_file_url);
          }
        } else {
          fullTranscript = await resolveTranscriptText(sess.transcript_text, sess.transcript_file_url);
        }

        setTranscript(fullTranscript);

        // Use cached analysis only if it was generated from full transcript (check word count sanity)
        const cachedWordCount = sess.word_analysis?.total_word_count || 0;
        const actualWordCount = fullTranscript.trim().split(/\s+/).filter(Boolean).length;
        const cacheIsStale = cachedWordCount < actualWordCount * 0.5; // cache has < 50% of real words

        if (sess.word_analysis && sess.sentiment_analysis && !cacheIsStale) {
          setAnalysisData(sess.word_analysis);
          setSentimentData(sess.sentiment_analysis);
        } else if (fullTranscript) {
          const [wordResult, sentimentResult] = await Promise.all([
            runWordAnalysis(fullTranscript),
            runSentimentAnalysis(fullTranscript),
          ]);
          // Cache results
          await appClient.entities.Session.update(sessionId, {
            word_analysis: wordResult,
            sentiment_analysis: sentimentResult,
          });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [sessionId]);

  const runWordAnalysis = async (t) => {
    // Count words accurately client-side before sending to LLM
    const cleanText = t.replace(/\[\d+:\d+(:\d+)?\]/g, "").replace(/\[Part \d+\]/g, "").trim();
    const actualTotalWords = cleanText.split(/\s+/).filter(Boolean).length;
    const actualUniqueWords = new Set(cleanText.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean)).size;

    const result = await appClient.integrations.Core.InvokeLLM({
      prompt: `You are an advanced NLP word analysis engine. Analyze this transcript and return structured JSON.

IMPORTANT: The transcript has exactly ${actualTotalWords} total words and ${actualUniqueWords} unique words — use these exact numbers.

Transcript:
${t.slice(0, 8000)}

Return ONLY valid JSON with this structure:
{
  "total_word_count": ${actualTotalWords},
  "unique_word_count": ${actualUniqueWords},
  "keywords": [{ "keyword": string, "frequency": number, "relevance_score": number }],
  "concepts": [{ "concept": string, "related_keywords": string, "insight": string }],
  "bigrams": [{ "phrase": string, "frequency": number }],
  "trigrams": [{ "phrase": string, "frequency": number }],
  "dominant_words": [{ "word": string, "percentage": number }],
  "emphasis_points": [string],
  "strategic_signals": [{ "category": string, "strength": "High"|"Medium"|"Low", "evidence": string }]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          total_word_count: { type: "number" },
          unique_word_count: { type: "number" },
          keywords: { type: "array", items: { type: "object" } },
          concepts: { type: "array", items: { type: "object" } },
          bigrams: { type: "array", items: { type: "object" } },
          trigrams: { type: "array", items: { type: "object" } },
          dominant_words: { type: "array", items: { type: "object" } },
          emphasis_points: { type: "array", items: { type: "string" } },
          strategic_signals: { type: "array", items: { type: "object" } },
        }
      }
    });
    setAnalysisData(result);
    return result;
  };

  const runSentimentAnalysis = async (t) => {
    const result = await appClient.integrations.Core.InvokeLLM({
      prompt: `Analyze this meeting transcript for sentiment, speakers, topics and insights. Return ONLY valid JSON:
{
  "overall": "positive"|"neutral"|"negative",
  "overall_score": 0-100,
  "summary": "one sentence mood description",
  "segments": [{ "label": string, "sentiment": string, "score": 0-100, "note": string }],
  "emotions": [string],
  "topics": [{ "title": string, "category": string, "relevance": 0-100, "mentions": number, "timeRange": string }],
  "speaker_analysis": [{ "speaker": string, "sentiment": string, "score": 0-100, "tone_desc": string, "talk_time_percent": number, "speak_count": number, "engagement_level": number, "role": string, "key_topics": [string] }],
  "key_insights": [string]
}
Transcript: ${t.slice(0, 8000)}`,
      response_json_schema: {
        type: "object",
        properties: {
          overall: { type: "string" }, overall_score: { type: "number" }, summary: { type: "string" },
          segments: { type: "array", items: { type: "object" } },
          emotions: { type: "array", items: { type: "string" } },
          topics: { type: "array", items: { type: "object" } },
          speaker_analysis: { type: "array", items: { type: "object" } },
          key_insights: { type: "array", items: { type: "string" } }
        }
      }
    });
    setSentimentData(result);
    return result;
  };

  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "words", label: "Words", icon: Hash },
    { id: "sentiment", label: "Sentiment", icon: TrendingUp },
    { id: "speakers", label: "Speakers", icon: MessageCircle },
    { id: "strategy", label: "Strategy", icon: Brain },
  ];

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex flex-col items-center justify-center gap-4`}>
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#A855F7,#6366F1)" }}>
            <Brain className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 w-5 h-5 animate-spin text-purple-400" />
        </div>
        <div className="text-center">
          <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Analyzing transcript…</p>
          <p className={`text-xs mt-1 ${textSub}`}>Running NLP analysis & sentiment models</p>
        </div>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className={`min-h-screen ${bg} flex flex-col items-center justify-center gap-4 px-6`}>
        <AlignLeft className="w-10 h-10 text-white/20" />
        <p className={`text-sm text-center ${textSub}`}>No transcript available for this session.</p>
        <button onClick={() => navigate(`/SessionDetail?id=${sessionId}`)}
          className="text-xs text-purple-400 underline">← Back to session</button>
      </div>
    );
  }

  const a = analysisData;
  const s = sentimentData;

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-30 border-b ${isDark ? "bg-[#0A0A0A]/90 border-white/8" : "bg-white/90 border-gray-200"} backdrop-blur-md`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/SessionDetail?id=${sessionId}`)}
            className={`flex items-center gap-1.5 text-xs ${isDark ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-900"} transition-colors`}>
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>{sessionTitle}</p>
            <p className={`text-[10px] ${textSub}`}>AI Speech & Word Analysis</p>
          </div>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#A855F7,#6366F1)" }}>
            <Brain className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "text-white" : isDark ? "text-white/40 hover:text-white/70" : "text-gray-400 hover:text-gray-700"
              }`}
              style={activeTab === tab.id ? { background: "linear-gradient(135deg,#A855F7,#6366F1)" } : {}}>
              <tab.icon className="w-3 h-3" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Words", value: a?.total_word_count?.toLocaleString() || "—", icon: AlignLeft, color: "text-purple-400", bg: "from-purple-500/20 to-indigo-500/10" },
                { label: "Unique Words", value: a?.unique_word_count?.toLocaleString() || "—", icon: Hash, color: "text-cyan-400", bg: "from-cyan-500/20 to-blue-500/10" },
                { label: "Overall Sentiment", value: s ? SENTIMENT_COLORS[s.overall]?.label : "—", icon: TrendingUp, color: s ? SENTIMENT_COLORS[s.overall]?.text : "text-white/40", bg: "from-green-500/20 to-emerald-500/10" },
                { label: "Sentiment Score", value: s ? `${s.overall_score}/100` : "—", icon: Target, color: "text-amber-400", bg: "from-amber-500/20 to-orange-500/10" },
              ].map((stat, i) => (
                <div key={i} className={`rounded-2xl border bg-gradient-to-br p-4 ${stat.bg} ${isDark ? "border-white/8" : "border-gray-200"}`}>
                  <stat.icon className={`w-4 h-4 mb-2 ${stat.color}`} />
                  <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stat.value}</p>
                  <p className={`text-[10px] ${textSub}`}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Word Cloud */}
            {a?.keywords?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Hash} title="Word Cloud" color="text-purple-400" />
                <WordCloud keywords={a.keywords} isDark={isDark} />
              </div>
            )}

            {/* Overall sentiment summary */}
            {s && (
              <div className={`rounded-2xl border p-4 flex items-center gap-3 ${SENTIMENT_COLORS[s.overall]?.bg || "bg-white/5"} ${isDark ? "border-white/8" : "border-gray-200"}`}>
                <div className="text-3xl">{s.overall === "positive" ? "😊" : s.overall === "negative" ? "😟" : "😐"}</div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${SENTIMENT_COLORS[s.overall]?.text}`}>{SENTIMENT_COLORS[s.overall]?.label} Mood</p>
                  <p className={`text-xs leading-relaxed mt-0.5 ${isDark ? "text-white/60" : "text-gray-500"}`}>{s.summary}</p>
                </div>
              </div>
            )}

            {/* Key insights */}
            {s?.key_insights?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Lightbulb} title="Key Insights" color="text-amber-400" />
                <div className="space-y-2">
                  {s.key_insights.map((ins, i) => (
                    <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${isDark ? "bg-amber-500/8 border border-amber-500/15" : "bg-amber-50 border border-amber-200"}`}>
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <p className={`text-xs leading-relaxed ${isDark ? "text-white/80" : "text-gray-700"}`}>{ins}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── WORDS TAB ── */}
        {activeTab === "words" && (
          <>
            {/* Top Keywords bar chart */}
            {a?.keywords?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Hash} title="Top Keywords" color="text-purple-400" />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={a.keywords.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="keyword" width={80} tick={{ fontSize: 10, fill: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Bar dataKey="frequency" radius={[0, 6, 6, 0]}>
                      {a.keywords.slice(0, 12).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Dominant words % */}
            {a?.dominant_words?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={TrendingUp} title="Dominant Words Share" color="text-cyan-400" />
                <div className="space-y-2">
                  {a.dominant_words.slice(0, 10).map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`w-20 text-[11px] font-medium truncate ${isDark ? "text-white/70" : "text-gray-700"}`}>{w.word}</span>
                      <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/8" : "bg-gray-100"}`}>
                        <div className="h-full rounded-full" style={{ width: `${w.percentage}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                      <span className={`text-[10px] w-9 text-right font-semibold ${isDark ? "text-white/40" : "text-gray-400"}`}>{w.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bigrams & Trigrams */}
            <div className="grid grid-cols-1 gap-4">
              {a?.bigrams?.length > 0 && (
                <div className={`rounded-2xl border p-4 ${card}`}>
                  <SectionHeader icon={Repeat} title="Top Bigrams (2-word)" color="text-blue-400" />
                  <div className="space-y-1.5">
                    {a.bigrams.slice(0, 8).map((b, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className={`text-xs ${isDark ? "text-white/70" : "text-gray-700"}`}>"{b.phrase}"</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"}`}>×{b.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {a?.trigrams?.length > 0 && (
                <div className={`rounded-2xl border p-4 ${card}`}>
                  <SectionHeader icon={Repeat} title="Top Trigrams (3-word)" color="text-pink-400" />
                  <div className="space-y-1.5">
                    {a.trigrams.slice(0, 8).map((t, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className={`text-xs ${isDark ? "text-white/70" : "text-gray-700"}`}>"{t.phrase}"</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? "bg-pink-500/15 text-pink-400" : "bg-pink-50 text-pink-600"}`}>×{t.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Concepts */}
            {a?.concepts?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Layers} title="Concept Clusters" color="text-emerald-400" />
                <div className="space-y-3">
                  {a.concepts.map((c, i) => (
                    <div key={i} className={`p-3 rounded-xl border-l-4 ${isDark ? "bg-white/4 border-white/10" : "bg-gray-50 border-gray-200"}`}
                      style={{ borderLeftColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                      <p className={`text-xs font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{c.concept}</p>
                      <p className={`text-[10px] mb-1 ${isDark ? "text-white/40" : "text-gray-400"}`}>{c.related_keywords}</p>
                      <p className={`text-xs ${isDark ? "text-white/65" : "text-gray-600"}`}>{c.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emphasis points */}
            {a?.emphasis_points?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Target} title="Emphasis Detection" color="text-rose-400" />
                <div className="space-y-2">
                  {a.emphasis_points.map((pt, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl ${isDark ? "bg-rose-500/8 border border-rose-500/15" : "bg-rose-50 border border-rose-200"}`}>
                      <Target className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                      <p className={`text-xs leading-relaxed ${isDark ? "text-white/75" : "text-gray-700"}`}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SENTIMENT TAB ── */}
        {activeTab === "sentiment" && s && (
          <>
            {/* Score bar */}
            <div className={`rounded-2xl border p-4 ${card}`}>
              <SectionHeader icon={TrendingUp} title="Sentiment Score" color="text-green-400" />
              <div className="flex justify-between text-[10px] mb-2">
                <span className="text-red-400">Negative</span>
                <span className={textSub}>Neutral</span>
                <span className="text-green-400">Positive</span>
              </div>
              <div className={`relative h-3 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-100"}`}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${s.overall_score}%`,
                    background: s.overall === "positive"
                      ? "linear-gradient(90deg,#6366f1,#22c55e)"
                      : s.overall === "negative"
                      ? "linear-gradient(90deg,#ef4444,#f97316)"
                      : "linear-gradient(90deg,#6366f1,#22d3ee)",
                  }} />
                <div className="absolute inset-y-0 w-px bg-white/30" style={{ left: "50%" }} />
              </div>
              <p className={`text-xs text-center mt-2 font-semibold ${SENTIMENT_COLORS[s.overall]?.text}`}>{s.overall_score}/100</p>
            </div>

            {/* Segment timeline chart */}
            {s.segments?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={BarChart3} title="Sentiment Timeline" color="text-indigo-400" />
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={s.segments} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af" }} />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {s.segments.map((seg, i) => (
                        <Cell key={i} fill={SENTIMENT_COLORS[seg.sentiment]?.bar || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Topics */}
            {s.topics?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Layers} title="Topics & Themes" color="text-blue-400" />
                <div className="space-y-3">
                  {s.topics.map((topic, i) => (
                    <div key={i} className={`rounded-xl p-3 ${isDark ? "bg-white/4" : "bg-gray-50"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className={`text-xs font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{topic.title}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 inline-block mt-0.5">{topic.category}</span>
                        </div>
                        <span className={`text-xs font-semibold ${isDark ? "text-white/50" : "text-gray-500"}`}>{topic.relevance}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/8" : "bg-gray-200"}`}>
                        <div className="h-full rounded-full" style={{ width: `${topic.relevance}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                      <p className={`text-[10px] mt-1.5 ${textSub}`}>{topic.mentions} mentions · {topic.timeRange}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emotions */}
            {s.emotions?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Zap} title="Detected Emotions" color="text-pink-400" />
                <div className="flex flex-wrap gap-2">
                  {s.emotions.map((e, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}20`, color: CHART_COLORS[i % CHART_COLORS.length], border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}30` }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SPEAKERS TAB ── */}
        {activeTab === "speakers" && s?.speaker_analysis?.length > 0 && (
          <>
            {/* Talk time pie */}
            <div className={`rounded-2xl border p-4 ${card}`}>
              <SectionHeader icon={MessageCircle} title="Talk Time Distribution" color="text-cyan-400" />
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={s.speaker_analysis} dataKey="talk_time_percent" nameKey="speaker" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                      {s.speaker_analysis.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {s.speaker_analysis.map((sp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className={`text-[11px] flex-1 truncate ${isDark ? "text-white/70" : "text-gray-700"}`}>{sp.speaker}</span>
                      <span className={`text-[10px] font-semibold ${isDark ? "text-white/40" : "text-gray-400"}`}>{sp.talk_time_percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Speaker cards */}
            {s.speaker_analysis.map((speaker, i) => {
              const col = SENTIMENT_COLORS[speaker.sentiment] || SENTIMENT_COLORS.neutral;
              const roleEmoji = { decision_maker: "👤", questioner: "❓", recorder: "📝", collaborator: "🤝" };
              return (
                <div key={i} className={`rounded-2xl border p-4 ${card}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg,${CHART_COLORS[i % CHART_COLORS.length]},${CHART_COLORS[(i+1) % CHART_COLORS.length]})` }}>
                      {speaker.speaker?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{speaker.speaker}</p>
                      <p className={`text-[10px] ${textSub}`}>{speaker.tone_desc}</p>
                    </div>
                    <span className="text-base">{roleEmoji[speaker.role] || "👤"}</span>
                  </div>
                  {/* Sentiment bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/8" : "bg-gray-100"}`}>
                      <div className="h-full rounded-full" style={{ width: `${speaker.score}%`, background: col.bar }} />
                    </div>
                    <span className={`text-xs font-bold w-10 text-right ${col.text}`}>{speaker.score}%</span>
                  </div>
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { icon: BarChart3, val: `${speaker.talk_time_percent}%`, label: "Talk time" },
                      { icon: MessageCircle, val: speaker.speak_count, label: "Contributions" },
                      { icon: Zap, val: `${speaker.engagement_level}%`, label: "Engagement" },
                    ].map((m, j) => (
                      <div key={j} className={`rounded-xl p-2 text-center ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                        <m.icon className={`w-3 h-3 mx-auto mb-1 ${textSub}`} />
                        <p className={`text-xs font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{m.val}</p>
                        <p className={`text-[9px] ${textSub}`}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                  {speaker.key_topics?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {speaker.key_topics.map((t, j) => (
                        <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? "bg-white/8 text-white/50 border border-white/10" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── STRATEGY TAB ── */}
        {activeTab === "strategy" && (
          <>
            {a?.strategic_signals?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Globe} title="Strategic Language Signals" color="text-purple-400" />
                <div className="space-y-3">
                  {a.strategic_signals.map((sig, i) => {
                    const catColor = CATEGORY_COLORS[sig.category] || CHART_COLORS[i % CHART_COLORS.length];
                    return (
                      <div key={i} className={`p-3 rounded-xl border-l-4 ${isDark ? "bg-white/4 border-white/8" : "bg-gray-50 border-gray-200"}`}
                        style={{ borderLeftColor: catColor }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold" style={{ color: catColor }}>{sig.category}</span>
                          <StrengthBadge strength={sig.strength} />
                        </div>
                        <p className={`text-xs leading-relaxed ${isDark ? "text-white/65" : "text-gray-600"}`}>{sig.evidence}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Radar chart of categories */}
            {a?.strategic_signals?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Brain} title="Strategic Balance" color="text-indigo-400" />
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={a.strategic_signals.map(sig => ({
                    subject: sig.category,
                    value: sig.strength === "High" ? 3 : sig.strength === "Medium" ? 2 : 1,
                  }))}>
                    <PolarGrid stroke={isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: isDark ? "rgba(255,255,255,0.4)" : "#6b7280" }} />
                    <Radar name="Strength" dataKey="value" stroke="#A855F7" fill="#A855F7" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Emphasis points */}
            {a?.emphasis_points?.length > 0 && (
              <div className={`rounded-2xl border p-4 ${card}`}>
                <SectionHeader icon={Target} title="Emphasis & Repetition Patterns" color="text-rose-400" />
                <div className="space-y-2">
                  {a.emphasis_points.map((pt, i) => (
                    <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${isDark ? "bg-rose-500/8 border border-rose-500/15" : "bg-rose-50 border border-rose-200"}`}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: "linear-gradient(135deg,#f43f5e,#fb923c)" }}>{i + 1}</span>
                      <p className={`text-xs leading-relaxed ${isDark ? "text-white/75" : "text-gray-700"}`}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}