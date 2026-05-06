import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function SentimentOutcomeAnalysis({ sessions }) {
  const { isDark } = useTheme();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessions.length > 0) {
      analyzeSentimentOutcome();
    }
  }, [sessions]);

  const analyzeSentimentOutcome = async () => {
    setLoading(true);
    try {
      const sortedByDate = [...sessions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const recentSessions = sortedByDate.slice(-12);

      const sessionPrompt = recentSessions.map((s, i) => `
Session ${i + 1}: ${s.title}
Date: ${new Date(s.created_date).toLocaleDateString()}
Summary: ${s.summary_text?.substring(0, 300) || "No summary"}
Tags: ${(s.tags || []).join(", ")}
Duration: ${Math.floor((s.duration || 0) / 60)}m
`).join("\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these meetings over time and provide insights on sentiment-to-outcome correlation:

${sessionPrompt}

For each session, score sentiment (0-100) based on tone, keywords, and topics.
Identify positive outcomes (successful launches, approvals, resolutions) or negative outcomes (blockers, delays, issues).
Correlate whether positive sentiment meetings lead to better outcomes.

Return ONLY valid JSON (no markdown):
{
  "correlation_score": number (0-100, higher = strong positive correlation),
  "insights": string (1-2 sentences on the relationship),
  "monthly_trend": [
    {
      "month": "MMM",
      "sentiment_avg": number (0-100),
      "outcome_score": number (0-100, based on action completion and wins),
      "note": "brief observation"
    }
  ],
  "key_finding": "single most important insight about sentiment-outcome relationship"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            correlation_score: { type: "number" },
            insights: { type: "string" },
            monthly_trend: { type: "array" },
            key_finding: { type: "string" }
          }
        }
      });

      setAnalysis(result);
    } catch (e) {
      console.error("Sentiment analysis failed", e);
    }
    setLoading(false);
  };

  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-100";
  const gridColor = isDark ? "#ffffff0a" : "#f3f4f6";

  if (loading) {
    return (
      <div className={`${card} rounded-2xl border ${border} p-6 flex items-center justify-center gap-3`}>
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        <p className={`text-xs ${textSub}`}>Analyzing sentiment-outcome correlation...</p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className={`${card} rounded-2xl border ${border} p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-semibold">Sentiment-Outcome Correlation</h3>
      </div>

      {/* Correlation Score */}
      <div className={`rounded-lg p-4 ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
        <p className={`text-xs ${textSub} mb-2`}>Correlation Strength</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/8" : "bg-gray-200"}`}>
              <div className="h-full bg-blue-400" style={{ width: `${analysis.correlation_score}%` }} />
            </div>
          </div>
          <span className="text-lg font-bold text-blue-400 w-12 text-right">{analysis.correlation_score}%</span>
        </div>
        <p className={`text-xs ${textSub} mt-2`}>{analysis.insights}</p>
      </div>

      {/* Key Finding */}
      <div className={`rounded-lg p-3 ${isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}>
        <p className={`text-xs font-semibold ${isDark ? "text-blue-400" : "text-blue-600"} mb-1`}>Key Finding</p>
        <p className={`text-xs ${isDark ? "text-blue-400/80" : "text-blue-700"}`}>{analysis.key_finding}</p>
      </div>

      {/* Monthly Trend */}
      {analysis.monthly_trend && analysis.monthly_trend.length > 0 && (
        <>
          <div className={`rounded-lg p-3 ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
            <p className={`text-xs font-semibold ${textSub} mb-3`}>Monthly Trend</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analysis.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" stroke={isDark ? "#ffffff40" : "#9ca3af"} style={{ fontSize: "11px" }} />
                <YAxis stroke={isDark ? "#ffffff40" : "#9ca3af"} style={{ fontSize: "11px" }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? "#1C1C1E" : "#fff", border: `1px solid ${isDark ? "#ffffff20" : "#e5e7eb"}` }} />
                <Line type="monotone" dataKey="sentiment_avg" stroke="#06b6d4" strokeWidth={2} name="Sentiment" />
                <Line type="monotone" dataKey="outcome_score" stroke="#8b5cf6" strokeWidth={2} name="Outcome Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {analysis.monthly_trend.map((m, i) => (
              <div key={i} className={`flex items-center justify-between text-xs p-2 rounded ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
                <span className="font-medium">{m.month}</span>
                <span className={textSub}>{m.note}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}