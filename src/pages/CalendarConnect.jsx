import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, Smartphone, Chrome, Mail, CheckCircle, ExternalLink, ArrowLeft } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

const PROVIDERS = [
  {
    id: "device",
    name: "Device Calendar",
    description: "Sync with your iPhone or Android calendar",
    icon: Smartphone,
    color: "#34C759",
    steps: [
      "Open your device Settings",
      "Go to Calendar → Accounts",
      "Tap 'Add Account' and choose your provider",
      "Enable calendar sync",
      "Your events will appear automatically",
    ],
    actionLabel: null,
  },
  {
    id: "google",
    name: "Google Calendar",
    description: "Connect your Google or Gmail calendar",
    icon: Chrome,
    color: "#4285F4",
    steps: [
      "Go to calendar.google.com on your browser",
      "Sign in to your Google account",
      "Click the share icon on any calendar",
      "Copy the iCal link (ICS format)",
      "Paste it in the field below to subscribe",
    ],
    actionLabel: "Open Google Calendar",
    actionUrl: "https://calendar.google.com",
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    description: "Connect your Outlook or work calendar",
    icon: Mail,
    color: "#0078D4",
    steps: [
      "Go to outlook.live.com or your Outlook app",
      "Click the gear icon → View all Outlook settings",
      "Go to Calendar → Shared calendars",
      "Under 'Publish a calendar', select your calendar",
      "Copy the ICS link to subscribe",
    ],
    actionLabel: "Open Outlook Calendar",
    actionUrl: "https://outlook.live.com/calendar",
  },
];

export default function CalendarConnect() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [selected, setSelected] = useState(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [connected, setConnected] = useState(false);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-[#A1A1A6]" : "text-gray-500";
  const border = isDark ? "border-white/8" : "border-gray-200";
  const cardBg = isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200";

  const handleConnect = () => {
    if (selected) {
      setConnected(true);
      setTimeout(() => {
        navigate("/Calendar");
      }, 1500);
    }
  };

  const handleBack = () => {
    setSelected(null);
    setIcsUrl("");
    setConnected(false);
  };

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <div className="max-w-lg mx-auto px-5 py-6 pb-20">
        
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => selected ? handleBack() : navigate("/Calendar")}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
              isDark ? "bg-white/5 border-white/8 hover:bg-white/10" : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold">
            {selected ? selected.name : "Connect Calendar"}
          </h1>
        </div>

        {/* Provider List */}
        {!selected && !connected && (
          <div className="space-y-3">
            <p className={`text-sm ${sub} mb-6`}>Choose a calendar to sync with your sessions</p>
            {PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              return (
                <button
                  key={provider.id}
                  onClick={() => setSelected(provider)}
                  className={`w-full ${cardBg} border rounded-2xl p-4 flex items-center gap-4 text-left hover:opacity-80 transition active:scale-98`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${provider.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: provider.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${text}`}>{provider.name}</p>
                    <p className={`text-xs ${sub} mt-0.5`}>{provider.description}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${sub} flex-shrink-0`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Provider Detail / Steps */}
        {selected && !connected && (
          <div>
            {/* Provider icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${selected.color}20` }}
              >
                <selected.icon className="w-8 h-8" style={{ color: selected.color }} />
              </div>
            </div>

            {/* Steps */}
            <div className={`${cardBg} border rounded-2xl p-5 mb-6`}>
              <p className={`text-xs font-semibold ${sub} uppercase tracking-wider mb-4`}>Setup Steps</p>
              <div className="space-y-4">
                {selected.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${selected.color}30`, color: selected.color }}
                    >
                      {i + 1}
                    </div>
                    <p className={`text-sm ${text}`}>{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ICS URL input for Google/Outlook */}
            {selected.id !== "device" && (
              <div className="mb-6">
                <label className={`text-xs font-semibold ${sub} uppercase tracking-wider mb-2 block`}>
                  Calendar ICS / Subscription URL (optional)
                </label>
                <input
                  value={icsUrl}
                  onChange={(e) => setIcsUrl(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/..."
                  className={`w-full ${cardBg} border rounded-xl px-4 py-3 text-sm ${text} placeholder:${sub} outline-none focus:border-purple-500/50 transition`}
                />
              </div>
            )}

            {/* External link */}
            {selected.actionUrl && (
              <a
                href={selected.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 text-sm ${sub} mb-6 hover:text-purple-400 transition`}
              >
                <ExternalLink className="w-4 h-4" />
                {selected.actionLabel}
              </a>
            )}

            {/* Connect button */}
            <button
              onClick={handleConnect}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition active:scale-95"
              style={{ backgroundColor: selected.color }}
            >
              Connect {selected.name}
            </button>
          </div>
        )}

        {/* Success state */}
        {connected && (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
            <p className={`text-lg font-semibold ${text}`}>Connected!</p>
            <p className={`text-sm ${sub} mt-1`}>{selected?.name} has been linked</p>
            <p className={`text-xs ${sub} mt-4`}>Redirecting to calendar...</p>
          </div>
        )}
      </div>
    </div>
  );
}