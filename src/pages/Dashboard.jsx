import React, { useMemo, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { useNavigate, Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, isBefore, addDays, parseISO, isValid, subWeeks, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ArrowLeft, Clock, AlertTriangle, CheckSquare, Calendar, ChevronRight, Loader2, LayoutGrid, List, ChevronDown, Folder } from "lucide-react";
import { createPageUrl } from "@/utils";
import KanbanBoard from "@/components/KanbanBoard";
import AggregateMetrics from "@/components/dashboard/AggregateMetrics";
import AudioSourcesChart from "@/components/dashboard/AudioSourcesChart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart2, Tag } from "lucide-react";

function parseDeadline(str) {
  if (!str || str === "TBD" || str.toLowerCase() === "tbd") return null;
  const d = parseISO(str);
  if (isValid(d)) return d;
  const d2 = new Date(str);
  if (isValid(d2)) return d2;
  return null;
}

function extractActionItems(session) {
  if (!session.summary_text) return [];
  try {
    const data = typeof session.summary_text === "string" ? JSON.parse(session.summary_text) : session.summary_text;
    return (data.action_items || []).map(a => ({
      ...a,
      sessionId: session.id || session._id,
      sessionTitle: session.title,
      sessionDate: session.created_date,
      deadlineDate: parseDeadline(a.deadline),
    }));
  } catch {
    return [];
  }
}

export default function Dashboard() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null); // null | "kanban" | "list"

  React.useEffect(() => {
    appClient.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const subs = await appClient.entities.PlanSubscription.filter({ user_email: u.email });
        if (subs.length > 0) setSubscription(subs[0]);
      }
    }).catch(() => {});
  }, []);

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ["sessions-dashboard", user?.email],
    queryFn: async () => {
      if (!user) return [];
      // Fetch all sessions, then filter out sub-sessions so counts are consistent app-wide
      const all = await appClient.entities.Session.filter({ user_email: user.email }, "-created_date");
      return all.filter(s => !s.is_subsession);
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Real-time sync with session changes
  React.useEffect(() => {
    if (!user) return;
    const unsub = appClient.entities.Session.subscribe(() => {
      refetch();
    });
    return unsub;
  }, [user, refetch]);

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
      if (!s.created_date) return;
      const d = parseISO(s.created_date);
      if (!isValid(d)) return;
      const w = weeks.find((w) => isWithinInterval(d, { start: w.start, end: w.end }));
      if (w) w.count += 1;
    });
    return weeks;
  }, [sessions]);

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

  const folderInsights = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (s.folder) {
        if (!map[s.folder]) {
          map[s.folder] = { name: s.folder, count: 0, totalMinutes: 0 };
        }
        map[s.folder].count += 1;
        map[s.folder].totalMinutes += Math.floor((s.duration || 0) / 60);
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [sessions]);

  const dailyData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      d.setHours(0, 0, 0, 0);
      return { label: format(d, "MMM d"), dateStr: d.toISOString().split('T')[0], count: 0 };
    });
    sessions.forEach((s) => {
      if (!s.created_date) return;
      const sd = parseISO(s.created_date);
      if (!isValid(sd)) return;
      const dateStr = sd.toISOString().split('T')[0];
      const day = days.find((d) => d.dateStr === dateStr);
      if (day) day.count += 1;
    });
    return days;
  }, [sessions]);

  const { allActions, overdue, upcoming, recentSessions } = useMemo(() => {
    const now = new Date();
    const soonThreshold = addDays(now, 7);
    const allActions = sessions.flatMap(extractActionItems);

    const overdue = allActions.filter(a => a.deadlineDate && isBefore(a.deadlineDate, now));
    const upcoming = allActions.filter(a => a.deadlineDate && isAfter(a.deadlineDate, now) && isBefore(a.deadlineDate, soonThreshold));
    const recentSessions = sessions.slice(0, 8);
    return { allActions, overdue, upcoming, recentSessions };
  }, [sessions]);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const border = isDark ? "border-white/8" : "border-gray-100";

  const priorityColor = (p) => {
    if (!p) return isDark ? "text-white/40" : "text-gray-400";
    if (p === "High") return "text-red-400";
    if (p === "Medium") return "text-amber-400";
    return "text-emerald-400";
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${textMain}`}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(createPageUrl("Home"))}
            className={`flex items-center gap-2 text-sm transition-colors ${isDark ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold">Dashboard</h1>

        </div>

        {/* Kanban Section - Collapsible */}
        {expandedSection === "kanban" && (
          <section className="mb-8">
            <button
              onClick={() => setExpandedSection(null)}
              className={`w-full text-left flex items-center gap-2 px-4 py-3 rounded-2xl border ${border} ${card} hover:opacity-80 transition-opacity mb-3`}
            >
              <ChevronDown className="w-4 h-4" />
              <LayoutGrid className="w-3.5 h-3.5" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">Action Items Board</h2>
            </button>
            {allActions.length === 0 ? (
              <div className={`${card} rounded-2xl border ${border} py-10 text-center`}>
                <p className={`text-sm ${textSub}`}>No action items extracted yet</p>
              </div>
            ) : (
              <KanbanBoard allActions={allActions} />
            )}
          </section>
        )}

        {/* List Section - Collapsible */}
        {expandedSection === "list" && (
          <>
            <button
              onClick={() => setExpandedSection(null)}
              className={`w-full text-left flex items-center gap-2 px-4 py-3 rounded-2xl border ${border} ${card} hover:opacity-80 transition-opacity mb-6`}
            >
              <ChevronDown className="w-4 h-4" />
              <List className="w-3.5 h-3.5" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">Action Items List</h2>
            </button>
            {overdue.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                </h2>
                <div className={`${card} rounded-2xl border ${border} divide-y ${isDark ? "divide-white/5" : "divide-gray-50"}`}>
                  {overdue.map((a, i) => (
                    <Link key={i} to={`/SessionDetail?id=${a.sessionId}`} className={`flex items-start gap-3 px-4 py-3 ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                      <CheckSquare className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.task}</p>
                        <p className={`text-xs ${textSub} truncate`}>{a.sessionTitle} · {a.owner || "Unassigned"}</p>
                      </div>
                      <span className="text-xs text-red-400 shrink-0">{a.deadlineDate ? format(a.deadlineDate, "MMM d") : ""}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {upcoming.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Due This Week
                </h2>
                <div className={`${card} rounded-2xl border ${border} divide-y ${isDark ? "divide-white/5" : "divide-gray-50"}`}>
                  {upcoming.map((a, i) => (
                    <Link key={i} to={`/SessionDetail?id=${a.sessionId}`} className={`flex items-start gap-3 px-4 py-3 ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                      <CheckSquare className={`w-4 h-4 mt-0.5 shrink-0 ${priorityColor(a.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.task}</p>
                        <p className={`text-xs ${textSub} truncate`}>{a.sessionTitle} · {a.owner || "Unassigned"}</p>
                      </div>
                      <span className="text-xs text-amber-400 shrink-0">{a.deadlineDate ? format(a.deadlineDate, "MMM d") : ""}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {allActions.filter(a => !a.deadlineDate).length > 0 && (
              <section className="mb-6">
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${textSub} mb-3 flex items-center gap-1.5`}>
                  <CheckSquare className="w-3.5 h-3.5" /> Pending (No Deadline)
                </h2>
                <div className={`${card} rounded-2xl border ${border} divide-y ${isDark ? "divide-white/5" : "divide-gray-50"}`}>
                  {allActions.filter(a => !a.deadlineDate).slice(0, 10).map((a, i) => (
                    <Link key={i} to={`/SessionDetail?id=${a.sessionId}`} className={`flex items-start gap-3 px-4 py-3 ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                      <CheckSquare className={`w-4 h-4 mt-0.5 shrink-0 ${priorityColor(a.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.task}</p>
                        <p className={`text-xs ${textSub} truncate`}>{a.sessionTitle} · {a.owner || "Unassigned"}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${textSub} shrink-0`} />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Collapsed State - Show Toggle Buttons */}
        {expandedSection === null && (
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setExpandedSection("kanban")}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${border} ${card} hover:opacity-80 transition-opacity flex-1`}
            >
              <ChevronRight className="w-4 h-4" />
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase">Kanban</span>
            </button>
            <button
              onClick={() => setExpandedSection("list")}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${border} ${card} hover:opacity-80 transition-opacity flex-1`}
            >
              <ChevronRight className="w-4 h-4" />
              <List className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase">List</span>
            </button>
          </div>
        )}

        {/* Stats Row */}
         {(() => {
           // Use monthly_minutes_used from subscription as the authoritative consumed minutes
           // (covers recordings + uploaded audio + video URL minutes)
           const totalMinutes = subscription?.monthly_minutes_used ?? sessions.reduce((sum, s) => sum + Math.floor((s.duration || 0) / 60), 0);
           const hours = Math.floor(totalMinutes / 60);
           const mins = totalMinutes % 60;
           const durationLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
           return (
             <div className="grid grid-cols-2 gap-3 mb-6">
               {[
                 { key: "total", label: "Total Sessions", value: sessions.length, icon: Calendar, color: "text-blue-400" },
                 { key: "overdue", label: "Overdue", value: overdue.length, icon: AlertTriangle, color: "text-red-400" },
               ].map(({ key, label, value, icon: Icon, color }) => (
                 <button
                   key={key}
                   onClick={() => {
                     setExpandedSection(key === "total" ? null : key);
                   }}
                   className={`${card} rounded-2xl p-4 flex flex-col gap-2 border ${border} cursor-pointer hover:opacity-80 transition-opacity`}
                 >
                   <Icon className={`w-4 h-4 ${color}`} />
                   <div className="text-2xl font-bold">{value}</div>
                   <div className={`text-xs ${textSub}`}>{label}</div>
                 </button>
               ))}
             </div>
           );
         })()}

        {/* Aggregate Metrics */}
        <AggregateMetrics sessions={sessions} subscription={subscription} />

        {/* Charts Section */}
        <section className="mb-8">
          <div className="space-y-4">
            {/* Daily Sessions Breakdown */}
             <div className={`${card} rounded-2xl border ${border} p-5`}>
               <div className="flex items-center gap-2 mb-4">
                 <BarChart2 className="w-4 h-4 text-cyan-400" />
                 <h2 className="text-sm font-semibold">Daily Activity (30 Days)</h2>
               </div>
               <ResponsiveContainer width="100%" height={140}>
                 <LineChart data={dailyData}>
                   <XAxis
                     dataKey="label"
                     tick={{ fontSize: 8, fill: isDark ? "rgba(255,255,255,0.2)" : "#9ca3af" }}
                     axisLine={false}
                     tickLine={false}
                   />
                   <YAxis hide={true} />
                   <Tooltip
                     contentStyle={{
                       backgroundColor: isDark ? "#1C1C1E" : "#fff",
                       border: "1px solid rgba(255,255,255,0.08)",
                       borderRadius: 12,
                       color: isDark ? "#fff" : "#111",
                       fontSize: 12,
                     }}
                     formatter={(v) => [v, "Sessions"]}
                   />
                   <Line type="monotone" dataKey="count" stroke="#06B6D4" strokeWidth={2} dot={false} isAnimationActive={false} />
                 </LineChart>
               </ResponsiveContainer>
             </div>

            {/* Weekly Session Volume */}
            <div className={`${card} rounded-2xl border ${border} p-5`}>
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
                      contentStyle={{
                        backgroundColor: isDark ? "#1C1C1E" : "#fff",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        color: isDark ? "#fff" : "#111",
                        fontSize: 12,
                      }}
                      cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                      formatter={(v) => [v, "Sessions"]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {weeklyData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.count > 0 ? "#A855F7" : isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Topics */}
             <div className={`${card} rounded-2xl border ${border} p-5`}>
               <div className="flex items-center gap-2 mb-4">
                 <Tag className="w-4 h-4 text-cyan-400" />
                 <h2 className="text-sm font-semibold">Most Discussed Topics</h2>
               </div>
               {topTopics.length === 0 ? (
                 <p className={`text-sm ${textSub} py-6 text-center`}>No tags extracted yet</p>
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

             {/* Audio Sources */}
             <AudioSourcesChart sessions={sessions} />

             {/* Folder Insights */}
             {folderInsights.length > 0 && (
               <div className={`${card} rounded-2xl border ${border} p-5`}>
                 <div className="flex items-center gap-2 mb-4">
                   <Folder className="w-4 h-4 text-amber-400" />
                   <h2 className="text-sm font-semibold">Folder Insights</h2>
                 </div>
                 <div className="space-y-3">
                   {folderInsights.map(({ name, count, totalMinutes }) => {
                     const FOLDER_COLORS = [
                       "#a855f7", "#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#ef4444", "#f97316", "#ec4899",
                     ];
                     let hash = 0;
                     for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                     const color = FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
                     const hours = Math.floor(totalMinutes / 60);
                     const mins = totalMinutes % 60;
                     const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                     return (
                       <div key={name} className={`flex items-center justify-between px-3 py-3 rounded-lg ${isDark ? "bg-white/6" : "bg-gray-50"}`}>
                         <div className="flex items-center gap-3 flex-1 min-w-0">
                           <Folder className="w-4 h-4 shrink-0" style={{ color }} />
                           <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium truncate">{name}</p>
                             <p className={`text-xs ${textSub}`}>{count} session{count > 1 ? 's' : ''}</p>
                           </div>
                         </div>
                         <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${isDark ? "bg-white/8 text-white/60" : "bg-white text-gray-600"}`}>
                           {timeLabel}
                         </span>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
            </div>
            </section>



        {/* Recent Sessions */}
        <section>
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${textSub} mb-3 flex items-center gap-1.5`}>
            <Calendar className="w-3.5 h-3.5" /> Recent Sessions
          </h2>
          <div className={`${card} rounded-2xl border ${border} divide-y ${isDark ? "divide-white/5" : "divide-gray-50"}`}>
            {recentSessions.length === 0 && (
              <p className={`px-4 py-6 text-sm text-center ${textSub}`}>No sessions yet</p>
            )}
            {recentSessions.map(s => {
              const actionCount = extractActionItems(s).length;
              return (
                <Link key={s.id} to={`/SessionDetail?id=${s.id}`} className={`flex items-center gap-3 px-4 py-3 ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className={`text-xs ${textSub}`}>{s.created_date ? format(new Date(s.created_date), "MMM d, yyyy") : ""}</p>
                  </div>
                  {actionCount > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-white/60" : "bg-gray-100 text-gray-500"}`}>
                      {actionCount} actions
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 ${textSub} shrink-0`} />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}