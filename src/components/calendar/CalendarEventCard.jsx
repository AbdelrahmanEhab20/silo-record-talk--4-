import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Clock, MapPin, Users, ExternalLink } from "lucide-react";

export default function CalendarEventCard({ event }) {
  const { isDark } = useTheme();
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/50" : "text-gray-500";
  const card = isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200";

  const start = event.start?.dateTime ? new Date(event.start.dateTime) : event.start?.date ? new Date(event.start.date) : null;
  const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
  const isAllDay = !!event.start?.date && !event.start?.dateTime;

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
    <div className={`rounded-xl border p-3.5 ${card}`}>
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
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
          </div>
          {event.description && (
            <p className={`text-[10px] mt-1.5 ${sub} line-clamp-2`}>{event.description}</p>
          )}
        </div>
        {event.htmlLink && (
          <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
            className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "text-white/25 hover:text-white/70 hover:bg-white/8" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}`}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}