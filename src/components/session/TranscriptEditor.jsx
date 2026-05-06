import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Search, X, Clock, User, ChevronDown, ChevronUp, Check, Star, Loader2, Copy, Download } from "lucide-react";
import { appClient } from "@/api/appClient";
import { usePlayback } from "@/lib/PlaybackContext";

// ── Helpers ────────────────────────────────────────────────────────────────
const SEGMENT_RE = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+?):\s*(.*)/;
const PART_HEADER_RE = /^\[Part\s+(\d+)\]$/i;

function parseSegments(text) {
  if (!text) return [];
  return text.split("\n").map((line, i) => {
    const partMatch = line.trim().match(PART_HEADER_RE);
    if (partMatch) return { id: i, isPartHeader: true, partNum: parseInt(partMatch[1], 10), raw: line, timestamp: "", speaker: "", text: line };
    const m = line.match(SEGMENT_RE);
    if (m) return { id: i, timestamp: m[1], speaker: m[2].trim(), text: m[3], raw: line };
    return { id: i, timestamp: "", speaker: "", text: line, raw: line };
  });
}

function segmentsToText(segments) {
  return segments
    .map((s) => {
      if (s.timestamp && s.speaker) return `[${s.timestamp}] ${s.speaker}: ${s.text}`;
      if (s.speaker) return `${s.speaker}: ${s.text}`;
      return s.text;
    })
    .join("\n");
}

function nowTimestamp() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function highlight(text, query) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-400/40 text-inherit rounded px-0.5">{p}</mark>
    ) : p
  );
}

// ── Speaker badge colours (cycles) ────────────────────────────────────────
const SPEAKER_COLORS = [
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "bg-green-500/20 text-green-300 border-green-500/30",
  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
];

// ── Truncation detection ───────────────────────────────────────────────────
const TRUNCATED_MARKERS = [
  "...[truncated",
  "see transcript_file_url",
  "upload failed; transcript truncated",
];

function isTruncatedPreview(text) {
  const t = String(text || "");
  return TRUNCATED_MARKERS.some((m) => t.includes(m));
}

// ── Resolve a single subsession's transcript, fetching file if truncated ──
async function resolveSubsessionTranscript(sub) {
  const inline = (sub?.transcript_text || "").trim();
  const fileUrl = sub?.transcript_file_url;

  if (fileUrl && (!inline || isTruncatedPreview(inline))) {
    try {
      const res = await fetch(fileUrl);
      if (res.ok) {
        const full = (await res.text())?.trim();
        if (full) return full;
      }
    } catch (e) {
      console.warn("Failed to hydrate sub-session transcript file:", e);
    }
  }

  return inline;
}

// ── Build merged transcript with [Part X] headers from subsessions ─────────
async function buildMergedTranscript(subsessions) {
  if (!subsessions || subsessions.length === 0) return null;
  const sorted = [...subsessions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const hydratedParts = await Promise.all(
    sorted.map(async (sub, idx) => {
      const header = `[Part ${idx + 1}]`;
      const body = await resolveSubsessionTranscript(sub);
      return body ? `${header}\n${body}` : header;
    })
  );

  return hydratedParts.join("\n");
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function TranscriptEditor({
  transcript,
  subsessions,
  onSave,
  onSyncHighlights,
  originalTranscript,
  isMultilingual,
  sessionTitle,
  sessionCreatedDate
}) {
  const { isDark } = useTheme();
  const { seekTo } = usePlayback();

  const [mode, setMode] = useState("structured"); // 'structured' | 'raw'
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [segments, setSegments] = useState([]);
  const [rawText, setRawText] = useState("");
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [highlighted, setHighlighted] = useState(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const [copyState, setCopyState] = useState({ structured: false, raw: false });
  const [downloadingTxt, setDownloadingTxt] = useState(false);

  // Hydrated display transcript + loading flag
  const [displayTranscript, setDisplayTranscript] = useState("");
  const [hydratingParts, setHydratingParts] = useState(false);

  const timerRef = useRef(null);
  const searchRef = useRef(null);

  // Speaker color map
  const speakerColors = useMemo(() => {
    const map = {};
    let idx = 0;
    segments.forEach((s) => {
      if (s.speaker && !(s.speaker in map)) {
        map[s.speaker] = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
        idx++;
      }
    });
    return map;
  }, [segments]);

  // ── Hydration effect ──────────────────────────────────────────────────────
  // Resolves the display transcript, fetching from transcript_file_url when
  // the DB preview contains a truncation marker (for both regular sessions and
  // multi-part subsessions).
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      // Original-language toggle for multilingual sessions
      if (showingOriginal && originalTranscript) {
        if (!cancelled) setDisplayTranscript(originalTranscript);
        return;
      }

      // Multi-part sessions: merge subsession transcripts, hydrating each part
      if (subsessions && subsessions.length > 0) {
        setHydratingParts(true);
        try {
          const merged = await buildMergedTranscript(subsessions);
          if (!cancelled) {
            setDisplayTranscript(merged || transcript || "");
          }
        } catch (e) {
          console.warn("Failed to build merged transcript:", e);
          if (!cancelled) setDisplayTranscript(transcript || "");
        } finally {
          if (!cancelled) setHydratingParts(false);
        }
        return;
      }

      // Single session: use the transcript prop (already hydrated by SessionDetail)
      if (!cancelled) setDisplayTranscript(transcript || "");
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [subsessions, transcript, showingOriginal, originalTranscript]);

  // Parse segments whenever displayTranscript changes
  useEffect(() => {
    const segs = parseSegments(displayTranscript);
    setSegments(segs);
    setRawText(displayTranscript);
  }, [displayTranscript]);

  // Match count for search
  useEffect(() => {
    if (!search) { setMatchCount(0); return; }
    const q = search.toLowerCase();
    const count = segments.reduce((acc, s) => {
      const combined = `${s.speaker} ${s.text}`.toLowerCase();
      let c = 0, idx = 0;
      while ((idx = combined.indexOf(q, idx)) !== -1) { c++; idx++; }
      return acc + c;
    }, 0);
    setMatchCount(count);
  }, [search, segments]);

  const autosave = (segs) => {
    const text = segmentsToText(segs);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1200);
  };

  const autosaveRaw = (text) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1200);
  };

  // ── Copy / Download helpers ──────────────────────────────────────────────
  const getStructuredTranscriptText = () => segmentsToText(segments);
  const getRawTranscriptText = () => rawText || segmentsToText(segments);

  const safeFilenameBase = (sessionTitle || "session_transcript")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

  const copyTranscript = async (type) => {
    try {
      const text = type === "structured" ? getStructuredTranscriptText() : getRawTranscriptText();
      if (!text?.trim()) return;
      await navigator.clipboard.writeText(text);
      setCopyState((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => setCopyState((prev) => ({ ...prev, [type]: false })), 1500);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const downloadFormattedTxt = () => {
    try {
      setDownloadingTxt(true);
      const body = getStructuredTranscriptText();
      const created = sessionCreatedDate ? new Date(sessionCreatedDate).toLocaleString() : "";

      const txt = [
        `Title: ${sessionTitle || "Session"}`,
        created ? `Created: ${created}` : "",
        "",
        "=== Transcript (Structured) ===",
        body || "",
        ""
      ].join("\n");

      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFilenameBase || "session_transcript"}_formatted.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download TXT failed", e);
    } finally {
      setDownloadingTxt(false);
    }
  };

  // ── Structured edit ──────────────────────────────────────────────────────
  const startEdit = (seg) => {
    setEditingId(seg.id);
    setEditDraft({ timestamp: seg.timestamp, speaker: seg.speaker, text: seg.text });
  };

  const commitEdit = () => {
    const updated = segments.map((s) =>
      s.id === editingId ? { ...s, ...editDraft } : s
    );
    setSegments(updated);
    autosave(updated);
    setEditingId(null);
  };

  const deleteSegment = (id) => {
    const updated = segments.filter((s) => s.id !== id);
    setSegments(updated);
    autosave(updated);
  };

  const toggleHighlight = (id) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const syncHighlightsToSummary = async () => {
    const lines = segments.filter((s) => highlighted.has(s.id)).map((s) => s.text).filter(Boolean);
    if (!lines.length || !onSyncHighlights) return;
    setSyncing(true);
    try {
      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are a meeting assistant. Based on the following highlighted transcript excerpts, generate 2-4 concise summary bullet points that capture the key insights. Return only the bullet points, each starting with "• ".

Highlighted excerpts:
${lines.map((l, i) => `${i + 1}. ${l}`).join("\n")}`
      });
      onSyncHighlights(result);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } catch (e) {
      console.error("Sync failed", e);
    }
    setSyncing(false);
  };

  const addSegment = () => {
    const newSeg = {
      id: Date.now(),
      timestamp: nowTimestamp(),
      speaker: segments[segments.length - 1]?.speaker || "Speaker",
      text: "",
    };
    const updated = [...segments, newSeg];
    setSegments(updated);
    setEditingId(newSeg.id);
    setEditDraft({ timestamp: newSeg.timestamp, speaker: newSeg.speaker, text: "" });
  };

  // ── Raw mode ─────────────────────────────────────────────────────────────
  const handleRawChange = (e) => {
    const val = e.target.value;
    setRawText(val);
    setSaved(false);
    autosaveRaw(val);
  };

  const switchToStructured = () => {
    setSegments(parseSegments(rawText));
    setMode("structured");
  };

  const switchToRaw = () => {
    setRawText(segmentsToText(segments));
    setMode("raw");
  };

  // ── Visible segments (filtered) ───────────────────────────────────────────
  const visibleSegments = useMemo(() => {
    if (!search) return segments;
    const q = search.toLowerCase();
    return segments.filter(
      (s) =>
        s.speaker.toLowerCase().includes(q) ||
        s.text.toLowerCase().includes(q) ||
        s.timestamp.includes(q)
    );
  }, [segments, search]);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputCls = `rounded-lg px-2 py-1 text-xs outline-none border ${
    isDark
      ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/30 focus:border-purple-500/50"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400"
  }`;

  const hasContent = segments.some((s) => s.text.trim() || s.speaker.trim());

  return (
    <div data-transcript-editor className={`rounded-2xl border ${card} overflow-hidden`}>
      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold"
          >
            Transcript
            {collapsed ? <ChevronDown className="w-3.5 h-3.5 opacity-40" /> : <ChevronUp className="w-3.5 h-3.5 opacity-40" />}
          </button>
          {saved && <span className="text-xs text-green-400 font-medium">Saved</span>}
          {/* Loading indicator while fetching full sub-session transcript files */}
          {hydratingParts && (
            <span className={`flex items-center gap-1 text-xs ${textSub}`}>
              <Loader2 className="w-3 h-3 animate-spin" /> Loading full parts…
            </span>
          )}
          {highlighted.size > 0 && onSyncHighlights && (
            <button
              onClick={syncHighlightsToSummary}
              disabled={syncing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-yellow-500 hover:bg-yellow-600 transition-colors disabled:opacity-60"
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
              {syncDone ? "Synced!" : `Sync ${highlighted.size} to summary`}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Copy Structured */}
          <button
            onClick={() => copyTranscript("structured")}
            title={copyState.structured ? "Copied structured" : "Copy structured transcript"}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              copyState.structured
                ? "bg-green-500/20 text-green-400"
                : isDark ? "bg-white/8 text-white/40 hover:bg-white/12" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            {copyState.structured ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Copy Raw */}
          <button
            onClick={() => copyTranscript("raw")}
            title={copyState.raw ? "Copied raw" : "Copy raw transcript"}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              copyState.raw
                ? "bg-green-500/20 text-green-400"
                : isDark ? "bg-white/8 text-white/40 hover:bg-white/12" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            {copyState.raw ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download TXT */}
          <button
            onClick={downloadFormattedTxt}
            disabled={downloadingTxt}
            title="Download formatted TXT"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isDark ? "bg-white/8 text-white/40 hover:bg-white/12" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            } ${downloadingTxt ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {downloadingTxt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </button>

          {/* Search toggle */}
          <button
            onClick={() => { setSearchOpen((v) => !v); setTimeout(() => searchRef.current?.focus(), 50); }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              searchOpen
                ? "bg-purple-500/20 text-purple-400"
                : isDark ? "bg-white/8 text-white/40 hover:bg-white/12" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Mode toggle */}
          <div className="flex items-center gap-1.5">
            {isMultilingual && originalTranscript && (
              <button
                onClick={() => setShowingOriginal((v) => !v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                  showingOriginal
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : isDark ? "bg-white/5 text-white/40 border-white/10 hover:bg-white/10" : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
                title="Toggle original mixed-language transcript"
              >
                {showingOriginal ? "Normalized" : "Original"}
              </button>
            )}
            <div className={`flex rounded-lg overflow-hidden border text-xs ${isDark ? "border-white/10" : "border-gray-200"}`}>
              {["structured", "raw"].map((m) => (
                <button
                  key={m}
                  onClick={() => (m === "raw" ? switchToRaw() : switchToStructured())}
                  className={`px-2.5 py-1 capitalize transition-colors ${
                    mode === m
                      ? "bg-purple-500 text-white"
                      : isDark ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!collapsed && isMultilingual && originalTranscript && (
        <div className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${isDark ? "border-white/8 bg-amber-500/5 text-amber-400/80" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
          <span>🌐</span>
          <span>Multi-language detected. Showing normalized transcript. Toggle <strong>Original</strong> to see the raw mixed version.</span>
        </div>
      )}

      {!collapsed && (
        <>
          {/* ── Search bar ── */}
          {searchOpen && (
            <div className={`flex items-center gap-2 px-4 py-2 border-b ${isDark ? "border-white/8 bg-white/3" : "border-gray-100 bg-gray-50"}`}>
              <Search className={`w-3.5 h-3.5 shrink-0 ${textSub}`} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transcript…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {search && (
                <span className={`text-xs ${textSub}`}>{matchCount} match{matchCount !== 1 ? "es" : ""}</span>
              )}
              {search && (
                <button onClick={() => setSearch("")} className={`${textSub} hover:text-red-400 transition-colors`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* ── Structured mode ── */}
          {mode === "structured" && (
            <div className="divide-y divide-white/5">
              {!hasContent ? (
                <p className={`text-sm text-center py-10 ${textSub}`}>No transcript available</p>
              ) : visibleSegments.length === 0 ? (
                <p className={`text-sm text-center py-10 ${textSub}`}>No results for "{search}"</p>
              ) : (
                visibleSegments.map((seg) => (
                  seg.isPartHeader ? (
                    <div key={seg.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shrink-0 ${isDark ? "bg-purple-500/15 text-purple-300 border-purple-500/25" : "bg-purple-50 text-purple-600 border-purple-200"}`}>
                          Part {seg.partNum}
                        </span>
                        <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                      </div>
                    </div>
                  ) : (
                    <div key={seg.id} className={`px-4 py-3 group transition-colors ${isDark ? "hover:bg-white/3" : "hover:bg-gray-50"}`}>
                      {editingId === seg.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <Clock className={`w-3 h-3 ${textSub}`} />
                              <input
                                value={editDraft.timestamp}
                                onChange={(e) => setEditDraft((d) => ({ ...d, timestamp: e.target.value }))}
                                placeholder="00:00:00"
                                className={`${inputCls} w-22`}
                                style={{ width: "88px" }}
                              />
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                              <User className={`w-3 h-3 ${textSub} shrink-0`} />
                              <input
                                value={editDraft.speaker}
                                onChange={(e) => setEditDraft((d) => ({ ...d, speaker: e.target.value }))}
                                placeholder="Speaker"
                                className={`${inputCls} flex-1`}
                              />
                            </div>
                          </div>
                          <textarea
                            autoFocus
                            value={editDraft.text}
                            onChange={(e) => setEditDraft((d) => ({ ...d, text: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                            className={`w-full rounded-xl px-3 py-2 text-sm outline-none border resize-none leading-relaxed ${
                              isDark
                                ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/30 focus:border-purple-500/50"
                                : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-400"
                            }`}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={commitEdit}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-purple-500 hover:bg-purple-600 transition-colors"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${isDark ? "bg-white/8 text-white/40 hover:bg-white/12" : "bg-gray-100 text-gray-500"}`}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteSegment(seg.id)}
                              className={`ml-auto px-3 py-1.5 rounded-lg text-xs transition-colors ${isDark ? "text-white/30 hover:text-red-400" : "text-gray-400 hover:text-red-400"}`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`flex gap-3 cursor-pointer rounded-xl transition-colors px-2 -mx-2 ${highlighted.has(seg.id) ? (isDark ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-yellow-50 border border-yellow-200") : ""}`}
                          data-timestamp={seg.timestamp}
                          onClick={() => {
                            if (seg.timestamp) {
                              const parts = seg.timestamp.split(":").map(Number);
                              const seconds = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
                              seekTo(seconds);
                            }
                          }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHighlight(seg.id); }}
                            className={`shrink-0 pt-1 transition-colors ${highlighted.has(seg.id) ? "text-yellow-400" : isDark ? "text-white/10 hover:text-yellow-400/60" : "text-gray-200 hover:text-yellow-400"}`}
                            title="Highlight for sync"
                          >
                            <Star className={`w-3 h-3 ${highlighted.has(seg.id) ? "fill-yellow-400" : ""}`} />
                          </button>
                          <div className="pt-0.5 shrink-0 w-16 text-right" onClick={() => startEdit(seg)}>
                            {seg.timestamp && (
                              <span className={`text-[10px] font-mono ${textSub}`}>{seg.timestamp}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0" onClick={() => startEdit(seg)}>
                            {seg.speaker && (
                              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md border mb-1 mr-2 ${speakerColors[seg.speaker] || SPEAKER_COLORS[0]}`}>
                                {highlight(seg.speaker, search)}
                              </span>
                            )}
                            <span className={`text-sm leading-relaxed ${isDark ? "text-white/80" : "text-gray-700"}`}>
                              {highlight(seg.text, search)}
                            </span>
                          </div>
                          <div className={`shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] ${textSub}`} onClick={() => startEdit(seg)}>
                            edit
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ))
              )}

              {!search && (
                <div className="px-4 py-3">
                  <button
                    onClick={addSegment}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${textSub} hover:text-purple-400`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    + Add segment with timestamp
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Raw mode ── */}
          {mode === "raw" && (
            <div className="p-4">
              <p className={`text-[10px] mb-2 ${textSub}`}>
                Format: <code className="opacity-60">[HH:MM:SS] Speaker Name: text</code>
              </p>
              <textarea
                value={rawText}
                onChange={handleRawChange}
                className={`w-full min-h-[320px] p-4 text-sm leading-relaxed outline-none rounded-xl border resize-y font-mono ${
                  isDark
                    ? "bg-white/5 border-white/8 text-white/80 placeholder-white/20 focus:border-purple-500/40"
                    : "bg-gray-50 border-gray-100 text-gray-700 focus:border-purple-300"
                }`}
                placeholder="[00:00:00] Speaker: Hello..."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}