import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { CalendarDays, Eye, EyeOff, Loader2, LogOut, Plus } from "lucide-react";

const PROVIDERS = [
  {
    id: "google",
    name: "Google Calendar",
    color: "#4285F4",
    accent: "linear-gradient(135deg,#4285F4,#34A853)",
    popupSource: "silo-google-oauth",
    client: appClient.googleCalendar,
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    color: "#0078D4",
    accent: "linear-gradient(135deg,#0078D4,#106EBE)",
    popupSource: "silo-microsoft-oauth",
    client: appClient.outlookCalendar,
  },
];

function openOauthPopup({ url, source, onComplete }) {
  const popup = window.open(url, source, "width=520,height=680");

  const handleMessage = (event) => {
    if (event.data?.source !== source) return;
    cleanup();
    try { popup?.close(); } catch {}
    onComplete?.(event.data.status === "success");
  };

  const timer = setInterval(() => {
    if (!popup || popup.closed) {
      cleanup();
      onComplete?.(true);
    }
  }, 500);

  function cleanup() {
    window.removeEventListener("message", handleMessage);
    clearInterval(timer);
  }
  window.addEventListener("message", handleMessage);
}

function ProviderRow({
  provider,
  state,
  isDark,
  onConnect,
  onDisconnect,
  onToggleVisible,
  visible,
  busy,
}) {
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/50" : "text-gray-500";
  const rowBg = isDark
    ? "bg-white/4 border-white/8 hover:bg-white/6"
    : "bg-gray-50 border-gray-100 hover:bg-gray-100";

  const { connected, email, loading } = state;

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${rowBg}`}>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${provider.color}20` }}
      >
        <CalendarDays className="w-4 h-4" style={{ color: provider.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${text}`}>{provider.name}</p>
        {loading ? (
          <p className={`text-[11px] ${sub}`}>Checking connection…</p>
        ) : connected ? (
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block shrink-0" />
            <span className="text-[11px] text-green-400 font-medium shrink-0">Connected</span>
            {email && (
              <span className={`text-[11px] truncate ${sub}`} title={email}>
                · {email}
              </span>
            )}
          </div>
        ) : (
          <p className={`text-[11px] ${sub}`}>Not connected</p>
        )}
      </div>

      {!loading && (
        connected ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleVisible}
              title={visible ? "Hide this calendar's events" : "Show this calendar's events"}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark
                  ? "border-white/10 text-white/60 hover:bg-white/8"
                  : "border-gray-200 text-gray-500 hover:bg-gray-200"
              } ${!visible ? "opacity-60" : ""}`}
            >
              {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={busy}
              className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                isDark
                  ? "border-white/10 text-white/70 hover:bg-white/8"
                  : "border-gray-200 text-gray-600 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={busy}
            className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: provider.accent }}
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Connect
          </button>
        )
      )}
    </div>
  );
}

/**
 * Owns the OAuth popup flow for both providers. Parent provides the per-
 * provider state (connected / email / loading) and refetch callbacks; this
 * component manages connecting & disconnecting.
 */
export default function CalendarProvidersPanel({
  google,
  outlook,
  visible = { google: true, outlook: true },
  onToggleVisible,
  onGoogleChanged,
  onOutlookChanged,
}) {
  const { isDark } = useTheme();
  const [busyId, setBusyId] = useState(null);
  const cardBg = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";

  const bothConnected = google.connected && outlook.connected;

  const handleConnect = async (provider, onChanged) => {
    setBusyId(provider.id);
    try {
      const { url } = await provider.client.getAuthUrl(window.location.href);
      if (!url) throw new Error("No auth URL returned");
      openOauthPopup({
        url,
        source: provider.popupSource,
        onComplete: async () => {
          await onChanged?.();
          setBusyId(null);
        },
      });
    } catch (err) {
      console.error(`${provider.id} connect failed:`, err);
      alert(err.message || "Failed to start connection");
      setBusyId(null);
    }
  };

  const handleDisconnect = async (provider, onChanged) => {
    setBusyId(provider.id);
    try {
      await provider.client.disconnect();
    } catch (err) {
      console.error(`${provider.id} disconnect failed:`, err);
    }
    await onChanged?.();
    setBusyId(null);
  };

  return (
    <div className={`rounded-2xl border p-4 ${cardBg}`}>
      <div className="flex items-baseline justify-between mb-3">
        <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
          Calendar integrations
        </p>
        <p className={`text-[11px] ${isDark ? "text-white/40" : "text-gray-400"}`}>
          Sync events and push action items
        </p>
      </div>
      <div className="space-y-2">
        <ProviderRow
          provider={PROVIDERS[0]}
          state={google}
          visible={visible.google !== false}
          isDark={isDark}
          busy={busyId === "google"}
          onConnect={() => handleConnect(PROVIDERS[0], onGoogleChanged)}
          onDisconnect={() => handleDisconnect(PROVIDERS[0], onGoogleChanged)}
          onToggleVisible={() => onToggleVisible?.("google")}
        />
        <ProviderRow
          provider={PROVIDERS[1]}
          state={outlook}
          visible={visible.outlook !== false}
          isDark={isDark}
          busy={busyId === "outlook"}
          onConnect={() => handleConnect(PROVIDERS[1], onOutlookChanged)}
          onDisconnect={() => handleDisconnect(PROVIDERS[1], onOutlookChanged)}
          onToggleVisible={() => onToggleVisible?.("outlook")}
        />
      </div>
      {bothConnected && (
        <p className={`text-[10px] mt-3 ${isDark ? "text-white/40" : "text-gray-400"}`}>
          Events found on both calendars are shown once with a combined "On Google + Outlook" tag.
          Use the eye icon to hide one without disconnecting.
        </p>
      )}
    </div>
  );
}
