import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { adminApi } from "@/api/adminApi";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { siloConfirm } from "@/lib/siloAlert";
import RoleBadge from "@/components/admin/RoleBadge";

export default function OrgInvites() {
  const { isDark } = useTheme();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/40" : "text-gray-500";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listInvites();
      setInvites(res.invites || []);
    } catch (e) {
      setMsg(e.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResend = async (id) => {
    try {
      const res = await adminApi.resendInvite(id);
      if (res.email_sent) {
        setMsg(res.message || "Invitation email resent.");
      } else if (res.invite_url) {
        setMsg(`${res.message || "Email failed."} Dev link: ${res.invite_url}`);
      } else {
        setMsg(res.message || res.email_error || "Invite renewed.");
      }
      load();
    } catch (e) {
      setMsg(e.message || "Resend failed");
    }
  };

  const handleRevoke = async (id) => {
    const ok = await siloConfirm({
      title: "Revoke invitation?",
      text: "The invite link will no longer work.",
      confirmText: "Revoke",
      icon: "warning",
      danger: true,
    });
    if (!ok) return;
    try {
      await adminApi.revokeInvite(id);
      load();
    } catch (e) {
      setMsg(e.message || "Revoke failed");
    }
  };

  return (
    <div className="space-y-4">
      <p className={`text-xs ${sub}`}>
        Pending invitations. Resend sends a new email with a fresh link (valid 7 days).
      </p>
      {msg && <p className={`text-xs break-all ${sub}`}>{msg}</p>}

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className={`w-8 h-8 animate-spin ${sub}`} />
          </div>
        ) : invites.length === 0 ? (
          <p className={`text-center py-12 text-sm ${sub}`}>No pending invites.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/5">
            {invites.map((inv) => (
              <li key={inv.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${text}`}>{inv.email}</p>
                  <p className={`text-xs ${sub} flex flex-wrap items-center gap-2 mt-1`}>
                    <RoleBadge role={inv.role} />
                    <span>invited by {inv.invited_by}</span>
                    <span>· expires{" "}
                    {new Date(inv.expires_at).toLocaleDateString()}
                    {inv.expired && " (expired)"}</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResend(inv.id)}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border ${isDark ? "border-white/10" : "border-gray-200"}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(inv.id)}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-red-500 border border-red-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
