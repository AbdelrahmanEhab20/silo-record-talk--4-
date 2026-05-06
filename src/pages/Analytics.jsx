import React, { useMemo, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import SentimentOutcomeAnalysis from "@/components/analytics/SentimentOutcomeAnalysis";
import ParticipationTrends from "@/components/analytics/ParticipationTrends";
import PainPointsAnalysis from "@/components/analytics/PainPointsAnalysis";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Loader2, BarChart2, Tag, CheckSquare, Clock, FileText, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

export default function Analytics() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions-all"],
    queryFn: () => appClient.entities.Session.list("-created_date", 200),
  });

  // ── Weekly session volume (last 8 weeks) ──────────────────────────────────
  const weeklyData = useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const base = subWeeks(new Date(), 7 - i);
      return {
        label: format(startOfWeek(base, { weekStartsOn: 1 }), "MMM d"),
        start: startOfWeek(base, { weekStartsOn: 1 }),
        end: endOfWeek(base, { weekStartsOn: 1 }),
        count: 0,
      };
    });
    sessions.forEach((s) => {
      const d = parseISO(s.created_date);
      const w = weeks.find((w) => isWithinInterval(d, { start: w.start, end: w.end }));
      if (w) w.count += 1;
    });
    return weeks;
  }, [sessions]);

  // ── Top topics from tags ──────────────────────────────────────────────────
  const topTopics = useMemo(() => {
    const freq = {};
    sessions.forEach((s) => {
      (s.tags || []).forEach((tag) => {
        freq[tag] = (freq[tag] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
  }, [sessions]);

  const maxTopicCount = topTopics[0]?.count || 1;

  // ── Compute plan consumption metrics ───────────────────────────────────────
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const user = await appClient.auth.me();
      if (!user) return null;
      const subs = await appClient.entities.PlanSubscription.filter({ user_email: user.email });
      return subs.length > 0 ? subs[0] : null;
    },
  });

  const consumptionMetrics = useMemo(() => {
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const totalMinutes = Math.floor(totalDuration / 60);
    const plan = subscription?.plan || 'free';
    
    return { totalSessions, totalMinutes, avgSessionDuration, plan };
  }, [sessions, subscription]);

  // ── Daily sessions breakdown ──────────────────────────────────────────────
  const dailyData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return { label: format(d, "MMM d"), date: d.toDateString(), count: 0, duration: 0 };
    });
    sessions.forEach((s) => {
      const sd = parseISO(s.created_date);
      const day = days.find((d) => d.date === sd.toDateString());
      if (day) {
        day.count += 1;
        day.duration += s.duration || 0;
      }
    });
    return days;
  }, [sessions]);

  // ── Action item completion rate ───────────────────────────────────────────
  const completionStats = useMemo(() => {
    let total = 0, completed = 0;
    sessions.forEach((s) => {
      if (!s.summary_text) return;
      let parsed;
      try { parsed = JSON.parse(s.summary_text); } catch { return; }
      const tasks = parsed?.action_items || parsed?.tasks || [];
      tasks.forEach((t) => {
        total += 1;
        if (t.completed || t.status === "completed" || t.done) completed += 1;
      });
    });
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [sessions]);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const accent = "#A855F7";
  const cyan = "#06B6D4";
  const green = "#22C55E";
  const tooltipStyle = {
    backgroundColor: isDark ? "#1C1C1E" : "#fff",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    color: isDark ? "#fff" : "#111",
    fontSize: 12,
  };

  // Get selected session details
  const selectedSession = selectedSessionId ? sessions.find((s) => s.id === selectedSessionId) : null;

  // Session-specific analytics
  const sessionAnalytics = useMemo(() => {
    if (!selectedSession) return null;
    const duration = selectedSession.duration || 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    let actionItems = 0, completedItems = 0;
    if (selectedSession.summary_text) {
      try {
        const parsed = JSON.parse(selectedSession.summary_text);
        const tasks = parsed?.action_items || parsed?.tasks || [];
        actionItems = tasks.length;
        completedItems = tasks.filter((t) => t.completed || t.status === "completed").length;
      } catch (e) {
        // Silent fail
      }
    }
    return {
      duration: `${minutes}m ${seconds}s`,
      minutes,
      seconds,
      tags: selectedSession.tags || [],
      actionItems,
      completedItems,
      hasTranscript: !!selectedSession.transcript_text,
      hasSummary: !!selectedSession.summary_text,
      createdDate: new Date(selectedSession.created_date).toLocaleDateString(),
    };
  }, [selectedSession]);

  if (isLoading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
      </div>
    );
  }

  // If session selected, show session-specific view
  if (selectedSessionId && selectedSession) {
    return (
      <div className={`min-h-screen ${bg} ${isDark ? "text-white" : "text-gray-900"}`}>
        <div className="max-w-2xl mx-auto px-5 py-10 pb-24">
          {/* Back Button */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => setSelectedSessionId(null)}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? "bg-white/5 border-white/8 hover:bg-white/10" : "bg-white border-gray-200 hover:bg-gray-50"}`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Session Analysis</h1>
              <p className={`text-xs ${textSub}`}>{sessionAnalytics?.createdDate}</p>
            </div>
          </div>

          {/* Session Title */}
          <h2 className="text-lg font-semibold mb-6 truncate">{selectedSession.title}</h2>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className={`rounded-2xl border ${card} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className={`text-xs ${textSub} mb-1`}>Duration</p>
              <p className="text-xl font-bold">{sessionAnalytics?.duration}</p>
            </div>
            <div className={`rounded-2xl border ${card} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-cyan-400" />
              </div>
              <p className={`text-xs ${textSub} mb-1`}>Topics</p>
              <p className="text-xl font-bold">{sessionAnalytics?.tags?.length || 0}</p>
            </div>
            <div className={`rounded-2xl border ${card} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-green-400" />
              </div>
              <p className={`text-xs ${textSub} mb-1`}>Tasks Done</p>
              <p className="text-xl font-bold">{sessionAnalytics?.completedItems}/{sessionAnalytics?.actionItems}</p>
            </div>
          </div>

          {/* Topics Section */}
          {sessionAnalytics?.tags?.length > 0 && (
            <div className={`rounded-2xl border ${card} p-5 mb-6`}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                Topics & Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {sessionAnalytics.tags.map((tag, i) => (
                  <span key={i} className={`text-xs px-3 py-1.5 rounded-full font-medium ${isDark ? 'bg-white/10 text-white/80' : 'bg-gray-100 text-gray-700'}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content Status */}
          <div className={`rounded-2xl border ${card} p-5 mb-6`}>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Content
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${sessionAnalytics?.hasTranscript ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <span className="text-sm">Transcript</span>
                </div>
                <span className="text-xs text-green-400">{sessionAnalytics?.hasTranscript ? '✓ Ready' : '—'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${sessionAnalytics?.hasSummary ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <span className="text-sm">Summary & AI Analysis</span>
                </div>
                <span className="text-xs text-green-400">{sessionAnalytics?.hasSummary ? '✓ Ready' : '—'}</span>
              </div>
            </div>
          </div>

          {/* View Full Session Button */}
          <button
            onClick={() => navigate(`/SessionDetail?id=${selectedSession.id}`)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium text-sm transition-transform active:scale-95"
          >
            View Full Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${isDark ? "text-white" : "text-gray-900"}`}>
      <div className="max-w-2xl mx-auto px-5 py-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/Settings')}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${isDark ? "bg-white/5 border-white/8 hover:bg-white/10" : "bg-white border-gray-200 hover:bg-gray-50"}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className={`text-xs ${textSub}`}>{sessions.length} sessions total</p>
          </div>
        </div>

         {/* Session List Section */}
        <div className={`rounded-2xl border ${card} p-5 mb-6`}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Recent Sessions
          </h2>
          {sessions.length === 0 ? (
            <p className={`text-sm ${textSub} py-4 text-center`}>No sessions yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
              {sessions.slice(0, 8).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    isDark
                      ? 'hover:bg-white/8 active:bg-white/12'
                      : 'hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className={`text-xs ${textSub} mt-1`}>
                        {Math.floor((s.duration || 0) / 60)}m · {new Date(s.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs text-purple-400 shrink-0 ml-2">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

         {/* Consumption Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className={`rounded-2xl border ${card} p-4`}>
            <p className={`text-xs ${textSub} mb-2`}>Total Sessions</p>
            <p className="text-2xl font-bold">{consumptionMetrics.totalSessions}</p>
          </div>
          <div className={`rounded-2xl border ${card} p-4`}>
            <p className={`text-xs ${textSub} mb-2`}>Minutes Used</p>
            <p className="text-2xl font-bold">{consumptionMetrics.totalMinutes}</p>
          </div>
          <div className={`rounded-2xl border ${card} p-4`}>
            <p className={`text-xs ${textSub} mb-2`}>Avg Session</p>
            <p className="text-2xl font-bold">{Math.floor(consumptionMetrics.avgSessionDuration / 60)}m {consumptionMetrics.avgSessionDuration % 60}s</p>
          </div>
          <div className={`rounded-2xl border ${card} p-4`}>
            <p className={`text-xs ${textSub} mb-2`}>Meetings</p>
            <p className="text-2xl font-bold">{consumptionMetrics.totalSessions}</p>
          </div>
        </div>

        {/* Daily Sessions Breakdown */}
        <div className={`rounded-2xl border ${card} p-5 mb-4`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4" style={{ color: cyan }} />
            <h2 className="text-sm font-semibold">Daily Activity (30 Days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dailyData} barSize={6}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 8, fill: isDark ? "rgba(255,255,255,0.2)" : "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide={true} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [v, "Sessions"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={cyan} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Session Volume */}
        <div className={`rounded-2xl border ${card} p-5 mb-4`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold">Weekly Session Volume</h2>
          </div>
          {weeklyData.every((w) => w.count === 0) ? (
            <p className={`text-sm ${textSub} py-6 text-center`}>No sessions yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData} barSize={20}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                  formatter={(v) => [v, "Sessions"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {weeklyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.count > 0 ? accent : isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Topics */}
        <div className={`rounded-2xl border ${card} p-5 mb-4`}>
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold">Most Frequent Topics</h2>
          </div>
          {topTopics.length === 0 ? (
            <p className={`text-sm ${textSub} py-6 text-center`}>No tags extracted yet — generate summaries to see topics</p>
          ) : (
            <div className="space-y-2.5">
              {topTopics.map(({ tag, count }, i) => (
                <div key={tag} className="flex items-center gap-3">
                  <span className={`text-xs w-4 text-right ${textSub}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{tag}</span>
                      <span className={`text-xs ml-2 shrink-0 ${textSub}`}>{count}×</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/8" : "bg-gray-100"}`}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / maxTopicCount) * 100}%`,
                          background: `linear-gradient(90deg, #22D3EE, #6366F1)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Analytics Section */}
        {sessions.length >= 8 && (
          <div className="mb-4">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 px-1">
              <span>🤖</span> AI-Powered Insights
            </h2>
            <div className="space-y-4">
              <SentimentOutcomeAnalysis sessions={sessions} />
              <ParticipationTrends sessions={sessions} />
              <PainPointsAnalysis sessions={sessions} />
            </div>
          </div>
        )}

        {/* Action Item Completion */}
        <div className={`rounded-2xl border ${card} p-5`}>
          <div className="flex items-center gap-2 mb-5">
            <CheckSquare className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold">Action Item Completion</h2>
          </div>
          {completionStats.total === 0 ? (
            <p className={`text-sm ${textSub} py-6 text-center`}>No action items found — generate meeting minutes to track tasks</p>
          ) : (
            <div className="flex items-center gap-6">
              {/* Ring */}
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke={isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6"} strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="38" fill="none"
                    stroke="#22C55E"
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - completionStats.rate / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{completionStats.rate}%</span>
                </div>
              </div>
              {/* Stats */}
              <div className="space-y-3">
                <div>
                  <p className={`text-xs ${textSub}`}>Completed</p>
                  <p className="text-2xl font-bold text-green-400">{completionStats.completed}</p>
                </div>
                <div>
                  <p className={`text-xs ${textSub}`}>Total tasks</p>
                  <p className="text-lg font-semibold">{completionStats.total}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}