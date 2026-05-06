import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle } from "lucide-react";

export default function PainPointsAnalysis({ sessions }) {
  const { isDark } = useTheme();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessions.length > 0) {
      analyzePainPoints();
    }
  }, [sessions]);

  const analyzePainPoints = async () => {
    setLoading(true);
    try {
      const sortedByDate = [...sessions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const recentSessions = sortedByDate.slice(-20);

      const sessionSummaries = recentSessions.map(s => `
Title: ${s.title}
Date: ${new Date(s.created_date).toLocaleDateString()}
Summary: ${s.summary_text?.substring(0, 400) || "No summary"}
Tags: ${(s.tags || []).join(", ")}
`).join("\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these 20 recent meetings to identify recurring team pain points and challenges:

${sessionSummaries}

Look for patterns across meetings (repeated issues, blockers, challenges mentioned multiple times).
Score each pain point by frequency and impact.

Return ONLY valid JSON (no markdown):
{
  "pain_points": [
    {
      "issue": "brief title",
      "frequency": number (1-5, how often mentioned),
      "impact": "high" | "medium" | "low",
      "example": "specific example from meetings",
      "suggested_action": "one actionable step"
    }
  ],
  "most_critical": "the single most critical issue to address",
  "pattern_insight": "meta-insight about what these issues indicate"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            pain_points: { type: "array" },
            most_critical: { type: "string" },
            pattern_insight: { type: "string" }
          }
        }
      });

      setAnalysis(result);
    } catch (e) {
      console.error("Pain points analysis failed", e);
    }
    setLoading(false);
  };

  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-100";

  if (loading) {
    return (
      <div className={`${card} rounded-2xl border ${border} p-6 flex items-center justify-center gap-3`}>
        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
        <p className={`text-xs ${textSub}`}>Scanning for recurring pain points...</p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className={`${card} rounded-2xl border ${border} p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <h3 className="text-sm font-semibold">Recurring Team Pain Points</h3>
      </div>

      {/* Most Critical */}
      <div className={`rounded-lg p-4 ${isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"}`}>
        <p className={`text-xs font-semibold ${isDark ? "text-red-400" : "text-red-600"} uppercase tracking-wider mb-1`}>Most Critical Issue</p>
        <p className={`text-sm ${isDark ? "text-red-400/90" : "text-red-700"}`}>{analysis.most_critical}</p>
      </div>

      {/* Pattern Insight */}
      <div className={`rounded-lg p-3 ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
        <p className={`text-xs font-semibold ${textSub} uppercase tracking-wider mb-1`}>Pattern Insight</p>
        <p className={`text-xs ${isDark ? "text-white/70" : "text-gray-700"}`}>{analysis.pattern_insight}</p>
      </div>

      {/* Pain Points List */}
      {analysis.pain_points && analysis.pain_points.length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Issues by Frequency</p>
          {analysis.pain_points.map((point, i) => {
            const impactColor = point.impact === 'high' 
              ? isDark ? 'bg-red-500/15 border-red-500/30' : 'bg-red-50 border-red-200'
              : point.impact === 'medium'
              ? isDark ? 'bg-yellow-500/15 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
              : isDark ? 'bg-blue-500/15 border-blue-500/30' : 'bg-blue-50 border-blue-200';

            return (
              <div key={i} className={`rounded-lg border p-3 space-y-2 ${impactColor}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDark ? "text-white/90" : "text-gray-900"}`}>
                      {point.issue}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      point.impact === 'high'
                        ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                        : point.impact === 'medium'
                        ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                        : isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {point.impact}
                    </span>
                    <span className={`text-xs font-semibold ${textSub}`}>×{point.frequency}</span>
                  </div>
                </div>
                {point.example && (
                  <p className={`text-xs italic ${isDark ? "text-white/50" : "text-gray-500"}`}>"{point.example}"</p>
                )}
                {point.suggested_action && (
                  <div className={`p-2 rounded text-xs ${isDark ? "bg-white/5 text-white/70" : "bg-white/50 text-gray-700"}`}>
                    <span className="font-semibold">Action: </span>{point.suggested_action}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}