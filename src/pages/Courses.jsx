import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, ChevronRight, Loader2, BookOpen, HelpCircle,
  BarChart2, FolderOpen, Tag, CheckCircle2, Clock, Zap, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";

const EDUCATIONAL_TYPES = ["Class", "Lecture", "Workshop"];

const TYPE_COLORS = {
  Class: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/25" },
  Lecture: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/25" },
  Workshop: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/25" },
};
const TYPE_ICONS = { Class: "🎓", Lecture: "📖", Workshop: "⚡" };

function groupSessionsByTag(sessions) {
  // Build a map: tag -> sessions
  const tagMap = {};
  sessions.forEach(s => {
    (s.tags || []).forEach(tag => {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(s);
    });
  });

  // Only keep tags with 2+ sessions (a "course")
  return Object.entries(tagMap)
    .filter(([, sess]) => sess.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tag, sess]) => ({
      tag,
      sessions: sess.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
    }));
}

function CourseCard({ course, records, isDark, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const rowHover = isDark ? "hover:bg-white/4" : "hover:bg-gray-50";

  const { tag, sessions } = course;
  const sessionIds = new Set(sessions.map(s => s.id));
  const courseRecords = records.filter(r => sessionIds.has(r.session_id));
  const studiedIds = new Set(courseRecords.map(r => r.session_id));
  const completedCount = studiedIds.size;
  const totalCount = sessions.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const quizRecords = courseRecords.filter(r => r.activity_type === "quiz");
  const avgScore = quizRecords.length > 0
    ? Math.round(quizRecords.reduce((s, r) => s + (r.score || 0), 0) / quizRecords.length)
    : null;

  // Determine dominant session type
  const typeCounts = {};
  sessions.forEach(s => { typeCounts[s.session_type] = (typeCounts[s.session_type] || 0) + 1; });
  const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const typeStyle = TYPE_COLORS[dominantType] || TYPE_COLORS.Lecture;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${card}`}>
      {/* Course Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${typeStyle.bg}`}>
            {TYPE_ICONS[dominantType] || "📚"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`text-sm font-bold capitalize ${textMain}`}>{tag}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                {dominantType}
              </span>
            </div>
            <p className={`text-xs ${textSub}`}>{totalCount} session{totalCount !== 1 ? "s" : ""}</p>
          </div>
          {avgScore !== null && (
            <div className="text-right shrink-0">
              <p className={`text-lg font-bold ${textMain}`}>{avgScore}%</p>
              <p className={`text-[10px] ${textSub}`}>avg score</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] ${textSub}`}>Progress</span>
            <span className={`text-[10px] font-semibold ${textMain}`}>{completedCount}/{totalCount} studied</span>
          </div>
          <div className={`h-1.5 rounded-full ${isDark ? "bg-white/8" : "bg-gray-100"}`}>
            <div className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mt-3">
          <div className={`flex items-center gap-1 text-[10px] ${textSub}`}>
            <CheckCircle2 className="w-3 h-3" /> {completedCount} studied
          </div>
          <div className={`flex items-center gap-1 text-[10px] ${textSub}`}>
            <HelpCircle className="w-3 h-3" /> {quizRecords.length} quiz{quizRecords.length !== 1 ? "zes" : ""}
          </div>
          <div className={`flex items-center gap-1 text-[10px] ${textSub}`}>
            <BookOpen className="w-3 h-3" /> {courseRecords.filter(r => r.activity_type === "flashcards").length} flashcard sets
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className={`mt-3 w-full flex items-center justify-center gap-1 text-xs py-1.5 rounded-xl transition-colors ${isDark ? "bg-white/4 text-white/40 hover:bg-white/8" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide sessions" : "Show sessions"}
        </button>
      </div>

      {/* Sessions List */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className={`border-t ${isDark ? "border-white/6" : "border-gray-100"}`}>
            {sessions.map((sess, i) => {
              const isStudied = studiedIds.has(sess.id);
              const sessQuizzes = courseRecords.filter(r => r.session_id === sess.id && r.activity_type === "quiz");
              const bestScore = sessQuizzes.length > 0 ? Math.max(...sessQuizzes.map(r => r.score || 0)) : null;
              return (
                <button key={sess.id} onClick={() => onNavigate(sess.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 transition-colors ${isDark ? "border-white/4" : "border-gray-50"} ${rowHover}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isStudied
                      ? "bg-green-500/20 text-green-400"
                      : isDark ? "bg-white/8 text-white/30" : "bg-gray-100 text-gray-400"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${textMain}`}>{sess.title}</p>
                    <p className={`text-[10px] ${textSub}`}>
                      {format(new Date(sess.created_date), "MMM d, yyyy")}
                      {sess.session_type && ` · ${TYPE_ICONS[sess.session_type]} ${sess.session_type}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {bestScore !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        bestScore >= 70
                          ? isDark ? "bg-green-500/15 text-green-400" : "bg-green-100 text-green-700"
                          : isDark ? "bg-yellow-500/15 text-yellow-400" : "bg-yellow-100 text-yellow-700"
                      }`}>{bestScore}%</span>
                    )}
                    <ChevronRight className={`w-3 h-3 ${textSub}`} />
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Courses() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  useEffect(() => {
    appClient.auth.me().then(async (u) => {
      const [sess, recs] = await Promise.all([
        appClient.entities.Session.filter({ user_email: u.email }),
        appClient.entities.StudyRecord.filter({ user_email: u.email }),
      ]);
      setSessions(sess.filter(s => EDUCATIONAL_TYPES.includes(s.session_type)));
      setRecords(recs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const courses = useMemo(() => groupSessionsByTag(sessions), [sessions]);

  // Standalone sessions (not part of any course)
  const coursedIds = useMemo(() => {
    const taggedSessions = new Set();
    courses.forEach(c => c.sessions.forEach(s => taggedSessions.add(s.id)));
    return taggedSessions;
  }, [courses]);

  const standaloneSessions = sessions.filter(s => !coursedIds.has(s.id));

  // Overall stats
  const totalSessions = sessions.length;
  const studiedIds = new Set(records.map(r => r.session_id));
  const studiedCount = sessions.filter(s => studiedIds.has(s.id)).length;
  const quizRecords = records.filter(r => r.activity_type === "quiz");
  const avgScore = quizRecords.length > 0
    ? Math.round(quizRecords.reduce((s, r) => s + (r.score || 0), 0) / quizRecords.length)
    : null;

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
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Courses</h1>
            <p className={`text-xs ${textSub}`}>Sessions grouped by shared topics & tags</p>
          </div>
        </div>

        {/* Summary stats */}
        {totalSessions > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Courses", value: courses.length, icon: FolderOpen, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Sessions", value: `${studiedCount}/${totalSessions}`, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
              { label: "Avg Score", value: avgScore !== null ? `${avgScore}%` : "—", icon: BarChart2, color: "text-purple-400", bg: "bg-purple-500/10" },
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
        )}

        {/* Courses */}
        {courses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <p className={`text-xs font-semibold ${textSub} uppercase tracking-wider`}>
                Courses ({courses.length})
              </p>
            </div>
            <div className="space-y-3">
              {courses.map(course => (
                <CourseCard
                  key={course.tag}
                  course={course}
                  records={records}
                  isDark={isDark}
                  onNavigate={(id) => navigate(`/SessionDetail?id=${id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Standalone sessions */}
        {standaloneSessions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <p className={`text-xs font-semibold ${textSub} uppercase tracking-wider`}>
                Individual Sessions
              </p>
            </div>
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
              {standaloneSessions.map((sess, i) => {
                const isStudied = studiedIds.has(sess.id);
                const sessQuizzes = records.filter(r => r.session_id === sess.id && r.activity_type === "quiz");
                const bestScore = sessQuizzes.length > 0 ? Math.max(...sessQuizzes.map(r => r.score || 0)) : null;
                const typeStyle = TYPE_COLORS[sess.session_type] || TYPE_COLORS.Lecture;
                return (
                  <button key={sess.id} onClick={() => navigate(`/SessionDetail?id=${sess.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 transition-colors ${isDark ? "border-white/4 hover:bg-white/4" : "border-gray-50 hover:bg-gray-50"}`}>
                    <span className="text-base shrink-0">{TYPE_ICONS[sess.session_type] || "📚"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${textMain}`}>{sess.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                          {sess.session_type}
                        </span>
                        <span className={`text-[10px] ${textSub}`}>{format(new Date(sess.created_date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isStudied && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                      {bestScore !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          bestScore >= 70
                            ? isDark ? "bg-green-500/15 text-green-400" : "bg-green-100 text-green-700"
                            : isDark ? "bg-yellow-500/15 text-yellow-400" : "bg-yellow-100 text-yellow-700"
                        }`}>{bestScore}%</span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 ${textSub}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className={`w-12 h-12 mx-auto mb-4 ${textSub}`} />
            <p className={`text-base font-semibold mb-1 ${textMain}`}>No courses yet</p>
            <p className={`text-sm ${textSub} max-w-xs mx-auto`}>
              Sessions tagged as Class, Lecture, or Workshop that share common tags will automatically be grouped here as a course.
            </p>
          </div>
        )}

        {/* How courses work */}
        {sessions.length > 0 && courses.length === 0 && (
          <div className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className={`text-sm font-semibold mb-1 ${textMain}`}>How courses work</p>
                <p className={`text-xs leading-relaxed ${textSub}`}>
                  Sessions with 2 or more shared tags are automatically grouped into a course. Make sure your Class, Lecture, or Workshop sessions have tags — they're generated automatically from the transcript.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}