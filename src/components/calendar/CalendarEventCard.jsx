import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Clock, MapPin, Users, ExternalLink, AlertTriangle } from "lucide-react";
import { PROVIDER_COLORS, PROVIDER_LABELS } from "@/utils/calendarEvents";

export default function CalendarEventCard({ event, conflicts = [], highlight = false }) {
  const { isDark } = useTheme();
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/50" : "text-gray-500";
  const card = isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200";

  const startRaw = event.start?.dateTime || event.start?.date || event.start;
  const endRaw = event.end?.dateTime || event.end?.date || event.end;
  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;
  const isAllDay = !!event.start?.date && !event.start?.dateTime;
  const link = event.html_link || event.htmlLink;
  const providers = event.providers && event.providers.length
    ? event.providers
    : [event.provider || "google"];
  const isCrossPosted = providers.length > 1;
  const hasConflict = conflicts.length > 0;
  const conflictTitles = conflicts.map((c) => c.summary || "(no title)").join(", ");
  const borderClass = highlight
    ? isDark
      ? "ring-1 ring-red-500/40"
      : "ring-1 ring-red-400/60"
    : "";

  const timeStr = isAllDay
    ? "All day"
    : start
    ? start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) +
      (end ? " – " + end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "")
    : "";

  const dateStr = start
    ? start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "";

  const attendeeCount = event.attendees?.length || 0;

  return (
    <div
      id={event.id ? `cal-event-${event.id}` : undefined}
      className={`rounded-xl border p-3.5 ${card} ${borderClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-0.5 mt-1.5 shrink-0">
          {providers.map((p) => (
            <span
              key={p}
              className="w-2 h-2 rounded-full"
              style={{ background: PROVIDER_COLORS[p] || "#94a3b8" }}
              title={PROVIDER_LABELS[p] || p}
            />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${text}`}>{event.summary || "Untitled Event"}</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {dateStr && (
              <span className={`flex items-center gap-1 text-[10px] ${sub}`}>
                <Clock className="w-3 h-3" />
                {dateStr}
                {timeStr ? ` · ${timeStr}` : ""}
              </span>
            )}
            {event.location && (
              <span className={`flex items-center gap-1 text-[10px] ${sub} truncate max-w-[140px]`}>
                <MapPin className="w-3 h-3 shrink-0" />
                {event.location}
              </span>
            )}
            {attendeeCount > 0 && (
              <span className={`flex items-center gap-1 text-[10px] ${sub}`}>
                <Users className="w-3 h-3" />
                {attendeeCount} attendee{attendeeCount !== 1 ? "s" : ""}
              </span>
            )}
            {isCrossPosted && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isDark ? "bg-white/10 text-white/60" : "bg-gray-100 text-gray-500"
                }`}
                title={`Also on ${providers.map((p) => PROVIDER_LABELS[p] || p).join(", ")}`}
              >
                On {providers.map((p) => PROVIDER_LABELS[p] || p).join(" + ")}
              </span>
            )}
            {hasConflict && (
              <span
                className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                  isDark
                    ? "bg-red-500/15 text-red-300"
                    : "bg-red-50 text-red-600"
                }`}
                title={`Overlaps with: ${conflictTitles}`}
              >
                <AlertTriangle className="w-3 h-3" />
                {conflicts.length === 1 ? "Conflict" : `${conflicts.length} conflicts`}
              </span>
            )}
          </div>
          {event.description && (
            <p className={`text-[10px] mt-1.5 ${sub} line-clamp-2`}>{event.description}</p>
          )}
        </div>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "text-white/25 hover:text-white/70 hover:bg-white/8" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}`}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}