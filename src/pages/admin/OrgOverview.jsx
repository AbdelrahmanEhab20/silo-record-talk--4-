import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/lib/ThemeContext";
import { adminApi } from "@/api/adminApi";
import { isSystemAdmin } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";
import { Users, UserPlus, Clock, Shield, Loader2 } from "lucide-react";

export default function OrgOverview() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/40" : "text-gray-500";

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, invitesRes, usageRes] = await Promise.all([
          adminApi.listUsers(),
          adminApi.listInvites(),
          adminApi.usageSummary(),
        ]);
        const users = usersRes.users || [];
        setStats({
          total: users.length,
          active: users.filter((u) => u.status === "active").length,
          invited: users.filter((u) => u.status === "invited").length,
          disabled: users.filter((u) => u.status === "disabled").length,
          pendingInvites: (invitesRes.invites || []).length,
          orgMinutes: usageRes.org_total_minutes || 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${sub}`} />
      </div>
    );
  }

  const tiles = [
    { label: "Total users", value: stats?.total ?? 0, icon: Users, to: "/admin/org/users" },
    { label: "Active", value: stats?.active ?? 0, icon: Users, to: "/admin/org/users" },
    { label: "Awaiting accept", value: stats?.invited ?? 0, icon: UserPlus, to: "/admin/org/users" },
    { label: "Pending invites", value: stats?.pendingInvites ?? 0, icon: Shield, to: "/admin/org/invites" },
    { label: "Disabled", value: stats?.disabled ?? 0, icon: Users, to: "/admin/org/users" },
    { label: "Org minutes (mo)", value: Math.round(stats?.orgMinutes ?? 0), icon: Clock, to: "/admin/org/usage" },
  ];

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h2 className={`text-sm font-semibold ${text} mb-1`}>
          {isSystemAdmin(user) ? "System administrator" : "Organization administrator"}
        </h2>
        <p className={`text-xs leading-relaxed ${sub}`}>
          Add users by email, assign roles (member, org admin
          {isSystemAdmin(user) ? ", system admin" : ""}), monitor account status (invited → active →
          disabled), resend invitations, and view usage per user.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map(({ label, value, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className={`rounded-2xl border p-4 transition-opacity hover:opacity-90 ${card}`}
          >
            <Icon className={`w-4 h-4 mb-2 ${sub}`} />
            <p className={`text-2xl font-bold ${text}`}>{value}</p>
            <p className={`text-xs mt-1 ${sub}`}>{label}</p>
          </Link>
        ))}
      </div>

      <div className={`rounded-2xl border p-5 flex flex-wrap gap-3 ${card}`}>
        <Link
          to="/admin/org/users"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Invite user
        </Link>
        <Link
          to="/admin/org/invites"
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${isDark ? "border-white/10 text-white" : "border-gray-200 text-gray-800"}`}
        >
          <Shield className="w-4 h-4" />
          View invitations
        </Link>
        {isSystemAdmin(user) && (
          <Link
            to="/admin/platform"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${isDark ? "border-white/10 text-white" : "border-gray-200 text-gray-800"}`}
          >
            Platform settings
          </Link>
        )}
      </div>
    </div>
  );
}
