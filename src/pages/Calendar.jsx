import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Mic, RefreshCw, Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import GoogleCalendarConnect from "@/components/calendar/GoogleCalendarConnect";
import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import AddToCalendarModal from "@/components/calendar/AddToCalendarModal";

const CONNECTOR_ID = "69f36381360cadf794b1d9be";

export default function Calendar() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Auth & connection state
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connLoading, setConnLoading] = useState(true);
  const [gcEvents, setGcEvents] = useState([]);
  const [gcLoading, setGcLoading] = useState(false);
  const [addToCalModal, setAddToCalModal] = useState(null); // { item, sessionTitle }

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => base44.entities.Session.list("-created_date", 200),
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

  // ── Google Calendar fetch ──────────────────────────────────────
  const fetchGcEvents = useCallback(async () => {
    setGcLoading(true);
    try {
      const res = await base44.functions.invoke('googleCalendarUser', { action: 'list' });
      setGcEvents(res.data?.events || []);
      setConnected(true);
    } catch {
      setConnected(false);
      setGcEvents([]);
    }
    setGcLoading(false);
  }, []);

  // ── Auth check + initial fetch ─────────────────────────────────
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        await fetchGcEvents();
      }
      setConnLoading(false);
    });
  }, []);

  // ── Connect handler (Rule 3 — popup poll) ─────────────────────
  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        fetchGcEvents();
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setGcEvents([]);
  };

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

  // Group GC events by date for dot indicator
  const gcEventsByDate = useMemo(() => {
    const grouped = {};
    gcEvents.forEach((ev) => {
      const d = ev.start?.dateTime || ev.start?.date;
      if (!d) return;
      const key = new Date(d).toLocaleDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    });
    return grouped;
  }, [gcEvents]);

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    return gcEvents
      .filter(ev => {
        const t = ev.start?.dateTime ? new Date(ev.start.dateTime).getTime() : ev.start?.date ? new Date(ev.start.date).getTime() : 0;
        return t >= now && t <= week;
      })
      .slice(0, 5);
  }, [gcEvents]);

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
            {connected && (
              <button
                onClick={fetchGcEvents}
                disabled={gcLoading}
                className={`p-2 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center ${isDark ? "text-white/40 hover:bg-white/8" : "text-gray-400 hover:bg-gray-100"}`}
              >
                {gcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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

        {/* Google Calendar Connect */}
        <div className="mb-5">
          <GoogleCalendarConnect
            connected={connected}
            loading={connLoading}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>

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
              const hasGcEvent = dateStr in gcEventsByDate;
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
                  {/* Dot indicators */}
                  <div className="flex gap-0.5 mt-0.5">
                    {hasSession && <span className="w-1 h-1 rounded-full bg-purple-400" />}
                    {hasGcEvent && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
            <span className={`flex items-center gap-1.5 text-[10px] ${subText}`}><span className="w-2 h-2 rounded-full bg-purple-400" />Silo session</span>
            {connected && <span className={`flex items-center gap-1.5 text-[10px] ${subText}`}><span className="w-2 h-2 rounded-full bg-blue-400" />Google event</span>}
          </div>
        </div>

        {/* Upcoming Google Calendar Events */}
        {connected && (
          <div className="mb-6">
            <h2 className="text-base font-semibold mb-3">Upcoming (7 days)</h2>
            {gcLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map(ev => <CalendarEventCard key={ev.id} event={ev} />)}
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

            {/* Google events on this day */}
            {gcEventsByDate[selectedDateStr]?.length > 0 && (
              <div className="mb-3 space-y-2">
                {gcEventsByDate[selectedDateStr].map(ev => <CalendarEventCard key={ev.id} event={ev} />)}
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
            ) : !gcEventsByDate[selectedDateStr]?.length ? (
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