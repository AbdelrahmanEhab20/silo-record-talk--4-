import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { Search, X, Clock, FileText, CheckSquare, AlignLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

function highlight(text, query) {
  if (!text || !query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-purple-400/30 text-inherit rounded px-0.5">{p}</mark>
      : p
  );
}

function extractActionItems(summaryText) {
  if (!summaryText) return [];
  try {
    const parsed = JSON.parse(summaryText);
    return (parsed.action_items || []).map(a => typeof a === "string" ? a : a.task || a.title || "");
  } catch {
    return [];
  }
}

function getMatchSnippet(session, query) {
  const q = query.toLowerCase();
  const fields = [
    { label: "Title", icon: FileText, text: session.title },
    { label: "Summary", icon: AlignLeft, text: (() => {
      try {
        const p = JSON.parse(session.summary_text);
        return [p.executive_summary, ...(p.key_points || []), ...(p.decisions || [])].filter(Boolean).join(" ");
      } catch { return session.summary_text || ""; }
    })() },
    { label: "Transcript", icon: Clock, text: session.transcript_text || "" },
    { label: "Action Item", icon: CheckSquare, text: extractActionItems(session.summary_text).join(" ") },
  ];

  for (const f of fields) {
    if (!f.text) continue;
    const idx = f.text.toLowerCase().indexOf(q);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(f.text.length, idx + query.length + 60);
      const snippet = (start > 0 ? "…" : "") + f.text.slice(start, end) + (end < f.text.length ? "…" : "");
      return { label: f.label, icon: f.icon, snippet };
    }
  }
  return null;
}

export default function GlobalSearch({ sessions, onClose }) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return sessions
      .filter(s => {
        const actionText = extractActionItems(s.summary_text).join(" ");
        const summaryFlat = (() => { try { const p = JSON.parse(s.summary_text); return JSON.stringify(p); } catch { return s.summary_text || ""; } })();
        return (
          s.title?.toLowerCase().includes(q) ||
          summaryFlat?.toLowerCase().includes(q) ||
          s.transcript_text?.toLowerCase().includes(q) ||
          actionText.toLowerCase().includes(q)
        );
      })
      .slice(0, 20)
      .map(s => ({ session: s, match: getMatchSnippet(s, query) }));
  }, [query, sessions]);

  const bg = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/10" : "border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4"
      style={{ background: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full max-w-lg rounded-2xl border ${bg} ${border} shadow-2xl overflow-hidden`} style={{ maxHeight: "70vh" }}>
        {/* Search Input */}
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${border}`}>
          <Search className={`w-4 h-4 shrink-0 ${textSub}`} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search meetings, transcripts, actions…"
            className={`flex-1 bg-transparent text-sm outline-none ${isDark ? "text-white placeholder-white/30" : "text-gray-900 placeholder-gray-400"}`}
          />
          {query && (
            <button onClick={() => setQuery("")} className={`${textSub} hover:text-red-400 transition-colors`}>
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded-lg ${isDark ? "bg-white/8 text-white/40" : "bg-gray-100 text-gray-500"}`}>
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 60px)" }}>
          {query.length < 2 ? (
            <p className={`text-sm text-center py-10 ${textSub}`}>Start typing to search…</p>
          ) : results.length === 0 ? (
            <p className={`text-sm text-center py-10 ${textSub}`}>No results for "{query}"</p>
          ) : (
            <>
              <p className={`text-[10px] font-semibold uppercase tracking-widest px-4 pt-3 pb-1 ${textSub}`}>
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              {results.map(({ session, match }) => {
                const MatchIcon = match?.icon || FileText;
                return (
                  <button
                    key={session.id}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                    onClick={() => { navigate(`/SessionDetail?id=${session.id}`); onClose(); }}
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center mt-0.5">
                      <MatchIcon className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {highlight(session.title, query)}
                      </p>
                      <p className={`text-[11px] mb-1 ${textSub}`}>
                        {format(new Date(session.created_date), "MMM d, yyyy")}
                        {match && <> · <span className="text-purple-400">{match.label}</span></>}
                      </p>
                      {match && (
                        <p className={`text-xs leading-relaxed line-clamp-2 ${isDark ? "text-white/50" : "text-gray-500"}`}>
                          {highlight(match.snippet, query)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 mt-1 ${textSub}`} />
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}