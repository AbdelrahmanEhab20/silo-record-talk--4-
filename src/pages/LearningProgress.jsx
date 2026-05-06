import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BookOpen, HelpCircle, Calendar, TrendingUp, Award, ChevronRight, Loader2, GraduationCap, FolderOpen } from "lucide-react";
import { format, subDays, parseISO, startOfDay, isWithinInterval } from "date-fns";
import SpacedRepetitionCard from "@/components/learning/SpacedRepetitionCard";

const EDUCATIONAL_TYPES = ["Class", "Lecture", "Workshop"];

export default function LearningProgress() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  useEffect(() => {
    appClient.auth.me().then(async (u) => {
      setUser(u);
      const [recs, sess] = await Promise.all([
        appClient.entities.StudyRecord.filter({ user_email: u.email }),
        appClient.entities.Session.filter({ user_email: u.email }),
      ]);
      setRecords(recs);
      setSessions(sess.filter(s => EDUCATIONAL_TYPES.includes(s.session_type)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // --- Derived stats ---
  const totalFlashcardSessions = records.filter(r => r.activity_type === "flashcards").length;
  const totalFlashcardsMastered = records.filter(r => r.activity_type === "flashcards").reduce((sum, r) => sum + (r.score || 0), 0);
  const quizRecords = records.filter(r => r.activity_type === "quiz");
  const avgQuizScore = quizRecords.length > 0 ? Math.round(quizRecords.reduce((s, r) => s + (r.score || 0), 0) / quizRecords.length) : 0;

  // Average quiz score by session type
  const scoreByType = EDUCATIONAL_TYPES.map(type => {
    const typed = quizRecords.filter(r => r.session_type === type);
    const avg = typed.length > 0 ? Math.round(typed.reduce((s, r) => s + (r.score || 0), 0) / typed.length) : null;
    return { type, avg, count: typed.length };
  });

  // Study heatmap — last 12 weeks (84 days)
  const today = startOfDay(new Date());
  const heatmapDays = Array.from({ length: 84 }, (_, i) => {
    const date = subDays(today, 83 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const count = records.filter(r => r.study_date && r.study_date.startsWith(dateStr)).length;
    return { date, dateStr, count };
  });
  const maxCount = Math.max(...heatmapDays.map(d => d.count), 1);

  // Upcoming reviews
  const upcoming = records
    .filter(r => r.next_review_date)
    .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
    .slice(0, 5);

  // Sessions with no study record yet
  const studiedSessionIds = new Set(records.map(r => r.session_id));
  const unstudiedSessions = sessions.filter(s => !studiedSessionIds.has(s.id)).slice(0, 3);

  const heatmapColor = (count) => {
    if (count === 0) return isDark ? "bg-white/5" : "bg-gray-100";
    const intensity = count / maxCount;
    if (intensity < 0.25) return "bg-purple-500/20";
    if (intensity < 0.5) return "bg-purple-500/40";
    if (intensity < 0.75) return "bg-purple-500/70";
    return "bg-purple-500";
  };

  const typeColors = {
    Class: "text-green-400 bg-green-500/15",
    Lecture: "text-purple-400 bg-purple-500/15",
    Workshop: "text-orange-400 bg-orange-500/15",
  };

  const typeIcons = { Class: "🎓", Lecture: "📖", Workshop: "⚡" };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-white/20" : "text-gray-300"}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${textMain} py-6 px-5 pb-24`}>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Learning Progress</h1>
            <p className={`text-xs ${textSub}`}>Your study history for classes, lectures & workshops</p>
          </div>
          <button onClick={() => navigate("/Courses")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors font-medium ${isDark ? "border-white/10 bg-white/4 text-white/60 hover:bg-white/8 hover:text-white" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
            <FolderOpen className="w-3.5 h-3.5" />
            Courses
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Flashcards Mastered", value: totalFlashcardsMastered, icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Avg Quiz Score", value: quizRecords.length ? `${avgQuizScore}%` : "—", icon: HelpCircle, color: "text-purple-400", bg: "bg-purple-500/10" },
            { label: "Study Sessions", value: records.length, icon: Calendar, color: "text-green-400", bg: "bg-green-500/10" },
          ].map(({ label, value, icon: Icon, color, bg: ibg }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-4 text-center ${card}`}>
              <div className={`w-8 h-8 rounded-xl ${ibg} flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-lg font-bold ${textMain}`}>{value}</p>
              <p className={`text-[10px] mt-0.5 ${textSub}`}>{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quiz Score by Session Type */}
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold">Avg Quiz Score by Type</p>
          </div>
          <div className="space-y-3">
            {scoreByType.map(({ type, avg, count }) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[type]}`}>
                    {typeIcons[type]} {type}
                  </span>
                  <span className={`text-xs font-bold ${textMain}`}>
                    {avg !== null ? `${avg}%` : "—"} {count > 0 && <span className={`font-normal ${textSub}`}>({count} quiz{count !== 1 ? "zes" : ""})</span>}
                  </span>
                </div>
                <div className={`h-1.5 rounded-full ${isDark ? "bg-white/8" : "bg-gray-100"}`}>
                  <div className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    style={{ width: avg !== null ? `${avg}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Study Heatmap */}
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold">Study Consistency</p>
            <span className={`ml-auto text-xs ${textSub}`}>Last 12 weeks</span>
          </div>
          {/* Day labels */}
          <div className="flex gap-0.5 mb-1 pl-8">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <p key={i} className={`text-[9px] w-3 text-center ${textSub}`}>{d}</p>
            ))}
          </div>
          {/* Grid: 12 rows (weeks) × 7 cols (days) — rendered column-major */}
          <div className="flex gap-0.5">
            {/* Week column labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {Array.from({ length: 12 }, (_, w) => {
                const weekStart = heatmapDays[w * 7]?.date;
                return (
                  <p key={w} className={`text-[9px] w-7 text-right leading-3 h-3 flex items-center justify-end ${textSub}`}>
                    {weekStart ? format(weekStart, "MMM d") : ""}
                  </p>
                );
              })}
            </div>
            {/* Day columns */}
            {Array.from({ length: 7 }, (_, dayOfWeek) => (
              <div key={dayOfWeek} className="flex flex-col gap-0.5">
                {Array.from({ length: 12 }, (_, week) => {
                  const idx = week * 7 + dayOfWeek;
                  const day = heatmapDays[idx];
                  if (!day) return <div key={week} className="w-3 h-3" />;
                  return (
                    <div key={week}
                      title={`${format(day.date, "MMM d")}: ${day.count} session${day.count !== 1 ? "s" : ""}`}
                      className={`w-3 h-3 rounded-sm ${heatmapColor(day.count)} transition-colors`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className={`text-[9px] ${textSub}`}>Less</span>
            {["bg-white/5", "bg-purple-500/20", "bg-purple-500/40", "bg-purple-500/70", "bg-purple-500"].map(c => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span className={`text-[9px] ${textSub}`}>More</span>
          </div>
        </div>

        {/* Upcoming Reviews */}
        {upcoming.length > 0 && (
          <div className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-semibold">Upcoming Reviews</p>
            </div>
            <div className="space-y-2">
              {upcoming.map((rec) => (
                <SpacedRepetitionCard key={rec.id} record={rec} isDark={isDark} textSub={textSub}
                  onClick={() => navigate(`/SessionDetail?id=${rec.session_id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Suggested: unstudied educational sessions */}
        {unstudiedSessions.length > 0 && (
          <div className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-semibold">Sessions to Study</p>
              <span className={`ml-auto text-xs ${textSub}`}>No study records yet</span>
            </div>
            <div className="space-y-2">
              {unstudiedSessions.map(sess => (
                <button key={sess.id} onClick={() => navigate(`/SessionDetail?id=${sess.id}`)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isDark ? "border-white/6 bg-white/3 hover:bg-white/6" : "border-gray-100 bg-gray-50 hover:bg-gray-100"}`}>
                  <span className="text-xl">{typeIcons[sess.session_type] || "📚"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${textMain}`}>{sess.title}</p>
                    <p className={`text-xs ${textSub}`}>{sess.session_type} · {format(new Date(sess.created_date), "MMM d, yyyy")}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${textSub}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {records.length === 0 && sessions.length === 0 && (
          <div className="text-center py-16">
            <GraduationCap className={`w-12 h-12 mx-auto mb-4 ${textSub}`} />
            <p className={`text-base font-semibold mb-1 ${textMain}`}>No learning sessions yet</p>
            <p className={`text-sm ${textSub}`}>Sessions tagged as Class, Lecture, or Workshop will appear here once you generate flashcards or take a quiz.</p>
          </div>
        )}
      </div>
    </div>
  );
}