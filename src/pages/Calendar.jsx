import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Mic, RefreshCw, Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import CalendarProvidersPanel from "@/components/calendar/CalendarProvidersPanel";
import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import AddToCalendarModal from "@/components/calendar/AddToCalendarModal";
import { FEATURES } from "@/utils/featureFlags";
import {
  mergeDuplicateEvents,
  filterByVisibleProviders,
  findConflicts,
  countConflictDays,
} from "@/utils/calendarEvents";

const VISIBILITY_STORAGE_KEY = "silo:calendar:visible-providers";

function loadVisibility() {
  try {
    const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (!raw) return { google: true, outlook: true };
    const parsed = JSON.parse(raw);
    return { google: parsed.google !== false, outlook: parsed.outlook !== false };
  } catch {
    return { google: true, outlook: true };
  }
}

const calendarSyncEnabled = FEATURES.calendarIntegrations;
const emptyProviderState = { connected: false, email: null, loading: true };

export default function Calendar() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [googleState, setGoogleState] = useState(emptyProviderState);
  const [outlookState, setOutlookState] = useState(emptyProviderState);
  const [gcEvents, setGcEvents] = useState([]);
  const [outlookEvents, setOutlookEvents] = useState([]);
  const [gcLoading, setGcLoading] = useState(false);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [addToCalModal, setAddToCalModal] = useState(null);
  const [visibleProviders, setVisibleProviders] = useState(loadVisibility);

  const toggleProviderVisible = useCallback((provider) => {
    setVisibleProviders((prev) => {
      const next = { ...prev, [provider]: !prev[provider] };
      try {
        localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => appClient.entities.Session.list("-created_date", 200),
  });

  const sessionsByDate = useMemo(() => {
    const grouped = {};
    sessions.forEach((session) => {
      const date = new Date(session.created_date).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(session);
    });
    return grouped;
  }, [sessions]);

  const refreshGoogle = useCallback(async () => {
    if (!calendarSyncEnabled) {
      setGoogleState({ connected: false, email: null, loading: false });
      setGcEvents([]);
      return;
    }
    setGcLoading(true);
    try {
      const status = await appClient.googleCalendar.status();
      if (status?.connected) {
        setGoogleState({ connected: true, email: status.google_email || null, loading: false });
        const events = await appClient.googleCalendar.listEvents(14);
        setGcEvents(events?.connected ? (events.events || []).map((e) => ({ ...e, provider: "google" })) : []);
      } else {
        setGoogleState({ connected: false, email: null, loading: false });
        setGcEvents([]);
      }
    } catch {
      setGoogleState({ connected: false, email: null, loading: false });
      setGcEvents([]);
    }
    setGcLoading(false);
  }, []);

  const refreshOutlook = useCallback(async () => {
    if (!calendarSyncEnabled) {
      setOutlookState({ connected: false, email: null, loading: false });
      setOutlookEvents([]);
      return;
    }
    setOutlookLoading(true);
    try {
      const status = await appClient.outlookCalendar.status();
      if (status?.connected) {
        setOutlookState({ connected: true, email: status.ms_email || null, loading: false });
        const events = await appClient.outlookCalendar.listEvents(14);
        setOutlookEvents(events?.connected ? (events.events || []).map((e) => ({ ...e, provider: "outlook" })) : []);
      } else {
        setOutlookState({ connected: false, email: null, loading: false });
        setOutlookEvents([]);
      }
    } catch {
      setOutlookState({ connected: false, email: null, loading: false });
      setOutlookEvents([]);
    }
    setOutlookLoading(false);
  }, []);

  useEffect(() => {
    appClient.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await appClient.auth.me();
        setUser(me);
        if (calendarSyncEnabled) {
          await Promise.all([refreshGoogle(), refreshOutlook()]);
        }
      } else {
        setGoogleState({ connected: false, email: null, loading: false });
        setOutlookState({ connected: false, email: null, loading: false });
      }
      setAuthChecked(true);
    });
  }, [refreshGoogle, refreshOutlook]);

  const refreshAll = useCallback(() => {
    refreshGoogle();
    refreshOutlook();
  }, [refreshGoogle, refreshOutlook]);

  const anyConnected = googleState.connected || outlookState.connected;
  const anyLoading = gcLoading || outlookLoading;
  const allEvents = useMemo(() => {
    const combined = [...gcEvents, ...outlookEvents];
    const filtered = filterByVisibleProviders(combined, visibleProviders);
    return mergeDuplicateEvents(filtered);
  }, [gcEvents, outlookEvents, visibleProviders]);

  const conflictsMap = useMemo(() => findConflicts(allEvents), [allEvents]);

  const conflictDates = useMemo(() => {
    const set = new Set();
    allEvents.forEach((ev) => {
      if (!conflictsMap.has(ev.id)) return;
      const raw = ev.start?.dateTime || ev.start?.date || ev.start;
      if (raw) set.add(new Date(raw).toLocaleDateString());
    });
    return set;
  }, [allEvents, conflictsMap]);

  const conflictDayCount = useMemo(
    () => countConflictDays(conflictsMap, allEvents),
    [conflictsMap, allEvents]
  );

  const conflictPairs = useMemo(() => {
    if (conflictsMap.size === 0) return [];
    const seen = new Set();
    const pairs = [];
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    for (const ev of allEvents) {
      const raw = ev.start?.dateTime || ev.start?.date || ev.start;
      const startMs = raw ? new Date(raw).getTime() : 0;
      if (startMs < now || startMs > week) continue;
      const others = conflictsMap.get(ev.id) || [];
      others.forEach((other) => {
        const key = [ev.id, other.id].sort().join("|");
        if (seen.has(key)) return;
        seen.add(key);
        pairs.push({ a: ev, b: other });
      });
    }
    return pairs.slice(0, 5);
  }, [conflictsMap, allEvents]);

  const focusEvent = useCallback((id) => {
    if (!id) return;
    const el = document.getElementById(`cal-event-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-red-400/70");
      setTimeout(() => el.classList.remove("ring-2", "ring-red-400/70"), 1600);
    }
  }, []);

  // ── Calendar grid ──────────────────────────────────────────────
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1));

  const selectedDateStr = selectedDate?.toLocaleDateString();
  const sessionsForSelectedDate = selectedDateStr ? sessionsByDate[selectedDateStr] : [];

  const externalEventsByDate = useMemo(() => {
    const grouped = {};
    allEvents.forEach((ev) => {
      const raw = ev.start?.dateTime || ev.start?.date || ev.start;
      if (!raw) return;
      const key = new Date(raw).toLocaleDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    });
    return grouped;
  }, [allEvents]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    return allEvents
      .filter((ev) => {
        const raw = ev.start?.dateTime || ev.start?.date || ev.start;
        const t = raw ? new Date(raw).getTime() : 0;
        return t >= now && t <= week;
      })
      .sort((a, b) => {
        const ta = new Date(a.start?.dateTime || a.start?.date || a.start).getTime();
        const tb = new Date(b.start?.dateTime || b.start?.date || b.start).getTime();
        return ta - tb;
      })
      .slice(0, 8);
  }, [allEvents]);

  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]';
  const cardBg = isDark ? 'bg-white/5 border-white/8' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subText = isDark ? 'text-[#A1A1A6]' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <div className="max-w-lg mx-auto px-5 py-8 pb-24">

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{monthNames[month]} {year}</h2>
          </div>
          <div className="flex gap-1 items-center">
            {anyConnected && (
              <button
                onClick={refreshAll}
                disabled={anyLoading}
                className={`p-2 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center ${isDark ? "text-white/40 hover:bg-white/8" : "text-gray-400 hover:bg-gray-100"}`}
              >
                {anyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
            )}
            <button onClick={goToPrevMonth} className="p-2 hover:bg-white/10 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {calendarSyncEnabled && (
          <div className="mb-5">
            <CalendarProvidersPanel
              google={googleState}
              outlook={outlookState}
              visible={visibleProviders}
              onToggleVisible={toggleProviderVisible}
              onGoogleChanged={refreshGoogle}
              onOutlookChanged={refreshOutlook}
            />
          </div>
        )}

        {/* Calendar Grid */}
        <div className={`${cardBg} border rounded-2xl p-4 mb-6`}>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-[#A1A1A6] py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const dateStr = date.toLocaleDateString();
              const hasSession = dateStr in sessionsByDate;
              const eventsToday = externalEventsByDate[dateStr] || [];
              const hasGoogleEvent = eventsToday.some((e) =>
                (e.providers || [e.provider]).includes("google")
              );
              const hasOutlookEvent = eventsToday.some((e) =>
                (e.providers || [e.provider]).includes("outlook")
              );
              const hasGcEvent = eventsToday.length > 0;
              const hasConflict = conflictDates.has(dateStr);
              const isSelected = selectedDate?.toLocaleDateString() === dateStr;
              const isToday = new Date().toLocaleDateString() === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition relative ${
                    isSelected
                      ? isDark ? "bg-purple-500/30 border border-purple-400 text-white" : "bg-purple-100 border border-purple-400 text-gray-900"
                      : isToday
                      ? isDark ? "bg-white/15 text-white font-bold" : "bg-gray-200 text-gray-900 font-bold"
                      : hasSession || hasGcEvent
                      ? isDark ? "bg-white/8 border border-white/15 text-white" : "bg-gray-100 border border-gray-300 text-gray-900"
                      : isDark ? "text-[#A1A1A6] hover:bg-white/5" : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {day}
                  <div className="flex gap-0.5 mt-0.5">
                    {hasSession && <span className="w-1 h-1 rounded-full bg-purple-400" />}
                    {hasGoogleEvent && <span className="w-1 h-1 rounded-full" style={{ background: "#4285F4" }} />}
                    {hasOutlookEvent && <span className="w-1 h-1 rounded-full" style={{ background: "#0078D4" }} />}
                    {hasConflict && <span className="w-1 h-1 rounded-full bg-red-400" title="Conflict on this day" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/5">
            <span className={`flex items-center gap-1.5 text-[10px] ${subText}`}><span className="w-2 h-2 rounded-full bg-purple-400" />Silo session</span>
            {googleState.connected && <span className={`flex items-center gap-1.5 text-[10px] ${subText}`}><span className="w-2 h-2 rounded-full" style={{ background: "#4285F4" }} />Google</span>}
            {outlookState.connected && <span className={`flex items-center gap-1.5 text-[10px] ${subText}`}><span className="w-2 h-2 rounded-full" style={{ background: "#0078D4" }} />Outlook</span>}
            {conflictDayCount > 0 && <span className={`flex items-center gap-1.5 text-[10px] ${subText}`}><span className="w-2 h-2 rounded-full bg-red-400" />Conflict</span>}
          </div>
        </div>

        {/* Conflict summary banner */}
        {conflictPairs.length > 0 && (
          <div className={`mb-5 rounded-2xl border p-4 ${isDark ? "border-red-500/30 bg-red-500/8" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-4 h-4 ${isDark ? "text-red-300" : "text-red-500"}`} />
              <p className={`text-sm font-semibold ${isDark ? "text-red-200" : "text-red-700"}`}>
                {conflictPairs.length === 1
                  ? "1 schedule conflict this week"
                  : `${conflictPairs.length} schedule conflicts this week`}
                {conflictDayCount > 0 && (
                  <span className={`ml-1 font-normal ${isDark ? "text-red-200/70" : "text-red-600/80"}`}>
                    on {conflictDayCount} day{conflictDayCount !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <ul className="space-y-1.5">
              {conflictPairs.map(({ a, b }) => {
                const startRaw = a.start?.dateTime || a.start?.date || a.start;
                const when = startRaw
                  ? new Date(startRaw).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "";
                return (
                  <li
                    key={`${a.id}-${b.id}`}
                    className={`text-[12px] leading-snug ${isDark ? "text-red-100/90" : "text-red-700"}`}
                  >
                    <button
                      type="button"
                      onClick={() => focusEvent(a.id)}
                      className="font-medium hover:underline"
                    >
                      {a.summary || "(no title)"}
                    </button>
                    <span className={`mx-1 ${isDark ? "text-red-200/60" : "text-red-500/70"}`}>vs</span>
                    <button
                      type="button"
                      onClick={() => focusEvent(b.id)}
                      className="font-medium hover:underline"
                    >
                      {b.summary || "(no title)"}
                    </button>
                    {when && (
                      <span className={`ml-1 ${isDark ? "text-red-200/60" : "text-red-500/70"}`}>
                        · {when}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {anyConnected && (
          <div className="mb-6">
            <h2 className="text-base font-semibold mb-3">Upcoming (7 days)</h2>
            {anyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => {
                  const evConflicts = conflictsMap.get(ev.id) || [];
                  return (
                    <CalendarEventCard
                      key={`${ev.provider || "g"}:${ev.id}`}
                      event={ev}
                      conflicts={evConflicts}
                      highlight={evConflicts.length > 0}
                    />
                  );
                })}
              </div>
            ) : (
              <div className={`rounded-2xl border p-5 text-center ${cardBg}`}>
                <p className={`text-sm ${subText}`}>No upcoming events in the next 7 days</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Date */}
        {selectedDate && (
          <div className="mb-6">
            <h3 className="text-base font-semibold mb-3">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </h3>

            {externalEventsByDate[selectedDateStr]?.length > 0 && (
              <div className="mb-3 space-y-2">
                {externalEventsByDate[selectedDateStr].map((ev) => {
                  const evConflicts = conflictsMap.get(ev.id) || [];
                  return (
                    <CalendarEventCard
                      key={`${ev.provider || "g"}:${ev.id}`}
                      event={ev}
                      conflicts={evConflicts}
                      highlight={evConflicts.length > 0}
                    />
                  );
                })}
              </div>
            )}

            {/* Silo sessions on this day */}
            {sessionsForSelectedDate?.length > 0 ? (
              <div className="space-y-2">
                {sessionsForSelectedDate.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/SessionDetail?id=${session.id}`)}
                    className={`w-full ${cardBg} border rounded-xl p-4 text-left hover:opacity-80 transition`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Mic className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{session.title || "Untitled Session"}</p>
                        <p className={`text-xs ${subText}`}>
                          {new Date(session.created_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : !externalEventsByDate[selectedDateStr]?.length ? (
              <div className="text-center py-10">
                <Mic className="w-8 h-8 text-[#A1A1A6]/30 mx-auto mb-2" />
                <p className={`text-sm ${subText}`}>Nothing on this day</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Add to Calendar Modal */}
      <AnimatePresence>
        {addToCalModal && (
          <AddToCalendarModal
            item={addToCalModal.item}
            sessionTitle={addToCalModal.sessionTitle}
            onClose={() => setAddToCalModal(null)}
            onAdded={fetchGcEvents}
          />
        )}
      </AnimatePresence>
    </div>
  );
}