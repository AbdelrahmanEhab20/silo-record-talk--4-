import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { MessageSquare, Plus, X, Wand2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { appClient } from "@/api/appClient";

// Safely extract text from a note regardless of format
const getNoteText = (note) => {
  if (!note) return null;
  if (typeof note === "string") {
    // Filter out corrupted [object Object] entries
    if (note === "[object Object]" || note.trim() === "") return null;
    return note;
  }
  if (typeof note === "object") {
    const text = note.text || note.content || "";
    const ts = note.timestamp || note.ts || "";
    return ts ? `[${ts}] ${text}` : text;
  }
  return String(note);
};

export default function ManualNotes({ notes, sessionId, onNotesUpdated }) {
  const { isDark } = useTheme();
  const [collapsed, setCollapsed] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [displayNotes, setDisplayNotes] = useState([]);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputCls = isDark
    ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400";

  // Normalize notes on load — clean up object/corrupt entries
  useEffect(() => {
    const raw = notes || [];
    const cleaned = raw.map(getNoteText).filter(Boolean);
    setDisplayNotes(cleaned);
  }, [notes]);

  const persistNotes = async (updated) => {
    setDisplayNotes(updated);
    if (sessionId) {
      await appClient.entities.Session.update(sessionId, { manual_notes: updated });
    }
    onNotesUpdated?.(updated);
  };

  const handleAdd = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    await persistNotes([...displayNotes, trimmed]);
    setDraft("");
    setAdding(false);
    setSaving(false);
  };

  const handleRemove = async (idx) => {
    await persistNotes(displayNotes.filter((_, i) => i !== idx));
  };

  // AI-powered typo correction for all notes
  const handleRefine = async () => {
    if (displayNotes.length === 0) return;
    setRefining(true);
    try {
      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are a meeting notes editor. Fix ONLY spelling and grammar typos in the following notes. 
Preserve timestamps like [00:01] exactly. Preserve the meaning and wording — only fix obvious errors.
Return ONLY a JSON array of corrected note strings, in the same order, with no extra text.

Notes:
${JSON.stringify(displayNotes)}`,
        response_json_schema: {
          type: "object",
          properties: {
            notes: { type: "array", items: { type: "string" } }
          }
        }
      });
      const corrected = result?.notes;
      if (Array.isArray(corrected) && corrected.length === displayNotes.length) {
        await persistNotes(corrected);
      }
    } catch (e) {
      console.error("Note refinement failed", e);
    }
    setRefining(false);
  };

  // Always render if we have a sessionId (even with no notes)
  if (!sessionId) return null;

  return (
    <div className={`rounded-2xl border ${card} p-5 mb-8`}>
      <div className="flex items-center justify-between" onClick={() => setCollapsed(v => !v)} style={{ cursor: "pointer" }}>
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSub}`}>
            My Notes
          </h3>
          {displayNotes.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
              {displayNotes.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {!collapsed && displayNotes.length > 0 && (
            <button
              onClick={handleRefine}
              disabled={refining}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                isDark ? "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
              }`}
              title="AI-fix typos"
            >
              {refining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              {refining ? "Fixing…" : "Fix Typos"}
            </button>
          )}
          {!collapsed && !adding && (
            <button
              onClick={() => setAdding(true)}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                isDark ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
              }`}
            >
              <Plus className="w-3 h-3" /> Add Note
            </button>
          )}
          <button onClick={() => setCollapsed(v => !v)} className={`${isDark ? "text-white/30 hover:text-white/60" : "text-gray-400 hover:text-gray-600"} transition-colors`}>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {displayNotes.length === 0 && !adding ? (
            <p className={`text-xs ${textSub} text-center py-4 mt-4`}>
              No notes yet. Notes added during recording will appear here.
            </p>
          ) : (
            <div className="space-y-2 mt-4">
              {displayNotes.map((note, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 text-sm leading-relaxed px-3 py-2 rounded-lg group ${
                    isDark ? "bg-white/5" : "bg-gray-50"
                  }`}
                >
                  <span className="flex-1 break-words">{note}</span>
                  <button
                    onClick={() => handleRemove(idx)}
                    className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 ${isDark ? "text-white/30 hover:text-red-400" : "text-gray-300 hover:text-red-500"}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!collapsed && adding && (
        <div className="mt-3 flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAdding(false); setDraft(""); }
            }}
            placeholder="Type your note…"
            className={`flex-1 text-sm px-3 py-2 rounded-xl border outline-none transition-colors ${inputCls}`}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !draft.trim()}
            className="px-3 py-2 rounded-xl text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => { setAdding(false); setDraft(""); }}
            className={`px-3 py-2 rounded-xl text-sm transition-colors ${isDark ? "bg-white/8 text-white/50 hover:bg-white/14" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}