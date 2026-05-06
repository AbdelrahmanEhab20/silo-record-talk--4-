import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import {
  Folder, Sparkles, Loader2, ChevronRight, CheckSquare,
  BarChart2, AlertCircle, TrendingUp, Users, MessageSquare,
  Zap, ShieldAlert, Brain, Target, ArrowUpRight, ArrowDownRight, Minus,
  Check, ChevronDown, SlidersHorizontal
} from "lucide-react";
import { colorForFolder } from "@/components/FolderBadge";

// ── helpers ─────────────────────────────────────────────────────────────────

const sentimentColor = (score, isDark) => {
  if (score > 0.3) return isDark ? "text-green-400" : "text-green-600";
  if (score < -0.3) return isDark ? "text-red-400" : "text-red-600";
  return isDark ? "text-amber-400" : "text-amber-600";
};

const sentimentIcon = (score) => {
  if (score > 0.3) return <ArrowUpRight className="w-3.5 h-3.5" />;
  if (score < -0.3) return <ArrowDownRight className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
};

const tensionColor = (level, isDark) => {
  const map = {
    none: isDark ? "text-green-400 bg-green-500/10" : "text-green-600 bg-green-50",
    low: isDark ? "text-blue-400 bg-blue-500/10" : "text-blue-600 bg-blue-50",
    moderate: isDark ? "text-amber-400 bg-amber-500/10" : "text-amber-600 bg-amber-50",
    high: isDark ? "text-orange-400 bg-orange-500/10" : "text-orange-600 bg-orange-50",
    very_high: isDark ? "text-red-400 bg-red-500/10" : "text-red-600 bg-red-50",
  };
  return map[level] || map.none;
};

const intensityColor = (intensity, isDark) => {
  if (intensity === "severe") return isDark ? "border-red-500/30 bg-red-500/8" : "border-red-200 bg-red-50";
  if (intensity === "moderate") return isDark ? "border-amber-500/30 bg-amber-500/8" : "border-amber-200 bg-amber-50";
  return isDark ? "border-blue-500/30 bg-blue-500/8" : "border-blue-200 bg-blue-50";
};

const priorityColor = (p, isDark) => {
  if (p === "high") return isDark ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-red-600 bg-red-50 border-red-200";
  if (p === "medium") return isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-amber-600 bg-amber-50 border-amber-200";
  return isDark ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-green-600 bg-green-50 border-green-200";
};

const outcomeColor = (outcome, isDark) => {
  if (outcome === "positive") return isDark ? "text-green-400 bg-green-500/10" : "text-green-700 bg-green-50";
  if (outcome === "negative") return isDark ? "text-red-400 bg-red-500/10" : "text-red-700 bg-red-50";
  return isDark ? "text-gray-400 bg-white/5" : "text-gray-600 bg-gray-50";
};

// Section wrapper
function Section({ icon, title, badge, children, isDark }) {
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  return (
    <div className={`rounded-2xl border ${card} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-sm font-bold">{title}</h2>
        {badge != null && (
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-white/8 text-white/40" : "bg-gray-100 text-gray-400"}`}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Insights() {
  const { isDark } = useTheme();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [folders, setFolders] = useState([]);
  // cachedReports: { [folderName]: { id, report_data, generated_at } }
  const [cachedReports, setCachedReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  // viewingFolder: folder whose report is currently displayed
  const [viewingFolder, setViewingFolder] = useState(null);
  const [error, setError] = useState(null);
  // selectedSessions: { [folderName]: Set of session IDs } — null/undefined means "all"
  const [selectedSessions, setSelectedSessions] = useState({});
  // expandedSelector: folder name whose session picker is open
  const [expandedSelector, setExpandedSelector] = useState(null);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/40" : "text-gray-400";

  useEffect(() => {
    const init = async () => {
      const me = await base44.auth.me();
      setUser(me);
      const [allSessions, allReports] = await Promise.all([
        base44.entities.Session.filter({ user_email: me.email }, "-created_date"),
        base44.entities.FolderReport.filter({ user_email: me.email }, "-created_date"),
      ]);
      const nonSub = allSessions.filter(s => !s.is_subsession);
      setSessions(nonSub);
      const uniqueFolders = [...new Set(nonSub.filter(s => s.folder).map(s => s.folder))].sort();
      setFolders(uniqueFolders);
      // Build a map of folder → latest cached report
      const reportMap = {};
      for (const r of allReports) {
        if (!reportMap[r.folder_name] || r.created_date > reportMap[r.folder_name].created_date) {
          reportMap[r.folder_name] = r;
        }
      }
      setCachedReports(reportMap);
      setLoading(false);
    };
    init();
  }, []);

  const getEffectiveSessions = (folderName) => {
    const folderSessions = sessions.filter(s => s.folder === folderName);
    const sel = selectedSessions[folderName];
    if (!sel || sel.size === 0) return folderSessions;
    return folderSessions.filter(s => sel.has(s.id));
  };

  const toggleSessionSelect = (folderName, sessionId) => {
    setSelectedSessions(prev => {
      const folderSessions = sessions.filter(s => s.folder === folderName);
      const current = prev[folderName] ? new Set(prev[folderName]) : new Set(folderSessions.map(s => s.id));
      if (current.has(sessionId)) {
        current.delete(sessionId);
      } else {
        current.add(sessionId);
      }
      return { ...prev, [folderName]: current };
    });
  };

  const generateInsights = async (folderName) => {
    const effectiveSessions = getEffectiveSessions(folderName);
    if (!folderName || effectiveSessions.length === 0) return;
    setGenerating(folderName);
    setError(null);
    try {
      const res = await base44.functions.invoke("generateInsights", {
        folder_name: folderName,
        session_ids: effectiveSessions.map(s => s.id),
      });
      if (res.data?.error) throw new Error(res.data.error);
      const data = res.data;
      const now = new Date().toISOString();
      const existing = cachedReports[folderName];
      let saved;
      if (existing?.id) {
        saved = await base44.entities.FolderReport.update(existing.id, {
          report_data: data,
          session_count: effectiveSessions.length,
          session_ids: effectiveSessions.map(s => s.id),
          generated_at: now,
          title: `${folderName} Insights`,
        });
        saved = { ...existing, report_data: data, generated_at: now };
      } else {
        saved = await base44.entities.FolderReport.create({
          user_email: user.email,
          folder_name: folderName,
          report_data: data,
          session_count: effectiveSessions.length,
          session_ids: effectiveSessions.map(s => s.id),
          generated_at: now,
          title: `${folderName} Insights`,
        });
      }
      setCachedReports(prev => ({ ...prev, [folderName]: saved }));
      setViewingFolder(folderName);
    } catch (e) {
      setError(e.message || "Failed to generate insights");
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <Loader2 className={`w-6 h-6 animate-spin ${sub}`} />
      </div>
    );
  }

  const viewingReport = viewingFolder ? cachedReports[viewingFolder] : null;
  const master = viewingReport?.report_data?.master;
  const behavior = viewingReport?.report_data?.behavior;

  return (
    <div className={`min-h-screen ${bg} ${text} pb-32`}>
      <div className="max-w-2xl mx-auto px-5 pt-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="text-2xl font-bold">Insights</h1>
          </div>
          <p className={`text-sm ${sub}`}>Generate a master intelligence report from all sessions in a folder.</p>
        </div>

        {folders.length === 0 ? (
          <div className={`rounded-2xl border ${card} p-8 text-center`}>
            <Folder className={`w-10 h-10 mx-auto mb-3 ${sub}`} />
            <p className={`text-sm font-medium ${text}`}>No folders yet</p>
            <p className={`text-xs mt-1 ${sub}`}>Assign sessions to folders to start generating insights.</p>
          </div>
        ) : (
          <>
            {/* Folder list */}
            <div className="mb-5">
              <p className={`text-xs font-semibold uppercase tracking-wider ${sub} mb-3`}>Select Folder</p>
              <div className="space-y-2">
                {folders.map(name => {
                  const color = colorForFolder(name);
                  const count = sessions.filter(s => s.folder === name).length;
                  const cached = cachedReports[name];
                  const isGenerating = generating === name;
                  const folderSessions = sessions.filter(s => s.folder === name);
                  const sel = selectedSessions[name];
                  // If sel is defined, use it; otherwise all are "selected"
                  const selectedSet = sel || new Set(folderSessions.map(s => s.id));
                  const selectedCount = selectedSet.size;
                  const isAllSelected = selectedCount === folderSessions.length;
                  const isSelectorOpen = expandedSelector === name;
                  const effectiveCount = getEffectiveSessions(name).length;

                  return (
                    <div key={name} className={`rounded-2xl border ${card} overflow-hidden`}>
                      {/* Folder row */}
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                          <Folder className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${text}`}>{name}</p>
                          <p className={`text-xs ${sub}`}>
                            {isAllSelected ? `${count} session${count !== 1 ? "s" : ""}` : `${effectiveCount} of ${count} selected`}
                          </p>
                        </div>
                        {/* Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Session selector toggle */}
                          <button
                            onClick={() => setExpandedSelector(isSelectorOpen ? null : name)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors ${
                              isSelectorOpen || !isAllSelected
                                ? isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"
                                : isDark ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                            title="Select sessions"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            {!isAllSelected && <span>{effectiveCount}</span>}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isSelectorOpen ? "rotate-180" : ""}`} />
                          </button>

                          {cached ? (
                            <>
                              <button
                                onClick={() => setViewingFolder(viewingFolder === name ? null : name)}
                                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                                  viewingFolder === name
                                    ? isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"
                                    : isDark ? "bg-white/8 text-white/70 hover:bg-white/15" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {viewingFolder === name ? "Hide" : "View"}
                              </button>
                              <button
                                onClick={() => generateInsights(name)}
                                disabled={!!generating}
                                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors disabled:opacity-50 ${isDark ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                              >
                                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↺"}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => generateInsights(name)}
                              disabled={!!generating || effectiveCount === 0}
                              className="text-xs px-3 py-1.5 rounded-xl font-semibold text-white disabled:opacity-50 transition-all"
                              style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
                            >
                              {isGenerating ? (
                                <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing…</span>
                              ) : (
                                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Generate</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Session selector panel */}
                      {isSelectorOpen && (
                        <div className={`px-4 pb-3 border-t ${isDark ? "border-white/6" : "border-gray-100"}`}>
                          <div className="flex items-center justify-between py-2 mb-1">
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub}`}>Select sessions to include</p>
                            <button
                              onClick={() => {
                                if (isAllSelected) {
                                  // deselect all
                                  setSelectedSessions(prev => ({ ...prev, [name]: new Set() }));
                                } else {
                                  // select all
                                  setSelectedSessions(prev => ({ ...prev, [name]: new Set(folderSessions.map(s => s.id)) }));
                                }
                              }}
                              className={`text-[10px] font-medium ${isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"}`}
                            >
                              {isAllSelected ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {folderSessions.map(s => {
                              const isChecked = selectedSet.has(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => toggleSessionSelect(name, s.id)}
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
                                    isChecked
                                      ? isDark ? "bg-purple-500/15" : "bg-purple-50"
                                      : isDark ? "bg-white/3 hover:bg-white/6" : "bg-gray-50 hover:bg-gray-100"
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    isChecked
                                      ? "bg-purple-500 border-purple-500"
                                      : isDark ? "border-white/20" : "border-gray-300"
                                  }`}>
                                    {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${isChecked ? (isDark ? "text-purple-200" : "text-purple-800") : text}`}>{s.title}</p>
                                    <p className={`text-[10px] ${sub}`}>{new Date(s.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{s.duration ? ` · ${Math.round(s.duration / 60)}m` : ""}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Cached date */}
                      {cached && (
                        <div className={`px-4 pb-2 text-[10px] ${sub}`}>
                          Last generated: {new Date(cached.generated_at || cached.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* ── Results ── */}
            {viewingFolder && master && (
              <div className="space-y-5 mt-2">

                {/* Executive Summary */}
                <Section icon={<BarChart2 className="w-4 h-4 text-purple-400" />} title="Executive Summary" isDark={isDark}>
                  <p className={`text-sm leading-relaxed mb-4 ${isDark ? "text-white/80" : "text-gray-700"}`}>{master.executive_summary}</p>
                  {master.key_topics?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {master.key_topics.map((t, i) => (
                        <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${isDark ? "bg-purple-500/10 text-purple-300 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200"}`}>{t}</span>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Per-Session Summaries */}
                {master.per_session_summaries?.length > 0 && (
                  <Section icon={<MessageSquare className="w-4 h-4 text-blue-400" />} title="Session Summaries" badge={master.per_session_summaries.length} isDark={isDark}>
                    <div className="space-y-3">
                      {master.per_session_summaries.map((s, i) => (
                        <div key={i} className={`p-3.5 rounded-xl border ${isDark ? "bg-white/4 border-white/6" : "bg-gray-50 border-gray-100"}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"}`}>{s.session_index}</span>
                            <p className={`text-xs font-semibold truncate flex-1 ${text}`}>{s.title}</p>
                            {s.outcome && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${outcomeColor(s.outcome, isDark)}`}>{s.outcome}</span>
                            )}
                          </div>
                          <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-gray-600"}`}>{s.summary}</p>
                          {s.key_decisions?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {s.key_decisions.map((d, j) => (
                                <p key={j} className={`text-[11px] flex items-start gap-1.5 ${isDark ? "text-white/50" : "text-gray-500"}`}>
                                  <span className="text-purple-400 shrink-0">→</span>{d}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Key Decisions */}
                {master.decisions_made?.length > 0 && (
                  <Section icon={<Target className="w-4 h-4 text-green-400" />} title="Key Decisions Made" badge={master.decisions_made.length} isDark={isDark}>
                    <ul className="space-y-2">
                      {master.decisions_made.map((d, i) => (
                        <li key={i} className={`flex items-start gap-2.5 text-sm ${isDark ? "text-white/70" : "text-gray-700"}`}>
                          <span className={`mt-0.5 shrink-0 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"}`}>{i + 1}</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {/* Action Items */}
                {master.action_items?.length > 0 && (
                  <Section icon={<CheckSquare className="w-4 h-4 text-blue-400" />} title="Action Items" badge={master.action_items.length} isDark={isDark}>
                    <div className="space-y-2.5">
                      {master.action_items.map((item, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? "bg-white/4" : "bg-gray-50"}`}>
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.priority === "high" ? "bg-red-400" : item.priority === "medium" ? "bg-amber-400" : "bg-green-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${text}`}>{item.task}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {item.owner && item.owner !== "Unassigned" && <span className={`text-xs ${sub}`}>👤 {item.owner}</span>}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityColor(item.priority, isDark)}`}>{item.priority}</span>
                              {item.session_ref && <span className={`text-[10px] ${sub} truncate`}>from: {item.session_ref}</span>}
                              {item.due_date && <span className={`text-[10px] ${sub}`}>⏰ {item.due_date}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Sentiment & Emotion Analysis */}
                {behavior && (
                  <Section icon={<Brain className="w-4 h-4 text-pink-400" />} title="Sentiment & Emotion Analysis" isDark={isDark}>
                    {/* Overall */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`flex-1 p-3 rounded-xl ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                        <p className={`text-[11px] font-medium mb-1 ${sub}`}>Overall Sentiment</p>
                        <div className={`flex items-center gap-1 font-semibold text-sm ${sentimentColor(behavior.sentiment_score || 0, isDark)}`}>
                          {sentimentIcon(behavior.sentiment_score || 0)}
                          {behavior.overall_sentiment || "—"}
                        </div>
                      </div>
                      <div className={`flex-1 p-3 rounded-xl ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                        <p className={`text-[11px] font-medium mb-1 ${sub}`}>Score</p>
                        <p className={`font-bold text-sm ${sentimentColor(behavior.sentiment_score || 0, isDark)}`}>
                          {behavior.sentiment_score != null ? (behavior.sentiment_score > 0 ? "+" : "") + behavior.sentiment_score.toFixed(2) : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Per-session sentiment trend */}
                    {behavior.sentiment_trend?.length > 0 && (
                      <div className="space-y-2">
                        <p className={`text-[11px] font-semibold uppercase tracking-wide ${sub} mb-2`}>Per Session</p>
                        {behavior.sentiment_trend.map((s, i) => {
                          const pct = Math.round(((s.score + 1) / 2) * 100);
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold w-5 shrink-0 ${sub}`}>S{s.session_index}</span>
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
                                  <div className="h-full rounded-full transition-all" style={{
                                    width: `${pct}%`,
                                    background: s.score > 0.3 ? "#22c55e" : s.score < -0.3 ? "#ef4444" : "#f59e0b"
                                  }} />
                                </div>
                                <span className={`text-[10px] shrink-0 ${sentimentColor(s.score, isDark)}`}>{s.dominant_emotion}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Section>
                )}

                {/* Speaker Engagement */}
                {behavior?.speaker_engagement?.length > 0 && (
                  <Section icon={<Users className="w-4 h-4 text-indigo-400" />} title="Speaker Engagement" badge={behavior.speaker_engagement.length} isDark={isDark}>
                    <div className="space-y-3">
                      {behavior.speaker_engagement.map((sp, i) => (
                        <div key={i} className={`p-3.5 rounded-xl ${isDark ? "bg-white/4" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? "bg-indigo-500/20 text-indigo-300" : "bg-indigo-100 text-indigo-700"}`}>
                              {sp.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className={`text-sm font-semibold flex-1 ${text}`}>{sp.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              sp.engagement_level === "high"
                                ? isDark ? "bg-green-500/15 text-green-400" : "bg-green-100 text-green-700"
                                : sp.engagement_level === "low"
                                  ? isDark ? "bg-red-500/15 text-red-400" : "bg-red-100 text-red-700"
                                  : isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-700"
                            }`}>{sp.engagement_level}</span>
                          </div>
                          {/* Talk time bar */}
                          <div className="mb-2">
                            <div className="flex justify-between mb-1">
                              <span className={`text-[10px] ${sub}`}>Talk time</span>
                              <span className={`text-[10px] font-medium ${text}`}>{sp.talk_time_pct?.toFixed(0)}%</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
                              <div className="h-full rounded-full bg-indigo-400" style={{ width: `${Math.min(sp.talk_time_pct || 0, 100)}%` }} />
                            </div>
                          </div>
                          {sp.contributions?.length > 0 && (
                            <div className="space-y-1">
                              {sp.contributions.slice(0, 2).map((c, j) => (
                                <p key={j} className={`text-[11px] flex items-start gap-1.5 ${isDark ? "text-white/50" : "text-gray-500"}`}>
                                  <span className="text-indigo-400 shrink-0">•</span>{c}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Top Words */}
                {behavior?.top_words?.length > 0 && (
                  <Section icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} title="Word Analysis" isDark={isDark}>
                    <div className="flex flex-wrap gap-2">
                      {behavior.top_words.slice(0, 20).map((w, i) => {
                        const size = w.significance === "high" ? "text-sm font-bold" : w.significance === "medium" ? "text-xs font-semibold" : "text-[11px]";
                        const bg2 = w.significance === "high"
                          ? isDark ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/25" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                          : isDark ? "bg-white/5 text-white/50 border-white/10" : "bg-gray-100 text-gray-500 border-gray-200";
                        return (
                          <span key={i} className={`${size} px-2.5 py-1 rounded-full border ${bg2}`}>
                            {w.word}
                            {w.frequency > 1 && <span className={`ml-1 text-[10px] opacity-60`}>×{w.frequency}</span>}
                          </span>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Argument & Tension Analysis */}
                {behavior?.argument_analysis && (
                  <Section icon={<ShieldAlert className="w-4 h-4 text-orange-400" />} title="Argument & Tension Analysis" isDark={isDark}>
                    {/* Tension gauge */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1.5">
                          <span className={`text-[11px] ${sub}`}>Tension Level</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tensionColor(behavior.argument_analysis.overall_tension_level, isDark)}`}>
                            {behavior.argument_analysis.overall_tension_level?.replace("_", " ")}
                          </span>
                        </div>
                        <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${behavior.argument_analysis.tension_score || 0}%`,
                            background: `linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)`
                          }} />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className={`text-[9px] ${sub}`}>Calm</span>
                          <span className={`text-[9px] ${sub}`}>Intense</span>
                        </div>
                      </div>
                      <div className={`text-center p-3 rounded-xl ${isDark ? "bg-white/5" : "bg-gray-50"} min-w-[72px]`}>
                        <p className={`text-xl font-bold ${tensionColor(behavior.argument_analysis.overall_tension_level, isDark)}`}>
                          {behavior.argument_analysis.tension_score ?? "—"}
                        </p>
                        <p className={`text-[9px] ${sub}`}>/ 100</p>
                      </div>
                    </div>

                    {/* Communication health */}
                    {behavior.argument_analysis.communication_health && (
                      <div className={`mb-4 px-3 py-2 rounded-xl text-xs font-medium text-center ${
                        behavior.argument_analysis.communication_health === "healthy" || behavior.argument_analysis.communication_health === "collaborative"
                          ? isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-700"
                          : behavior.argument_analysis.communication_health === "toxic"
                            ? isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700"
                            : isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700"
                      }`}>
                        Communication: <strong className="capitalize">{behavior.argument_analysis.communication_health}</strong>
                      </div>
                    )}

                    {/* Conflict topics */}
                    {behavior.argument_analysis.conflict_topics?.length > 0 && (
                      <div className="mb-4">
                        <p className={`text-[11px] font-semibold uppercase tracking-wide ${sub} mb-2`}>Tension Topics</p>
                        <div className="flex flex-wrap gap-2">
                          {behavior.argument_analysis.conflict_topics.map((t, i) => (
                            <span key={i} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${isDark ? "bg-orange-500/10 text-orange-300 border-orange-500/20" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                              ⚡ {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Escalation moments */}
                    {behavior.argument_analysis.escalation_moments?.length > 0 && (
                      <div>
                        <p className={`text-[11px] font-semibold uppercase tracking-wide ${sub} mb-2`}>Escalation Moments</p>
                        <div className="space-y-2">
                          {behavior.argument_analysis.escalation_moments.map((e, i) => (
                            <div key={i} className={`p-3 rounded-xl border text-xs ${intensityColor(e.intensity, isDark)}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-3 h-3 text-orange-400 shrink-0" />
                                <span className={`font-semibold ${text}`}>{e.session_ref}</span>
                                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  e.intensity === "severe"
                                    ? isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
                                    : e.intensity === "moderate"
                                      ? isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"
                                      : isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
                                }`}>{e.intensity}</span>
                              </div>
                              <p className={`${isDark ? "text-white/60" : "text-gray-600"} mb-1`}>{e.description}</p>
                              <span className={`text-[10px] ${
                                e.resolution === "resolved"
                                  ? isDark ? "text-green-400" : "text-green-600"
                                  : e.resolution === "unresolved"
                                    ? isDark ? "text-red-400" : "text-red-600"
                                    : isDark ? "text-amber-400" : "text-amber-600"
                              }`}>
                                {e.resolution === "resolved" ? "✓ Resolved" : e.resolution === "unresolved" ? "✗ Unresolved" : "⚠ Partially resolved"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Section>
                )}

                {/* Risks */}
                {master.risks?.length > 0 && (
                  <Section icon={<AlertCircle className="w-4 h-4 text-red-400" />} title="Risks & Blockers" isDark={isDark}>
                    <ul className="space-y-2">
                      {master.risks.map((risk, i) => (
                        <li key={i} className={`flex items-start gap-2.5 text-sm ${isDark ? "text-white/70" : "text-gray-700"}`}>
                          <span className="text-red-400 mt-0.5 shrink-0">•</span>{risk}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {/* Next Steps */}
                {master.next_steps?.length > 0 && (
                  <Section icon={<ArrowUpRight className="w-4 h-4 text-green-400" />} title="Recommended Next Steps" isDark={isDark}>
                    <ol className="space-y-2">
                      {master.next_steps.map((step, i) => (
                        <li key={i} className={`flex items-start gap-3 text-sm ${isDark ? "text-white/70" : "text-gray-700"}`}>
                          <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDark ? "bg-green-500/15 text-green-400" : "bg-green-100 text-green-700"}`}>{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </Section>
                )}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}