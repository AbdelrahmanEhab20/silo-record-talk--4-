import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { Loader2, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ParticipationTrends({ sessions }) {
  const { isDark } = useTheme();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessions.length > 0) {
      analyzeParticipation();
    }
  }, [sessions]);

  const analyzeParticipation = async () => {
    setLoading(true);
    try {
      const sortedByDate = [...sessions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const recentSessions = sortedByDate.slice(-12);

      const speakerData = {};
      recentSessions.forEach(s => {
        if (!s.transcript_text) return;
        const regex = /\[[\d:]+\]\s*([^:]+):/g;
        let match;
        while ((match = regex.exec(s.transcript_text)) !== null) {
          const speaker = match[1].trim();
          if (!speakerData[speaker]) speakerData[speaker] = { count: 0, meetings: 0, first_date: s.created_date };
          speakerData[speaker].count += 1;
          speakerData[speaker].meetings = speakerData[speaker].meetings || 0;
          if (!speakerData[speaker].dates) speakerData[speaker].dates = [];
          if (!speakerData[speaker].dates.includes(s.created_date)) {
            speakerData[speaker].dates.push(s.created_date);
            speakerData[speaker].meetings += 1;
          }
        }
      });

      const speakers = Object.entries(speakerData)
        .map(([name, data]) => ({ name, contribution: data.count, meetings: data.meetings }))
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 8);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze speaker participation trends from these meeting transcripts over the last 3 months:

Total meetings: ${recentSessions.length}
Key speakers and their activity:
${speakers.map(s => `- ${s.name}: ${s.contribution} total turns in ${s.meetings} meetings`).join("\n")}

Identify:
1. Long-term trends in who participates most
2. Speakers who are becoming more or less vocal
3. Participation equity issues (is one person dominating?)
4. Engagement health

Return ONLY valid JSON:
{
  "participation_health_score": number (0-100, higher = balanced),
  "key_insights": string (2-3 sentences on participation patterns),
  "trend": "increasing" | "decreasing" | "stable",
  "active_speakers": number,
  "recommendations": [
    "actionable insight 1",
    "actionable insight 2"
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            participation_health_score: { type: "number" },
            key_insights: { type: "string" },
            trend: { type: "string" },
            active_speakers: { type: "number" },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis({ ...result, top_speakers: speakers });
    } catch (e) {
      console.error("Participation analysis failed", e);
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
        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
        <p className={`text-xs ${textSub}`}>Analyzing participation trends...</p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className={`${card} rounded-2xl border ${border} p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-purple-400" />
        <h3 className="text-sm font-semibold">Speaker Participation Trends</h3>
      </div>

      {/* Health Score */}
      <div className={`rounded-lg p-4 ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
        <p className={`text-xs ${textSub} mb-2`}>Participation Equity Score</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/8" : "bg-gray-200"}`}>
              <div className="h-full bg-purple-400" style={{ width: `${analysis.participation_health_score}%` }} />
            </div>
          </div>
          <span className="text-lg font-bold text-purple-400 w-12 text-right">{analysis.participation_health_score}%</span>
        </div>
        <p className={`text-xs ${textSub} mt-2`}>{analysis.key_insights}</p>
      </div>

      {/* Top Speakers Bar Chart */}
      {analysis.top_speakers && analysis.top_speakers.length > 0 && (
        <div className={`rounded-lg p-3 ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-xs font-semibold ${textSub} mb-3`}>Top Speakers by Contribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analysis.top_speakers}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={isDark ? "#ffffff40" : "#9ca3af"} style={{ fontSize: "10px" }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke={isDark ? "#ffffff40" : "#9ca3af"} style={{ fontSize: "11px" }} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? "#1C1C1E" : "#fff", border: `1px solid ${isDark ? "#ffffff20" : "#e5e7eb"}` }} />
              <Bar dataKey="contribution" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trend Badge */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Trend</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          analysis.trend === 'increasing' 
            ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
            : analysis.trend === 'decreasing'
            ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
            : isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
        }`}>
          {analysis.trend.charAt(0).toUpperCase() + analysis.trend.slice(1)}
        </span>
      </div>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Recommendations</p>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className={`text-xs p-2 rounded ${isDark ? "bg-white/5 text-white/80" : "bg-gray-50 text-gray-700"} flex gap-2`}>
                <span className="text-purple-400">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}