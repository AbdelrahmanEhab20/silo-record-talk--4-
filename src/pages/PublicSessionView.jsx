import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import StructuredMinutes from "@/components/session/StructuredMinutes";
import TagPills from "@/components/session/TagPills";
import PoweredBy from "@/components/PoweredBy";
import { SESSION_TYPES } from "@/lib/sessionTypes";
import {
  parseSegments,
  timestampToSeconds,
  transcriptSpanSeconds,
  isTruncatedPreview,
} from "@/lib/transcript";

async function resolveTranscript(session) {
  const inline = (session?.transcript_text || "").trim();
  const fileUrl = session?.transcript_file_url;
  if (fileUrl && (!inline || isTruncatedPreview(inline))) {
    try {
      const res = await fetch(fileUrl);
      if (res.ok) {
        const full = (await res.text()).trim();
        if (full) return full;
      }
    } catch (e) { /* fallback to inline */ }
  }
  return inline;
}

async function buildMergedTranscript(parentSession, subsessions) {
  if (subsessions && subsessions.length > 0) {
    const sorted = [...subsessions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const parts = await Promise.all(
      sorted.map(async (sub, idx) => {
        const text = await resolveTranscript(sub);
        return text ? `[Part ${idx + 1}]\n${text}` : `[Part ${idx + 1}]`;
      })
    );
    return parts.join("\n\n");
  }
  return resolveTranscript(parentSession);
}

// ── Speaker badge colours (cycles) — read-only / lighter palette ────────────
const SPEAKER_COLORS = [
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "bg-green-500/20 text-green-300 border-green-500/30",
  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
];

export default function PublicSessionView() {
  const navigate = useNavigate();
  const { code: shareCode } = useParams();
  const { isDark } = useTheme();
  const { appPublicSettings } = useAuth();
  const brandAppName = appPublicSettings?.public_settings?.app_name || "Silo";
  const [mergedTranscript, setMergedTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [loadedMinutes, setLoadedMinutes] = useState(10);

  // Fetch share record
  const { data: share, isLoading: shareLoading, error: shareError } = useQuery({
    queryKey: ["publicShare", shareCode],
    queryFn: async () => {
      if (!shareCode) return null;
      const results = await appClient.entities.PublicSessionShare.filter({ share_code: shareCode });
      return results[0] || null;
    },
    enabled: !!shareCode,
  });

  // Fetch session data
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["publicSession", share?.session_id],
    queryFn: () => appClient.entities.Session.get(share.session_id),
    enabled: !!share,
  });

  // Fetch subsessions
  const { data: subsessions = [] } = useQuery({
    queryKey: ["publicSubsessions", session?.id],
    queryFn: () => appClient.entities.Session.filter({ parent_session_id: session.id, is_subsession: true }),
    enabled: !!session?.id,
  });

  // Increment access count once
  useEffect(() => {
    if (share?.id) {
      appClient.entities.PublicSessionShare.update(share.id, {
        access_count: (share.access_count || 0) + 1,
      });
    }
  }, [share?.id]);

  // Build merged transcript when session + subsessions are ready
  useEffect(() => {
    if (!session) return;
    setTranscriptLoading(true);
    buildMergedTranscript(session, subsessions).then(text => {
      setMergedTranscript(text || null);
      setTranscriptLoading(false);
    });
  }, [session?.id, subsessions.length]);

  // Set page title & meta tags
  useEffect(() => {
    if (!session) return;
    const title = `Session Details: ${session.title}`;
    document.title = title;

    const setMeta = (property, content, isName = false) => {
      const attr = isName ? "name" : "property";
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const description = `Shared meeting notes for: ${session.title}`;
    const url = `https://siloainotes.com/share/${shareCode}`;

    setMeta("og:title", title);
    setMeta("og:description", description);
    setMeta("og:url", url);
    setMeta("og:type", "article");
    setMeta("twitter:card", "summary", true);
    setMeta("twitter:title", title, true);
    setMeta("twitter:description", description, true);
    setMeta("description", description, true);

    return () => {
      document.title = brandAppName;
    };
  }, [session?.title, shareCode, brandAppName]);

  // ── Parse merged transcript into segments for paginated render ────────────
  const transcriptSegments = useMemo(() => parseSegments(mergedTranscript), [mergedTranscript]);
  const transcriptSpanSec = useMemo(
    () => transcriptSpanSeconds(transcriptSegments),
    [transcriptSegments]
  );
  const visibleTranscriptSegments = useMemo(() => {
    const cutoff = loadedMinutes * 60;
    if (transcriptSpanSec <= cutoff) return transcriptSegments;
    return transcriptSegments.filter((s) => {
      if (s.isPartHeader) return true;
      if (!s.timestamp) return true;
      return timestampToSeconds(s.timestamp) < cutoff;
    });
  }, [transcriptSegments, loadedMinutes, transcriptSpanSec]);
  const hasMoreTranscript = transcriptSpanSec > loadedMinutes * 60;
  const totalTranscriptMinutes = Math.ceil(transcriptSpanSec / 60);

  // Speaker color cycle (computed against the *full* segment list so colors
  // stay stable as the user loads more 10-minute chunks).
  const speakerColors = useMemo(() => {
    const map = {};
    let idx = 0;
    for (const s of transcriptSegments) {
      if (s.speaker && !(s.speaker in map)) {
        map[s.speaker] = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
        idx += 1;
      }
    }
    return map;
  }, [transcriptSegments]);

  // Reset pagination when a new merged transcript arrives (e.g. user opens a
  // different share link).
  useEffect(() => {
    setLoadedMinutes(10);
  }, [mergedTranscript]);

  const isLoading = shareLoading || sessionLoading;

  let parsedSummary = null;
  if (session?.summary_text) {
    try {
      parsedSummary = typeof session.summary_text === "string" ? JSON.parse(session.summary_text) : session.summary_text;
    } catch (e) {
      parsedSummary = null;
    }
  }

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/60" : "text-gray-600";

  if (isLoading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-white/20" : "text-gray-300"}`} />
      </div>
    );
  }

  if (shareError || !share) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
        <div className={`rounded-2xl border ${card} ${border} p-8 max-w-md w-full text-center`}>
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-white/20" : "text-gray-300"}`} />
          <h2 className={`text-lg font-semibold mb-2 ${textMain}`}>Share not found</h2>
          <p className={`text-sm ${textSub} mb-6`}>This share link is invalid or has been revoked.</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-500 hover:bg-purple-600">
            Go home
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
        <div className={`rounded-2xl border ${card} ${border} p-8 max-w-md w-full text-center`}>
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-white/20" : "text-gray-300"}`} />
          <h2 className={`text-lg font-semibold mb-2 ${textMain}`}>Session not found</h2>
          <p className={`text-sm ${textSub}`}>The session associated with this share is no longer available.</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const duration = formatDuration(session.duration);

  return (
    <div className={`min-h-screen ${bg} ${textMain}`}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Header */}
        <button
          onClick={() => navigate("/")}
          className={`flex items-center gap-2 text-sm mb-8 transition-colors ${isDark ? "text-white/40 hover:text-white" : "text-gray-400 hover:text-gray-900"}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Session info */}
        <div className="mb-8">
          <div className={`px-4 py-3 rounded-xl ${isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"} mb-4`}>
            <p className={`text-xs font-medium ${isDark ? "text-blue-400" : "text-blue-700"}`}>
              📤 This is a publicly shared session view
            </p>
          </div>

          <h1 className="text-2xl font-bold mb-3">{session.title}</h1>

          <div className={`flex items-center gap-4 mb-4 text-sm ${isDark ? "text-white/40" : "text-gray-500"}`}>
            <span>{format(new Date(session.created_date), "MMMM d, yyyy 'at' h:mm a")}</span>
            {duration && <><span>•</span><span>{duration}</span></>}
          </div>

          {session.session_type && SESSION_TYPES[session.session_type] && (
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border mb-3 ${SESSION_TYPES[session.session_type].bg} ${SESSION_TYPES[session.session_type].text} ${SESSION_TYPES[session.session_type].border}`}>
              {SESSION_TYPES[session.session_type].icon} {session.session_type}
            </span>
          )}

          <TagPills tags={session.tags} />
        </div>

        {/* Summary */}
        {parsedSummary ? (
          <div className="mb-8">
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-white/50" : "text-gray-500"}`}>
              Summary
            </h2>
            <StructuredMinutes
              data={parsedSummary}
              readonly={true}
              audioUrl={session?.audio_file_url}
              transcript={session?.transcript_text}
            />
          </div>
        ) : (
          <div className={`text-center py-12 rounded-xl border-2 border-dashed ${isDark ? "border-white/10" : "border-gray-200"} mb-8`}>
            <p className={`text-sm ${isDark ? "text-white/40" : "text-gray-400"}`}>
              {session.summary_text ? "Summary not available" : "No summary generated for this session yet"}
            </p>
          </div>
        )}

        {/* Transcript — merged across all subsessions */}
        <div className="mb-8">
          <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-white/50" : "text-gray-500"}`}>
            Transcript
            {subsessions.length > 0 && (
              <span className={`ml-2 text-xs font-normal normal-case ${isDark ? "text-white/30" : "text-gray-400"}`}>
                ({subsessions.length} parts)
              </span>
            )}
          </h2>
          {transcriptLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? "text-white/30" : "text-gray-300"}`} />
              <span className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>Loading transcript…</span>
            </div>
          ) : transcriptSegments.length > 0 ? (
            <div className={`${card} rounded-xl border ${border} overflow-hidden`}>
              <div className="divide-y divide-white/5">
                {visibleTranscriptSegments.map((seg) =>
                  seg.isPartHeader ? (
                    <div key={seg.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shrink-0 ${
                            isDark
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/25"
                              : "bg-purple-50 text-purple-600 border-purple-200"
                          }`}
                        >
                          Part {seg.partNum}
                        </span>
                        <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                      </div>
                    </div>
                  ) : (
                    <div key={seg.id} className="px-4 py-2.5 flex gap-3">
                      <div className="shrink-0 w-14 text-right pt-0.5">
                        {seg.timestamp && (
                          <span className={`text-[10px] font-mono ${isDark ? "text-white/30" : "text-gray-400"}`}>
                            {seg.timestamp}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {seg.speaker && (
                          <span
                            className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md border mb-1 mr-2 ${
                              speakerColors[seg.speaker] || SPEAKER_COLORS[0]
                            }`}
                          >
                            {seg.speaker}
                          </span>
                        )}
                        <span className={`text-xs leading-relaxed ${isDark ? "text-white/75" : "text-gray-700"}`}>
                          {seg.text}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
              {hasMoreTranscript && (
                <div className="px-4 py-3 flex items-center gap-3 border-t border-white/5">
                  <p className={`text-[11px] flex-1 ${isDark ? "text-white/40" : "text-gray-400"}`}>
                    Showing first <strong>{loadedMinutes} min</strong> of {totalTranscriptMinutes} min total
                  </p>
                  <button
                    type="button"
                    onClick={() => setLoadedMinutes((m) => m + 10)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Load More (next 10 minutes)
                  </button>
                </div>
              )}
            </div>
          ) : mergedTranscript ? (
            // Fallback: transcript exists but has no parseable timestamped lines.
            <div className={`${card} rounded-xl p-4 border ${border} whitespace-pre-wrap text-xs leading-relaxed max-h-[500px] overflow-y-auto ${isDark ? "text-white/70" : "text-gray-700"}`}>
              {mergedTranscript}
            </div>
          ) : (
            <div className={`text-center py-8 rounded-xl border-2 border-dashed ${isDark ? "border-white/10" : "border-gray-200"}`}>
              <p className={`text-sm ${isDark ? "text-white/40" : "text-gray-400"}`}>No transcript available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`text-center py-8 border-t ${border}`}>
          <p className={`text-xs mb-3 ${isDark ? "text-white/30" : "text-gray-400"}`}>
            This is a read-only shared view. To edit or manage this session, sign in to your account.
          </p>
          <PoweredBy variant={isDark ? "dark" : "light"} />
        </div>
      </div>
    </div>
  );
}