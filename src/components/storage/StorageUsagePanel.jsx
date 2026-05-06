import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Archive, HardDrive, Loader2, ArchiveRestore, ChevronDown } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function StorageUsagePanel() {
  const { isDark } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivingId, setArchivingId] = useState(null);
  const [activeSessionsOpen, setActiveSessionsOpen] = useState(false);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const sub = isDark ? "text-white/40" : "text-gray-400";
  const text = isDark ? "text-white" : "text-gray-900";

  useEffect(() => {
    const load = async () => {
      const user = await appClient.auth.me();
      const all = await appClient.entities.Session.filter({ user_email: user.email }, "-created_date", 300);
      setSessions(all.filter(s => !s.is_subsession));
      setLoading(false);
    };
    load();
  }, []);

  const hotSessions = sessions.filter(s => !s.storage_tier || s.storage_tier === 'hot');
  const archivedSessions = sessions.filter(s => s.storage_tier === 'archived');

  // Estimate storage: avg 5MB per minute of audio
  const estimateMB = (sessionList) => {
    const totalSecs = sessionList.reduce((sum, s) => sum + (s.duration || 0), 0);
    return ((totalSecs / 60) * 5).toFixed(0);
  };

  const hotMB = estimateMB(hotSessions);
  const archivedMB = estimateMB(archivedSessions);
  const totalMB = parseInt(hotMB) + parseInt(archivedMB);
  const hotPct = totalMB > 0 ? Math.round((parseInt(hotMB) / totalMB) * 100) : 0;

  const handleArchiveNow = async (session) => {
    if (!window.confirm(`Archive "${session.title}"?\n\nIt will be moved to the Archive folder and deleted after 60 days.`)) return;
    setArchivingId(session.id);
    const now = new Date();
    const deletionAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
    await appClient.entities.Session.update(session.id, {
      storage_tier: 'archived',
      archived_at: now.toISOString(),
      scheduled_deletion_at: deletionAt,
      restore_status: 'none',
      folder: 'Archived',
    });
    setSessions(prev => prev.map(s => s.id === session.id
      ? { ...s, storage_tier: 'archived', archived_at: now.toISOString(), scheduled_deletion_at: deletionAt, folder: 'Archived' }
      : s
    ));
    setArchivingId(null);
  };

  if (loading) {
    return (
      <div className={`rounded-2xl border ${card} p-6 flex items-center justify-center`}>
        <Loader2 className={`w-5 h-5 animate-spin ${sub}`} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Storage Overview */}
      <div className={`rounded-2xl border ${card} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-purple-400" />
          <span className={`text-sm font-semibold ${text}`}>Storage Usage</span>
        </div>

        {/* Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F5' }}>
          <div className="h-full rounded-full" style={{ width: `${hotPct}%`, background: 'linear-gradient(90deg, #A855F7, #6366F1)' }} />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }} />
              <span className={`text-xs ${sub}`}>Hot — {hotMB} MB ({hotSessions.length} sessions)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className={`text-xs ${sub}`}>Archived — {archivedMB} MB ({archivedSessions.length} sessions)</span>
            </div>
          </div>
        </div>

        <div className={`text-xs px-3 py-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} ${sub}`}>
          Sessions auto-archive after 30 days of inactivity and are permanently deleted 60 days after archiving.
        </div>
      </div>


    </div>
  );
}