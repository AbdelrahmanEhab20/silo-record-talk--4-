import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { X, Loader2, TrendingUp, TrendingDown, Minus, Lightbulb, BarChart3, MessageCircle, Zap } from "lucide-react";

const SENTIMENT_COLORS = {
  positive: { bar: "#22c55e", bg: "bg-green-500/15", text: "text-green-400", label: "Positive" },
  neutral:  { bar: "#6366f1", bg: "bg-indigo-500/15", text: "text-indigo-400", label: "Neutral" },
  negative: { bar: "#ef4444", bg: "bg-red-500/15",   text: "text-red-400",   label: "Negative" },
};

function SentimentIcon({ sentiment }) {
  if (sentiment === "positive") return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (sentiment === "negative") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-indigo-400" />;
}

export default function SentimentTimeline({ transcript, onClose }) {
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transcript) { setLoading(false); return; }
    analyze();
  }, [transcript]);

  const analyze = async () => {
    setLoading(true);
    try {
      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: `Analyze this meeting transcript comprehensively. Return structured JSON with sentiment timeline, topics, speaker analysis, and key insights.

  Transcript:
  ${transcript.slice(0, 5000)}

  Return ONLY valid JSON (no markdown) with this exact structure:
  {
  "overall": "positive"|"neutral"|"negative",
  "overall_score": 0-100,
  "summary": "one sentence overall mood description",
  "segments": [
   { "label": "Opening", "sentiment": "positive"|"neutral"|"negative", "score": 0-100, "note": "brief context" }
  ],
  "emotions": ["engaged", "collaborative", ...],
  "topics": [
   { "title": "Topic Name", "category": "Finance|HR|Operations|Sales|Legal|Other", "relevance": 0-100, "mentions": 5, "timeRange": "5:30-10:45" }
  ],
  "speaker_analysis": [
   { 
     "speaker": "Speaker Name", 
     "sentiment": "positive"|"neutral"|"negative", 
     "score": 0-100, 
     "tone_desc": "e.g. assertive, cautious",
     "talk_time_percent": 25,
     "speak_count": 12,
     "avg_response_length": "medium",
     "role": "decision_maker|questioner|recorder|collaborator",
     "key_topics": ["topic1", "topic2"],
     "engagement_level": 85
   }
  ],
  "key_insights": ["insight 1", "insight 2", "insight 3"]
  }`,
        response_json_schema: {
          type: "object",
          properties: {
            overall: { type: "string" },
            overall_score: { type: "number" },
            summary: { type: "string" },
            segments: { type: "array", items: { type: "object" } },
            emotions: { type: "array", items: { type: "string" } },
            topics: { type: "array", items: { type: "object" } },
            speaker_analysis: { type: "array", items: { type: "object" } },
            key_insights: { type: "array", items: { type: "string" } }
          }
        }
      });
      setData(result);
    } catch (e) {
      console.error("Sentiment analysis failed", e);
    }
    setLoading(false);
  };

  const bg = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  return (
    <div className={`rounded-2xl border shadow-2xl overflow-hidden ${bg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white text-[10px]">✦</span>
          </div>
          <span className="text-sm font-semibold">AI Sentiment Insights</span>
        </div>
        <button onClick={onClose} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/40 hover:text-white" : "bg-gray-100 text-gray-400 hover:text-gray-700"}`}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <p className={`text-xs ${textSub}`}>Analyzing meeting mood…</p>
        </div>
      ) : !data ? (
        <div className="py-10 text-center">
          <p className={`text-sm ${textSub}`}>No transcript available to analyze.</p>
        </div>
      ) : (
        <div className="p-4 space-y-5">
          {/* Overall mood */}
          <div className={`rounded-xl p-3 flex items-center gap-3 ${SENTIMENT_COLORS[data.overall]?.bg || "bg-white/5"}`}>
            <div className="text-2xl">
              {data.overall === "positive" ? "😊" : data.overall === "negative" ? "😟" : "😐"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${SENTIMENT_COLORS[data.overall]?.text}`}>
                  {SENTIMENT_COLORS[data.overall]?.label} Overall
                </span>
                <span className={`text-xs ${textSub}`}>{data.overall_score}/100</span>
              </div>
              <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? "text-white/60" : "text-gray-500"}`}>{data.summary}</p>
            </div>
          </div>

          {/* Score bar */}
          <div>
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "inherit" }}>
              <span className="text-red-400">Negative</span>
              <span className={textSub}>Neutral</span>
              <span className="text-green-400">Positive</span>
            </div>
            <div className={`relative h-2.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-100"}`}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${data.overall_score}%`,
                  background: data.overall === "positive"
                    ? "linear-gradient(90deg, #6366f1, #22c55e)"
                    : data.overall === "negative"
                    ? "linear-gradient(90deg, #ef4444, #f97316)"
                    : "linear-gradient(90deg, #6366f1, #22d3ee)",
                }}
              />
              {/* Marker */}
              <div className="absolute inset-y-0 w-px bg-white/30" style={{ left: "50%" }} />
            </div>
          </div>

          {/* Segment timeline */}
          {data.segments?.length > 0 && (
            <div>
              <p className={`text-[10px] uppercase tracking-wider mb-2 font-semibold ${textSub}`}>Timeline</p>
              <div className="space-y-2">
                {data.segments.map((seg, i) => {
                  const col = SENTIMENT_COLORS[seg.sentiment] || SENTIMENT_COLORS.neutral;
                  const width = `${Math.max(10, seg.score || 50)}%`;
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-20 shrink-0 text-right">
                        <span className={`text-[10px] font-medium truncate block ${isDark ? "text-white/50" : "text-gray-500"}`}>{seg.label}</span>
                      </div>
                      <div className={`flex-1 h-6 rounded-lg overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-50"} flex items-center`}>
                        <div
                          className="h-full rounded-lg flex items-center px-2 gap-1 transition-all duration-500"
                          style={{ width, background: `${col.bar}30`, border: `1px solid ${col.bar}40` }}
                        >
                          <SentimentIcon sentiment={seg.sentiment} />
                        </div>
                      </div>
                      <span className={`text-[10px] w-8 text-right ${col.text}`}>{seg.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Topics & Themes */}
          {data.topics?.length > 0 && (
           <div>
             <p className={`text-[10px] uppercase tracking-wider mb-2.5 font-semibold ${textSub}`}>Topics & Themes</p>
             <div className="space-y-2">
               {data.topics.map((topic, i) => (
                 <div key={i} className={`rounded-lg p-2.5 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                   <div className="flex items-start justify-between mb-1">
                     <div>
                       <p className="text-xs font-semibold">{topic.title}</p>
                       <span className={`text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 inline-block mt-0.5`}>{topic.category}</span>
                     </div>
                     <span className={`text-xs font-semibold ${isDark ? "text-white/60" : "text-gray-500"}`}>{topic.relevance}%</span>
                   </div>
                   <div className={`h-1.5 rounded-full ${isDark ? "bg-white/10" : "bg-gray-200"} overflow-hidden`}>
                     <div className="h-full rounded-full bg-blue-500" style={{ width: `${topic.relevance}%` }} />
                   </div>
                   <p className={`text-[10px] mt-1.5 ${textSub}`}>{topic.mentions} mentions · {topic.timeRange}</p>
                 </div>
               ))}
             </div>
           </div>
          )}

          {/* Speaker Analysis */}
          {data.speaker_analysis?.length > 0 && (
           <div>
             <p className={`text-[10px] uppercase tracking-wider mb-2.5 font-semibold ${textSub}`}>Speaker Analysis</p>
             <div className="space-y-3">
               {data.speaker_analysis.map((speaker, i) => {
                 const col = SENTIMENT_COLORS[speaker.sentiment] || SENTIMENT_COLORS.neutral;
                 const roleEmoji = { decision_maker: "👤", questioner: "❓", recorder: "📝", collaborator: "🤝" };
                 return (
                   <div key={i} className={`rounded-lg p-3 border ${isDark ? "border-white/8 bg-white/3" : "border-gray-200 bg-gray-50"}`}>
                     {/* Header: Name + Role */}
                     <div className="flex items-center justify-between mb-2.5">
                       <div>
                         <p className="text-xs font-semibold">{speaker.speaker}</p>
                         <p className={`text-[10px] ${textSub} mt-0.5`}>{speaker.tone_desc}</p>
                       </div>
                       <span className="text-sm">{roleEmoji[speaker.role] || "👤"}</span>
                     </div>

                     {/* Sentiment score */}
                     <div className="flex items-center gap-2 mb-2.5">
                       <div className="flex-1">
                         <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
                           <div className="h-full" style={{ width: `${speaker.score}%`, background: col.bar }} />
                         </div>
                       </div>
                       <span className={`text-xs font-semibold w-10 text-right ${col.text}`}>{speaker.score}%</span>
                     </div>

                     {/* Metrics */}
                     <div className="grid grid-cols-3 gap-2 mb-2.5">
                       <div className={`rounded p-2 text-center ${isDark ? "bg-white/5" : "bg-white/50"}`}>
                         <div className="flex items-center justify-center gap-1 mb-1">
                           <BarChart3 className="w-3 h-3 opacity-60" />
                         </div>
                         <p className={`text-xs font-semibold`}>{speaker.talk_time_percent}%</p>
                         <p className={`text-[9px] ${textSub}`}>Talk time</p>
                       </div>
                       <div className={`rounded p-2 text-center ${isDark ? "bg-white/5" : "bg-white/50"}`}>
                         <div className="flex items-center justify-center gap-1 mb-1">
                           <MessageCircle className="w-3 h-3 opacity-60" />
                         </div>
                         <p className={`text-xs font-semibold`}>{speaker.speak_count}</p>
                         <p className={`text-[9px] ${textSub}`}>Contributions</p>
                       </div>
                       <div className={`rounded p-2 text-center ${isDark ? "bg-white/5" : "bg-white/50"}`}>
                         <div className="flex items-center justify-center gap-1 mb-1">
                           <Zap className="w-3 h-3 opacity-60" />
                         </div>
                         <p className={`text-xs font-semibold`}>{speaker.engagement_level}%</p>
                         <p className={`text-[9px] ${textSub}`}>Engagement</p>
                       </div>
                     </div>

                     {/* Key topics */}
                     {speaker.key_topics?.length > 0 && (
                       <div className={`text-[10px] ${textSub}`}>
                         <p className="mb-1"><span className="opacity-60">Topics:</span> {speaker.key_topics.join(", ")}</p>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>
          )}

          {/* Emotion tags */}
          {data.emotions?.length > 0 && (
           <div>
             <p className={`text-[10px] uppercase tracking-wider mb-2 font-semibold ${textSub}`}>Detected Emotions</p>
             <div className="flex flex-wrap gap-1.5">
               {data.emotions.map((e, i) => (
                 <span key={i} className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${isDark ? "bg-white/8 text-white/60 border border-white/10" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                   {e}
                 </span>
               ))}
             </div>
           </div>
          )}

          {/* Key Insights */}
          {data.key_insights?.length > 0 && (
           <div className={`rounded-lg p-3 border-l-4 ${isDark ? "bg-amber-500/10 border-amber-500" : "bg-amber-50 border-amber-400"}`}>
             <div className="flex gap-2">
               <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
               <div>
                 <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Insights</p>
                 <ul className="space-y-1">
                   {data.key_insights.slice(0, 3).map((insight, i) => (
                     <li key={i} className={`text-xs leading-relaxed ${isDark ? "text-white/70" : "text-gray-600"}`}>✓ {insight}</li>
                   ))}
                 </ul>
               </div>
             </div>
           </div>
          )}
          </div>
      )}
    </div>
  );
}