import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { adminApi } from "@/api/adminApi";
import { isSystemAdmin } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { UserPlus, Loader2 } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "org_admin", label: "Org admin" },
];

export default function OrgUsers() {
  const { isDark } = useTheme();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/40" : "text-gray-500";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listUsers();
      setUsers(res.users || []);
    } catch (e) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg("");
    try {
      const res = await adminApi.inviteUser({ email: inviteEmail.trim(), role: inviteRole });
      if (res.email_sent) {
        setInviteMsg(res.message || `Invitation email sent to ${inviteEmail.trim()}.`);
      } else if (res.invite_url) {
        setInviteMsg(`${res.message || "Email failed."} Dev link: ${res.invite_url}`);
      } else {
        setInviteMsg(res.message || res.email_error || "Invite created.");
      }
      setInviteEmail("");
      load();
    } catch (err) {
      setInviteMsg(err.message || "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await adminApi.patchUser(id, { role });
      load();
    } catch (e) {
      alert(e.message || "Update failed");
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!window.confirm(`Set user status to ${status}?`)) return;
    try {
      await adminApi.patchUser(id, { status });
      load();
    } catch (e) {
      alert(e.message || "Update failed");
    }
  };

  const roleOptions = isSystemAdmin(currentUser)
    ? [...ROLE_OPTIONS, { value: "system_admin", label: "System admin" }]
    : ROLE_OPTIONS;

  return (
    <div className="space-y-6">
      <form onSubmit={handleInvite} className={`rounded-2xl border p-5 space-y-4 ${card}`}>
        <h2 className={`text-sm font-semibold ${text}`}>Invite user</h2>
        <p className={`text-xs ${sub}`}>
          An invitation email is sent automatically. If delivery fails, a dev link may appear below.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            placeholder="email@organization.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm ${isDark ? "bg-black/40 border-white/10 text-white" : "bg-gray-50 border-gray-200"}`}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-sm ${isDark ? "bg-black/40 border-white/10 text-white" : "bg-gray-50 border-gray-200"}`}
          >
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Invite
          </button>
        </div>
        {inviteMsg && <p className={`text-xs break-all ${sub}`}>{inviteMsg}</p>}
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`px-5 py-4 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
          <h2 className={`text-sm font-semibold ${text}`}>All users</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className={`w-8 h-8 animate-spin ${sub}`} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={isDark ? "bg-white/5" : "bg-gray-50"}>
                <tr>
                  <th className={`text-left px-4 py-3 font-medium ${sub}`}>Email</th>
                  <th className={`text-left px-4 py-3 font-medium ${sub}`}>Role</th>
                  <th className={`text-left px-4 py-3 font-medium ${sub}`}>Status</th>
                  <th className={`text-right px-4 py-3 font-medium ${sub}`}>Min/mo</th>
                  <th className={`text-right px-4 py-3 font-medium ${sub}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={isDark ? "border-t border-white/5" : "border-t border-gray-100"}>
                    <td className={`px-4 py-3 ${text}`}>
                      <div>{u.email}</div>
                      {u.full_name && <div className={`text-xs ${sub}`}>{u.full_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={u.role === "system_admin" && !isSystemAdmin(currentUser)}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`text-xs rounded-lg border px-2 py-1 ${isDark ? "bg-black/40 border-white/10 text-white" : "border-gray-200"}`}
                      >
                        {roleOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                        {u.role === "system_admin" && isSystemAdmin(currentUser) && (
                          <option value="system_admin">System admin</option>
                        )}
                      </select>
                    </td>
                    <td className={`px-4 py-3 capitalize ${sub}`}>{u.status}</td>
                    <td className={`px-4 py-3 text-right ${text}`}>{u.minutes_this_month}</td>
                    <td className="px-4 py-3 text-right">
                      {u.status !== "disabled" && u.id !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(u.id, "disabled")}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Disable
                        </button>
                      )}
                      {u.status === "disabled" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(u.id, "active")}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Enable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className={`text-center py-8 text-sm ${sub}`}>No users yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
