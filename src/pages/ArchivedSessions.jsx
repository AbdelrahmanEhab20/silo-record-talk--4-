import React, { useState, useEffect, useCallback } from "react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import { Archive, Download, ArchiveRestore, Loader2, AlertTriangle, Clock } from "lucide-react";

export default function ArchivedSessions() {
  const { isDark } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/40" : "text-gray-400";

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const load = useCallback(async () => {
    const user = await appClient.auth.me();
    const archived = await appClient.entities.Session.filter({ user_email: user.email, storage_tier: 'archived' }, '-archived_at');
    setSessions(archived.filter(s => !s.is_subsession));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for restore completions
  useEffect(() => {
    const interval = setInterval(async () => {
      const retrieving = sessions.filter(s => s.restore_status === 'retrieving');
      if (retrieving.length === 0) return;
      for (const s of retrieving) {
        const updated = await appClient.entities.Session.get(s.id);
        if (updated.restore_status === 'restored' || updated.storage_tier === 'hot') {
          setSessions(prev => prev.filter(p => p.id !== s.id));
          showToast(`✅ "${s.title}" has been restored to active sessions!`);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessions]);

  const handleRestore = async (session) => {
    setActionId(session.id);
    await appClient.entities.Session.update(session.id, {
      restore_status: 'retrieving',
      restore_requested_at: new Date().toISOString(),
    });
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, restore_status: 'retrieving' } : s));
    showToast(`🔄 Restoring "${session.title}"… you'll be notified when it's ready.`);
    setActionId(null);
  };

  const handleDownload = async (session) => {
    setDownloadingId(session.id);
    try {
      const res = await appClient.functions.invoke('downloadSessionPackage', { session_id: session.id });
      const pkg = res.data;
      if (!pkg?.success) throw new Error('Failed to get session data');

      // Build ZIP client-side using JSZip-like approach with Blob
      const files = [];

      // 1. Minutes text file
      const minutesBlob = new Blob([pkg.minutes_text], { type: 'text/plain' });
      files.push({ name: 'session_minutes.txt', blob: minutesBlob });

      // 2. Transcript text file
      if (pkg.session.transcript_text) {
        const transcriptBlob = new Blob([pkg.session.transcript_text], { type: 'text/plain' });
        files.push({ name: 'raw_transcript.txt', blob: transcriptBlob });
      }

      // 3. Session metadata JSON
      const metaBlob = new Blob([JSON.stringify(pkg.session, null, 2)], { type: 'application/json' });
      files.push({ name: 'session_metadata.json', blob: metaBlob });

      // Download each file individually (no ZIP library, keeps it simple)
      for (const f of files) {
        const url = URL.createObjectURL(f.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}_${f.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 300));
      }

      // 4. Audio file — direct download link
      if (pkg.session.audio_file_url) {
        const a = document.createElement('a');
        a.href = pkg.session.audio_file_url;
        a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}_audio`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      showToast('📥 Download started! Check your downloads folder.');
    } catch (e) {
      showToast('❌ Download failed. Please try again.');
    }
    setDownloadingId(null);
  };

  const daysUntilDeletion = (scheduledAt) => {
    if (!scheduledAt) return null;
    const diff = new Date(scheduledAt) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className={`min-h-screen ${bg} ${text} pb-32`}>
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl max-w-xs text-center"
          style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}>
          {toastMsg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-5 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
            <Archive className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Archived Sessions</h1>
            <p className={`text-sm ${sub}`}>Sessions auto-archived after 30 days of inactivity</p>
          </div>
        </div>

        {/* Info banner */}
        <div className={`rounded-2xl border px-4 py-3 mb-5 flex items-start gap-3 ${isDark ? 'bg-amber-500/8 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            Archived sessions are kept for <strong>60 days</strong> then permanently deleted. Download or restore them before they expire.
          </p>
        </div>



        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className={`w-6 h-6 animate-spin ${sub}`} />
          </div>
        ) : sessions.length === 0 ? (
          <div className={`rounded-2xl border ${card} p-10 text-center`}>
            <Archive className={`w-10 h-10 mx-auto mb-3 ${sub}`} />
            <p className={`text-sm font-medium ${text}`}>No archived sessions</p>
            <p className={`text-xs mt-1 ${sub}`}>Sessions inactive for 30+ days will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => {
              const days = daysUntilDeletion(session.scheduled_deletion_at);
              const isRetrieving = session.restore_status === 'retrieving';
              const isUrgent = days !== null && days <= 7;

              return (
                <div key={session.id} className={`rounded-2xl border ${card} overflow-hidden`}>
                  <div className="p-4">
                    {/* Title + deletion badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className={`text-sm font-semibold leading-snug flex-1 ${text}`}>{session.title}</p>
                      {days !== null && (
                        <span className={`text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 ${isUrgent ? 'bg-red-500/15 text-red-400' : isDark ? 'bg-white/8 text-white/40' : 'bg-gray-100 text-gray-400'}`}>
                          {days === 0 ? 'Deletes today' : `${days}d left`}
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className={`flex items-center gap-3 text-xs ${sub} mb-3`}>
                      <span>{session.created_date ? new Date(session.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      {session.duration && <span>·</span>}
                      {session.duration && <span>{Math.round(session.duration / 60)} min</span>}
                      {session.archived_at && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Archived {new Date(session.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Restore status badge */}
                    {isRetrieving && (
                      <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.1)' }}>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        <span className="text-xs text-purple-400 font-medium">Retrieving… audio will be ready shortly</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(session)}
                        disabled={downloadingId === session.id}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${isDark ? 'bg-white/8 text-white/70 hover:bg-white/14' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {downloadingId === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {downloadingId === session.id ? 'Downloading…' : 'Download'}
                      </button>
                      <button
                        onClick={() => handleRestore(session)}
                        disabled={!!actionId || isRetrieving}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}
                      >
                        {actionId === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                        {isRetrieving ? 'Retrieving…' : 'Restore'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}