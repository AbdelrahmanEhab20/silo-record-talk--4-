import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { adminApi } from "@/api/adminApi";
import { Loader2 } from "lucide-react";

function formatMinutes(m) {
  const mins = Math.max(0, Math.round(m));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const r = mins % 60;
    return r > 0 ? `${h}h ${r}m` : `${h}h`;
  }
  return `${mins} min`;
}

export default function OrgUsage() {
  const { isDark } = useTheme();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/40" : "text-gray-500";

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.usageSummary();
        setSummary(res);
      } catch (e) {
        setError(e.message || "Failed to load usage");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className={`w-8 h-8 animate-spin ${sub}`} />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${card}`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${sub}`}>Current month</p>
        <p className={`text-4xl font-bold ${text}`}>{formatMinutes(summary?.org_total_minutes || 0)}</p>
        <p className={`text-sm mt-1 ${sub}`}>Total recording minutes across all users</p>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`px-5 py-4 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
          <h2 className={`text-sm font-semibold ${text}`}>Per user</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={isDark ? "bg-white/5" : "bg-gray-50"}>
              <tr>
                <th className={`text-left px-4 py-3 font-medium ${sub}`}>User</th>
                <th className={`text-left px-4 py-3 font-medium ${sub}`}>Role</th>
                <th className={`text-right px-4 py-3 font-medium ${sub}`}>Minutes</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.users || []).map((u) => (
                <tr key={u.email} className={isDark ? "border-t border-white/5" : "border-t border-gray-100"}>
                  <td className={`px-4 py-3 ${text}`}>
                    <div>{u.email}</div>
                    {u.full_name && <div className={`text-xs ${sub}`}>{u.full_name}</div>}
                  </td>
                  <td className={`px-4 py-3 capitalize ${sub}`}>{u.role}</td>
                  <td className={`px-4 py-3 text-right font-medium ${text}`}>
                    {formatMinutes(u.minutes_this_month)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
