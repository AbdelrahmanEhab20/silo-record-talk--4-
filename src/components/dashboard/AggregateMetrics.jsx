import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp, Clock, Target, Zap } from "lucide-react";

export default function AggregateMetrics({ sessions, subscription }) {
  const { isDark } = useTheme();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessions.length === 0) {
      setLoading(false);
      return;
    }
    analyzeSessions();
  }, [sessions]);

  const analyzeSessions = async () => {
    setLoading(true);
    try {
      // Aggregate basic metrics
      // Use monthly_minutes_used from subscription as authoritative total
      // (covers recordings + uploaded audio files + video URL minutes, regardless of deleted sessions)
      const totalMinutes = subscription?.monthly_minutes_used != null
        ? subscription.monthly_minutes_used
        : sessions.reduce((sum, s) => sum + Math.floor((s.duration || 0) / 60), 0);
      const avgMeetingTime = totalMinutes / sessions.length;

      // Extract all tags/topics
      const allTags = sessions.flatMap(s => s.tags || []);
      const tagFreq = {};
      allTags.forEach(tag => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
      const topTopics = Object.entries(tagFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, value: count }));

      // Extract all action items and calculate completion
      const allActionItems = sessions.flatMap(s => {
        try {
          const data = typeof s.summary_text === "string" ? JSON.parse(s.summary_text) : s.summary_text;
          return (data.action_items || []).map(a => ({ ...a, completed: a.status === "completed" }));
        } catch {
          return [];
        }
      });

      const completedCount = allActionItems.filter(a => a.completed).length;
      const completionRate = allActionItems.length > 0 ? Math.round((completedCount / allActionItems.length) * 100) : 0;

      // Generate meeting frequency chart (last 8 weeks)
      const frequencyData = generateFrequencyData(sessions);

      // Generate sentiment trend
      const sentimentData = await generateSentimentTrend(sessions);

      setMetrics({
        totalSessions: sessions.length,
        totalMinutes: Math.round(totalMinutes),
        avgMeetingTime: Math.round(avgMeetingTime),
        topTopics,
        totalActionItems: allActionItems.length,
        completedItems: completedCount,
        completionRate,
        frequencyData,
        sentimentData
      });
    } catch (e) {
      console.error("Metrics analysis failed", e);
    }
    setLoading(false);
  };

  const generateFrequencyData = (sessions) => {
    const weeks = {};
    sessions.forEach(s => {
      const date = new Date(s.created_date);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      weeks[weekKey] = (weeks[weekKey] || 0) + 1;
    });

    return Object.entries(weeks)
      .sort()
      .slice(-8)
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        meetings: count
      }));
  };

  const generateSentimentTrend = async (sessions) => {
    const sortedSessions = [...sessions]
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .slice(-12)
      .filter(s => s.summary_text || s.title);

    if (sortedSessions.length < 2) return [];

    // Build a compact list for the LLM to score
    const sessionList = sortedSessions.map((s, i) => {
      const summary = typeof s.summary_text === 'string' && s.summary_text.startsWith('{')
        ? (() => { try { return JSON.parse(s.summary_text)?.overview || s.summary_text; } catch { return s.summary_text; } })()
        : s.summary_text || '';
      return `${i}. Title: "${s.title}" | Tags: ${(s.tags || []).join(', ')} | Summary: ${summary.slice(0, 200)}`;
    }).join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a sentiment analyst. For each session below, rate the overall tone/sentiment on a scale of 0-100 where:
0-30 = negative/tense/challenging
31-55 = neutral/mixed
56-80 = positive/productive
81-100 = very positive/enthusiastic/successful

Sessions:
${sessionList}

Return ONLY a JSON object with this exact format (no markdown):
{"scores": [{"index": 0, "score": 72}, {"index": 1, "score": 45}, ...]}

One entry per session, in the same order.`,
      response_json_schema: {
        type: "object",
        properties: {
          scores: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                score: { type: "number" }
              }
            }
          }
        }
      }
    });

    const scores = result?.scores || [];
    return sortedSessions.map((s, i) => {
      const entry = scores.find(x => x.index === i);
      return entry ? {
        date: new Date(s.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sentiment: Math.round(Math.max(0, Math.min(100, entry.score))),
        title: s.title
      } : null;
    }).filter(Boolean);
  };

  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-100";
  const chartColor = isDark ? "#8884d8" : "#6366f1";
  const gridColor = isDark ? "#ffffff0a" : "#f3f4f6";

  if (loading) {
    return (
      <div className={`${card} rounded-2xl border ${border} p-8 flex items-center justify-center`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!metrics || sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Top KPIs */}
      <div className={`${card} rounded-2xl border ${border} p-4`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs ${textSub} mb-1`}>Action Items Completion</p>
            <p className="text-2xl font-bold">{metrics.completionRate}%</p>
          </div>
          <Target className="w-5 h-5 text-green-400" />
        </div>
        <p className={`text-xs ${textSub} mt-2`}>{metrics.completedItems}/{metrics.totalActionItems} done</p>
      </div>

      {/* Meeting Frequency Chart */}
      {metrics.frequencyData.length > 0 && (
        <div className={`${card} rounded-2xl border ${border} p-4`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${textSub} mb-4 flex items-center gap-1.5`}>
            <TrendingUp className="w-3.5 h-3.5" /> Meeting Frequency (Last 8 Weeks)
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.frequencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="week" stroke={isDark ? "#ffffff40" : "#9ca3af"} style={{ fontSize: "12px" }} />
              <YAxis stroke={isDark ? "#ffffff40" : "#9ca3af"} style={{ fontSize: "12px" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: isDark ? "#1C1C1E" : "#fff", border: `1px solid ${isDark ? "#ffffff20" : "#e5e7eb"}` }}
                labelStyle={{ color: isDark ? "#fff" : "#000" }}
              />
              <Bar dataKey="meetings" fill={chartColor} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sentiment Trend — only show when we have real data */}
      {metrics.sentimentData.length >= 2 && (
        <div className={`${card} rounded-2xl border ${border} p-4`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${textSub} mb-4 flex items-center gap-1.5`}>
            <Zap className="w-3.5 h-3.5" /> Meeting Sentiment Trend
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics.sentimentData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" stroke={isDark ? "#ffffff40" : "#9ca3af"} style={{ fontSize: "12px" }} />
              <YAxis stroke={isDark ? "#ffffff40" : "#9ca3af"} style={{ fontSize: "12px" }} domain={[0, 100]} tickFormatter={v => v === 0 ? 'Neg' : v === 50 ? 'Neutral' : v === 100 ? 'Pos' : v} />
              <Tooltip
                contentStyle={{ backgroundColor: isDark ? "#1C1C1E" : "#fff", border: `1px solid ${isDark ? "#ffffff20" : "#e5e7eb"}`, borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: isDark ? "#fff" : "#000" }}
                formatter={(value, name, props) => {
                  const label = value >= 56 ? '😊 Positive' : value >= 31 ? '😐 Neutral' : '😟 Negative';
                  return [`${value}/100 — ${label}`, 'Sentiment'];
                }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.title ? payload[0].payload.title.slice(0, 40) + '…' : label}
              />
              <Line
                type="monotone"
                dataKey="sentiment"
                stroke={chartColor}
                strokeWidth={2}
                dot={{ fill: chartColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Topics */}
      {metrics.topTopics.length > 0 && (
        <div className={`${card} rounded-2xl border ${border} p-4`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${textSub} mb-4`}>Most Discussed Topics</p>
          <div className="space-y-2">
            {metrics.topTopics.map((topic, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{topic.name}</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-200"}`} style={{ width: "80px" }}>
                    <div 
                      className="h-full bg-cyan-400" 
                      style={{ width: `${(topic.value / metrics.topTopics[0].value) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs w-6 text-right ${textSub}`}>{topic.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}