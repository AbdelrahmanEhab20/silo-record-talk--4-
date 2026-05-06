import React, { useState } from "react";
import { X, ChevronRight, Smartphone, Chrome, Mail, CheckCircle, ExternalLink } from "lucide-react";
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

export default function CalendarConnectWizard({ open, onClose, connectedProviders = [], onConnect }) {
  const { isDark } = useTheme();
  const [selected, setSelected] = useState(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [connected, setConnected] = useState(false);

  const bg = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-[#A1A1A6]" : "text-gray-500";
  const border = isDark ? "border-white/10" : "border-gray-200";
  const cardBg = isDark ? "bg-white/5" : "bg-gray-50";

  if (!open) return null;

  const handleConnect = () => {
    if (selected) {
      onConnect && onConnect(selected.id, icsUrl);
      setConnected(true);
      setTimeout(() => {
        setConnected(false);
        setSelected(null);
        setIcsUrl("");
        onClose();
      }, 1500);
    }
  };

  const handleBack = () => {
    setSelected(null);
    setIcsUrl("");
    setConnected(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className={`relative w-full max-w-lg ${bg} rounded-t-3xl px-4 sm:px-5 pt-4 sm:pt-5 pb-8 sm:pb-10 overflow-y-auto flex flex-col`} style={{ maxHeight: '95vh', minHeight: 'auto', maxHeight: 'calc(95vh - 20px)' }}>
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3 sm:mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {selected && (
              <button onClick={handleBack} className={`${sub} hover:${text} transition mr-1 shrink-0`}>
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            <h2 className={`text-base sm:text-lg font-semibold ${text} truncate`}>
              {selected ? selected.name : "Connect Calendar"}
            </h2>
          </div>
          <button onClick={onClose} className={`${sub} hover:${text} transition shrink-0 ml-2`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider List */}
        {!selected && (
          <div className="space-y-2 sm:space-y-3 overflow-y-auto flex-1">
            <p className={`text-xs sm:text-sm ${sub} mb-3 sm:mb-4`}>Choose a calendar to sync</p>
            {PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              const isConnected = connectedProviders.includes(provider.id);
              return (
                <button
                   key={provider.id}
                   onClick={() => setSelected(provider)}
                   className={`w-full ${cardBg} border ${border} rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 text-left hover:opacity-80 transition active:scale-98`}
                 >
                   <div
                     className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ backgroundColor: `${provider.color}20` }}
                   >
                     <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: provider.color }} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className={`text-sm sm:font-semibold font-medium ${text}`}>{provider.name}</p>
                     <p className={`text-xs ${sub} mt-0.5 line-clamp-1`}>{provider.description}</p>
                   </div>
                  {isConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className={`w-5 h-5 ${sub} flex-shrink-0`} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Provider Detail / Steps */}
        {selected && !connected && (
          <div className="flex flex-col overflow-y-auto flex-1">
            {/* Provider icon */}
            <div className="flex justify-center mb-4 sm:mb-6 shrink-0">
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${selected.color}20` }}
              >
                <selected.icon className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: selected.color }} />
              </div>
            </div>

            {/* Steps */}
            <div className={`${cardBg} border ${border} rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4`}>
              <p className={`text-xs font-semibold ${sub} uppercase tracking-wider mb-2 sm:mb-3`}>Steps</p>
              <div className="space-y-2 sm:space-y-3">
                {selected.steps.map((step, i) => (
                   <div key={i} className="flex items-start gap-2 sm:gap-3">
                     <div
                       className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                       style={{ backgroundColor: `${selected.color}30`, color: selected.color }}
                     >
                       {i + 1}
                     </div>
                     <p className={`text-xs sm:text-sm ${text}`}>{step}</p>
                   </div>
                 ))}
              </div>
            </div>

            {/* ICS URL input for Google/Outlook */}
            {selected.id !== "device" && (
              <div className="mb-3 sm:mb-4">
                <label className={`text-xs font-semibold ${sub} uppercase tracking-wider mb-1.5 sm:mb-2 block`}>
                  ICS URL (optional)
                </label>
                <input
                   value={icsUrl}
                   onChange={(e) => setIcsUrl(e.target.value)}
                   placeholder="https://calendar.google.com/..."
                   className={`w-full ${cardBg} border ${border} rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${text} placeholder:${sub} outline-none focus:border-purple-500/50 transition`}
                />
              </div>
            )}

            {/* External link */}
            {selected.actionUrl && (
              <a
                href={selected.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 text-xs sm:text-sm ${sub} mb-3 sm:mb-4 hover:text-purple-400 transition`}
              >
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {selected.actionLabel}
              </a>
            )}

            {/* Connect button */}
            <button
              onClick={handleConnect}
              className="w-full py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl text-white font-semibold text-sm transition active:scale-95 shrink-0 mt-auto"
              style={{ backgroundColor: selected.color }}
            >
              Connect {selected.name}
            </button>
          </div>
        )}

        {/* Success state */}
        {connected && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mb-3 sm:mb-4" />
            <p className={`text-base sm:text-lg font-semibold ${text}`}>Connected!</p>
            <p className={`text-xs sm:text-sm ${sub} mt-1`}>{selected?.name} linked</p>
          </div>
        )}
      </div>
    </div>
  );
}