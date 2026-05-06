import React from "react";
import { format, parseISO, differenceInDays, isToday, isPast } from "date-fns";
import { BookOpen, HelpCircle, ChevronRight, Clock } from "lucide-react";

export default function SpacedRepetitionCard({ record, isDark, textSub, onClick }) {
  const reviewDate = record.next_review_date ? parseISO(record.next_review_date) : null;
  const daysUntil = reviewDate ? differenceInDays(reviewDate, new Date()) : null;
  const overdue = reviewDate && isPast(reviewDate) && !isToday(reviewDate);
  const dueToday = reviewDate && isToday(reviewDate);

  const statusColor = overdue
    ? "text-red-400 bg-red-500/10 border-red-500/20"
    : dueToday
    ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
    : isDark ? "text-white/40 bg-white/4 border-white/8" : "text-gray-500 bg-gray-50 border-gray-200";

  const statusLabel = overdue
    ? "Overdue"
    : dueToday
    ? "Due today"
    : daysUntil !== null
    ? `In ${daysUntil}d`
    : "";

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isDark ? "border-white/6 bg-white/3 hover:bg-white/6" : "border-gray-100 bg-gray-50 hover:bg-gray-100"}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${record.activity_type === "flashcards" ? "bg-blue-500/15" : "bg-purple-500/15"}`}>
        {record.activity_type === "flashcards"
          ? <BookOpen className="w-4 h-4 text-blue-400" />
          : <HelpCircle className="w-4 h-4 text-purple-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{record.session_title || "Session"}</p>
        <p className={`text-xs ${textSub}`}>
          {record.activity_type === "flashcards" ? `${record.score || 0} mastered` : `${record.score || 0}% score`}
          {record.difficulty && ` · ${record.difficulty}`}
        </p>
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold shrink-0 ${statusColor}`}>
        <Clock className="w-3 h-3" />
        {statusLabel}
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 ${textSub}`} />
    </button>
  );
}