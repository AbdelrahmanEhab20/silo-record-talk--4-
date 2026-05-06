import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Calendar, ChevronDown, ChevronUp, X, Plus, Loader2, Link2, ExternalLink, Download } from "lucide-react";
import { format } from "date-fns";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const PROVIDERS = [
  {
    value: "google",
    label: "Google",
    emoji: "🟢",
    color: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    openUrl: () => "https://calendar.google.com",
  },
  {
    value: "outlook",
    label: "Outlook",
    emoji: "🔵",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    openUrl: () => "https://outlook.live.com/calendar",
  },
  {
    value: "exchange",
    label: "Exchange",
    emoji: "🟠",
    color: "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400",
    openUrl: () => "https://outlook.office.com/calendar",
  },
  {
    value: "device",
    label: "Device",
    emoji: "📱",
    color: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    openUrl: null, // handled via .ics download
  },
];

function generateICS({ title, date, location, attendees }) {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = date
    ? new Date(date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : now;
  const end = date
    ? new Date(new Date(date).getTime() + 60 * 60 * 1000)
        .toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z"
    : now;

  const attendeeLines = (attendees || [])
    .map((a) => `ATTENDEE;CN=${a}:mailto:${a.includes("@") ? a : a + "@unknown.com"}`)
    .join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SILO//Meeting//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title || "Meeting"}`,
    location ? `LOCATION:${location}` : "",
    attendeeLines,
    `DTSTAMP:${now}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export default function CalendarEventLink({ session, sessionId, onUpdated }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showProviderDrawer, setShowProviderDrawer] = useState(false);
  const [newAttendee, setNewAttendee] = useState("");

  const [form, setForm] = useState({
    calendar_event_title: session.calendar_event_title || "",
    calendar_event_date: session.calendar_event_date
      ? session.calendar_event_date.slice(0, 16)
      : "",
    calendar_event_location: session.calendar_event_location || "",
    calendar_attendees: session.calendar_attendees || [],
    calendar_provider: session.calendar_provider || "google",
  });

  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-100";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputCls = `w-full rounded-xl px-3 py-2 text-sm outline-none border ${
    isDark
      ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/30 focus:border-purple-500/60"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400"
  }`;

  const isLinked = !!session.calendar_event_title;

  const startEdit = (provider) => {
    setForm({
      calendar_event_title: session.calendar_event_title || "",
      calendar_event_date: session.calendar_event_date
        ? session.calendar_event_date.slice(0, 16)
        : "",
      calendar_event_location: session.calendar_event_location || "",
      calendar_attendees: session.calendar_attendees || [],
      calendar_provider: provider || session.calendar_provider || "google",
    });
    setEditing(true);
    setOpen(true);
  };

  const handleProviderOpen = (provider) => {
    if (provider.value === "device") {
      // Generate and download ICS
      const ics = generateICS({
        title: session.calendar_event_title || "Meeting",
        date: session.calendar_event_date,
        location: session.calendar_event_location,
        attendees: session.calendar_attendees,
      });
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meeting.ics";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      window.open(provider.openUrl(), "_blank");
    }
    // Open the form pre-filled with this provider
    startEdit(provider.value);
  };

  const addAttendee = () => {
    const val = newAttendee.trim();
    if (!val) return;
    setForm((f) => ({ ...f, calendar_attendees: [...f.calendar_attendees, val] }));
    setNewAttendee("");
  };

  const removeAttendee = (i) => {
    setForm((f) => ({
      ...f,
      calendar_attendees: f.calendar_attendees.filter((_, idx) => idx !== i),
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        calendar_event_date: data.calendar_event_date
          ? new Date(data.calendar_event_date).toISOString()
          : null,
      };
      return await base44.entities.Session.update(sessionId, payload);
    },
    onMutate: async (data) => {
      setForm((f) => ({ ...f, ...data }));
    },
    onSuccess: () => {
      setEditing(false);
      if (onUpdated) onUpdated(form);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.Session.update(sessionId, {
        calendar_event_title: null,
        calendar_event_date: null,
        calendar_event_location: null,
        calendar_attendees: [],
        calendar_provider: null,
      });
    },
    onMutate: async () => {
      setForm({
        calendar_event_title: "",
        calendar_event_date: "",
        calendar_event_location: "",
        calendar_attendees: [],
        calendar_provider: "google",
      });
    },
    onSuccess: () => {
      setEditing(false);
      setOpen(false);
      if (onUpdated) onUpdated(null);
    },
  });

  const handleSave = () => saveMutation.mutate(form);
  const handleUnlink = () => unlinkMutation.mutate();

  const linkedProvider = PROVIDERS.find((p) => p.value === session.calendar_provider);

  return (
    <div className={`${card} rounded-2xl border ${border} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Calendar className={`w-4 h-4 ${isLinked ? "text-purple-400" : textSub}`} />
          <span className="text-sm font-medium">
            {isLinked ? session.calendar_event_title : "Link Calendar Event"}
          </span>
          {isLinked && linkedProvider && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-white/50" : "bg-gray-100 text-gray-500"}`}>
              {linkedProvider.emoji} {linkedProvider.label}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className={`w-4 h-4 ${textSub}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${textSub}`} />
        )}
      </button>

      {open && !editing && (
        <div className={`px-4 pb-4 border-t ${border} pt-3`}>
          {isLinked ? (
            /* Linked view */
            <div className="space-y-2">
              {session.calendar_event_date && (
                <p className={`text-xs ${textSub}`}>
                  📅 {format(new Date(session.calendar_event_date), "EEEE, MMMM d, yyyy · h:mm a")}
                </p>
              )}
              {session.calendar_event_location && (
                <p className={`text-xs ${textSub}`}>📍 {session.calendar_event_location}</p>
              )}
              {session.calendar_attendees?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {session.calendar_attendees.map((a, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-white/60" : "bg-gray-100 text-gray-600"}`}>
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-3 items-center">
                <button onClick={() => startEdit()} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Edit</button>
                <span className={textSub}>·</span>
                {/* Open in calendar */}
                {linkedProvider && linkedProvider.value !== "device" && (
                  <>
                    <button
                      onClick={() => window.open(linkedProvider.openUrl(), "_blank")}
                      className={`flex items-center gap-1 text-xs transition-colors ${textSub} hover:text-white`}
                    >
                      <ExternalLink className="w-3 h-3" /> Open {linkedProvider.label}
                    </button>
                    <span className={textSub}>·</span>
                  </>
                )}
                {linkedProvider?.value === "device" && (
                  <>
                    <button
                      onClick={() => handleProviderOpen(linkedProvider)}
                      className={`flex items-center gap-1 text-xs transition-colors ${textSub} hover:text-white`}
                    >
                      <Download className="w-3 h-3" /> Save .ics
                    </button>
                    <span className={textSub}>·</span>
                  </>
                )}
                <button
                  onClick={handleUnlink}
                  disabled={unlinkMutation.isPending}
                  className={`text-xs transition-colors ${isDark ? "text-white/30 hover:text-red-400" : "text-gray-400 hover:text-red-400"}`}
                >
                  {unlinkMutation.isPending ? "…" : "Unlink"}
                </button>
              </div>
            </div>
          ) : (
           /* Provider picker — triggers bottom sheet */
           <div>
             <p className={`text-xs mb-3 ${textSub}`}>Open your calendar to pick an event, then enter the details below:</p>
             <button
               onClick={() => setShowProviderDrawer(true)}
               className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-purple-500 hover:bg-purple-600 text-white transition-colors"
             >
               Select Calendar
             </button>
             <button
               onClick={() => startEdit()}
               className={`mt-3 flex items-center gap-1.5 text-xs transition-colors ${textSub} hover:text-purple-400`}
             >
               <Link2 className="w-3 h-3" />
               Or enter details manually
             </button>
           </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {open && editing && (
        <div className={`px-4 pb-4 border-t ${border} pt-3 space-y-3`}>
          {/* Provider tabs */}
          <div className="flex gap-2 flex-wrap">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => setForm((f) => ({ ...f, calendar_provider: p.value }))}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  form.calendar_provider === p.value
                    ? "border-purple-500 text-purple-400 bg-purple-500/10"
                    : isDark
                    ? "border-white/10 text-white/40 hover:border-white/20"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>

          <input
            value={form.calendar_event_title}
            onChange={(e) => setForm((f) => ({ ...f, calendar_event_title: e.target.value }))}
            placeholder="Event title"
            className={inputCls}
          />

          <input
            type="datetime-local"
            value={form.calendar_event_date}
            onChange={(e) => setForm((f) => ({ ...f, calendar_event_date: e.target.value }))}
            style={{ colorScheme: isDark ? "dark" : "light" }}
            className={inputCls}
          />

          <input
            value={form.calendar_event_location}
            onChange={(e) => setForm((f) => ({ ...f, calendar_event_location: e.target.value }))}
            placeholder="Location or meeting URL (optional)"
            className={inputCls}
          />

          <div>
            <p className={`text-xs mb-1.5 ${textSub}`}>Attendees</p>
            {form.calendar_attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.calendar_attendees.map((a, i) => (
                  <span key={i} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-white/60" : "bg-gray-100 text-gray-600"}`}>
                    {a}
                    <button onClick={() => removeAttendee(i)} className="hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAttendee()}
                placeholder="name@email.com or Name"
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={addAttendee}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${isDark ? "bg-white/10 hover:bg-white/15 text-white/50" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || !form.calendar_event_title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className={`px-4 py-2 rounded-xl text-xs transition-colors ${isDark ? "bg-white/8 text-white/50 hover:bg-white/12" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Provider Selection Bottom Sheet */}
      <Drawer open={showProviderDrawer} onOpenChange={setShowProviderDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select Calendar</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  handleProviderOpen(p);
                  setShowProviderDrawer(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border bg-gradient-to-br text-sm font-medium transition-all active:scale-95 ${p.color}`}
              >
                <span className="text-xl">{p.emoji}</span>
                <span className="flex-1 text-left">{p.label}</span>
                {p.value === "device" ? (
                  <Download className="w-4 h-4 opacity-60" />
                ) : (
                  <ExternalLink className="w-4 h-4 opacity-60" />
                )}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}