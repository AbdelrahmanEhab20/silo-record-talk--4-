import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Mic, Check, Trash2, Flag, Loader2, Archive, Link2, Upload, Image, Type } from "lucide-react";
import FolderBadge from "@/components/FolderBadge";
import { format, isValid } from "date-fns";
import { appClient } from "@/api/appClient";
import { useQueryClient } from "@tanstack/react-query";
import { SESSION_TYPES } from "@/lib/sessionTypes";

export default function SessionCard({ session, selecting, selected, onToggleSelect, allFolders = [] }) {
  const { isDark } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const [flagging, setFlagging] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (archiving) return;
    setArchiving(true);
    const now = new Date().toISOString();
    const deletionAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    await appClient.entities.Session.update(session.id, {
      storage_tier: 'archived',
      archived_at: now,
      scheduled_deletion_at: deletionAt,
    });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    setArchiving(false);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await appClient.entities.Session.delete(session.id);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete session');
    } finally {
      setDeleting(false);
    }
  };

  const handleFlag = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (flagging) return;
    setFlagging(true);
    await appClient.entities.Session.update(session.id, { is_flagged: !session.is_flagged });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    setFlagging(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getPreview = () => {
    if (session.summary_text) {
      let text = session.summary_text.trim();
      try {
        const parsed = JSON.parse(text);
        const candidate =
          parsed?.executive_summary ||
          parsed?.executivesummary ||
          parsed?.summary ||
          (Array.isArray(parsed?.discussions) && parsed.discussions[0]?.summary) ||
          Object.values(parsed).find((v) => typeof v === "string" && v.length > 10);
        if (candidate) return candidate.slice(0, 120);
      } catch {}
      return text.replace(/[{}"]|"?\w+"?\s*:/g, "").replace(/[#*_\[\]`]/g, "").trim().slice(0, 120);
    }
    if (session.transcript_text) {
      return session.transcript_text.replace(/\[\d+:\d+(?::\d+)?\]/g, "").trim().slice(0, 120);
    }
    return null;
  };

  // Detect session source
  const getSourceBadge = () => {
    const src = session.source;
    if (src === 'recording') return { icon: Mic, label: "Recording", color: 'purple' };
    if (src === 'audio_upload') return { icon: Upload, label: "Audio Upload", color: 'green' };
    if (src === 'video_url') return { icon: Link2, label: "Video URL", color: 'blue' };
    if (src === 'text') return { icon: Type, label: "Text", color: 'orange' };
    if (src === 'images') return { icon: Image, label: "Images", color: 'pink' };
    // Fallback: infer from data
    if (session.video_url) return { icon: Link2, label: "Video URL", color: 'blue' };
    if (session.image_urls?.length > 0) return { icon: Image, label: "Images", color: 'pink' };
    if (session.audio_file_url) return { icon: Upload, label: "Audio Upload", color: 'green' };
    if (session.general_context_text) return { icon: Type, label: "Text", color: 'orange' };
    return { icon: Mic, label: "Recording", color: 'purple' };
  };

  const getSourceColor = (color) => {
    const colors = {
      blue: isDark ? 'bg-blue-500/15 text-blue-300 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
      green: isDark ? 'bg-green-500/15 text-green-300 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200',
      pink: isDark ? 'bg-pink-500/15 text-pink-300 border-pink-500/20' : 'bg-pink-50 text-pink-700 border-pink-200',
      orange: isDark ? 'bg-orange-500/15 text-orange-300 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200',
      purple: isDark ? 'bg-purple-500/15 text-purple-300 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return colors[color] || colors.purple;
  };

  const preview = getPreview();
  const source = getSourceBadge();
  const SourceIcon = source.icon;

  const cardContent = (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden w-full ${
        selected
          ? 'border-purple-500/60 bg-purple-500/10'
          : isDark
          ? 'border-white/8 bg-white/5 hover:bg-white/8'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
      onClick={selecting ? () => onToggleSelect(session.id) : undefined}
    >
      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Checkbox or Icon */}
          {selecting ? (
            <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 bg-purple-500 border-purple-500">
              <Check className="w-3 h-3 text-white" />
            </div>
          ) : (
            <Mic className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-white/25' : 'text-gray-400'}`} />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className={`text-[14px] font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {session.title}
              </h3>
              {(session.processing_status === 'pending' || session.processing_status === 'processing') && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20 shrink-0">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Processing…
                </span>
              )}
            </div>
            {preview && (
              <p className={`text-xs line-clamp-2 mb-2 leading-relaxed ${isDark ? 'text-[#A1A1A6]' : 'text-gray-500'}`}>
                {preview}
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-[11px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                {(() => { const d = session.created_date ? new Date(session.created_date.endsWith('Z') ? session.created_date : session.created_date + 'Z') : null; return d && isValid(d) ? format(d, "MMM d, yyyy") : ""; })()}
              </span>
              {(() => {
                if (!session.created_date) return null;
                const start = new Date(session.created_date.endsWith('Z') ? session.created_date : session.created_date + 'Z');
                if (isNaN(start.getTime())) return null;
                const startStr = format(start, "HH:mm");
                if (session.duration) {
                  const end = new Date(start.getTime() + session.duration * 1000);
                  const endStr = format(end, "HH:mm");
                  return (
                    <span className={`text-[11px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                      {startStr} – {endStr}
                    </span>
                  );
                }
                return (
                  <span className={`text-[11px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                    {startStr}
                  </span>
                );
              })()}
              {formatDuration(session.duration) && (
                <>
                  <span className={`text-[10px] ${isDark ? 'text-white/15' : 'text-gray-300'}`}>·</span>
                  <span className={`text-[11px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>{formatDuration(session.duration)}</span>
                </>
              )}
              {/* Source Badge */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${getSourceColor(source.color)}`}>
                <SourceIcon className="w-3 h-3" />
                {source.label}
              </span>
              {session.dialect_label && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {session.dialect_label}
                </span>
              )}
              {session.session_type && SESSION_TYPES[session.session_type] && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${SESSION_TYPES[session.session_type].bg} ${SESSION_TYPES[session.session_type].text} ${SESSION_TYPES[session.session_type].border}`}>
                  {SESSION_TYPES[session.session_type].icon} {session.session_type}
                </span>
              )}
              {!selecting && (
                <>
                  <FolderBadge session={session} allFolders={allFolders} />
                  <button
                    onClick={handleArchive}
                    disabled={archiving}
                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${isDark ? 'border-white/10 text-white/30 hover:border-purple-500/40 hover:text-purple-400 hover:bg-purple-500/10' : 'border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'}`}
                    title="Archive session"
                  >
                    {archiving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Archive className="w-2.5 h-2.5" />}
                    Archive
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!selecting && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={handleFlag}
              disabled={flagging}
              className={`p-2.5 rounded-lg active:scale-95 transition-all disabled:opacity-50 ${
                session.is_flagged
                  ? 'text-amber-400 hover:text-amber-300 active:bg-amber-500/10'
                  : isDark ? 'text-white/20 hover:text-amber-400 active:text-amber-400 active:bg-amber-500/10' : 'text-gray-300 hover:text-amber-500 active:text-amber-600 active:bg-amber-50'
              }`}
              title={session.is_flagged ? "Remove flag" : "Flag session"}
            >
              <Flag className={`w-4 h-4 ${session.is_flagged ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`p-2.5 rounded-lg active:scale-95 transition-all ${
                deleting
                  ? isDark ? 'text-red-400/50 cursor-wait' : 'text-red-400/50 cursor-wait'
                  : isDark ? 'text-white/20 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 active:text-red-400' : 'text-gray-300 hover:text-red-600 hover:bg-red-50 active:bg-red-100 active:text-red-700'
              }`}
              title="Delete session"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (selecting) return cardContent;

  return (
    <Link to={`/SessionDetail?id=${session.id}`} className="block w-full">
      {cardContent}
    </Link>
  );
}