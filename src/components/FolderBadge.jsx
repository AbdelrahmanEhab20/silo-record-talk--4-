import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/lib/ThemeContext";
import { Folder, X, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const FOLDER_COLORS = [
  "#a855f7", "#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#ef4444", "#f97316", "#ec4899",
];

export function colorForFolder(name) {
  if (!name) return "#888";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
}

export default function FolderBadge({ session, allFolders: propFolders }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetchedFolders, setFetchedFolders] = useState(null);
  const queryClient = useQueryClient();

  // Merge prop folders with any fetched ones; fetchedFolders takes priority when loaded
  const allFolders = fetchedFolders ?? propFolders ?? [];

  const openModal = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft("");
    setOpen(true);
    // Always fetch fresh folder list from DB
    try {
      const me = await base44.auth.me();
      const sessions = await base44.entities.Session.filter({ user_email: me.email }, "-created_date", 200);
      const folders = [...new Set(sessions.filter(s => s.folder).map(s => s.folder))].sort();
      setFetchedFolders(folders);
    } catch {}
  };

  const closeModal = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setOpen(false);
    setDraft("");
  };

  const save = async (folder) => {
    setSaving(true);
    await base44.entities.Session.update(session.id, { folder: folder || null });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    setSaving(false);
    setOpen(false);
    setDraft("");
  };

  const color = colorForFolder(session.folder);

  const modal = open && createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={closeModal}
    >
      <div
        className={`w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden ${isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white border border-gray-200"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
          <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            {session.folder ? "Change Folder" : "Add to Folder"}
          </span>
          <button onClick={closeModal} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/50 hover:text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* New folder input */}
        <div className="px-4 py-3">
          <p className={`text-xs mb-2 ${isDark ? "text-white/40" : "text-gray-400"}`}>Create new folder</p>
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && draft.trim()) save(draft.trim()); }}
              placeholder="Folder name…"
              className={`flex-1 text-sm bg-transparent outline-none ${isDark ? "text-white placeholder-white/30" : "text-gray-900 placeholder-gray-400"}`}
            />
          </div>
          <button
            onClick={() => draft.trim() && save(draft.trim())}
            disabled={!draft.trim() || saving}
            className="w-full mt-2 h-10 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>

        {/* Existing folders */}
        {allFolders.length > 0 && (
          <div className={`border-t ${isDark ? "border-white/8" : "border-gray-100"}`}>
            <p className={`text-xs px-4 pt-2 pb-1 ${isDark ? "text-white/40" : "text-gray-400"}`}>Existing folders</p>
            <div className="max-h-40 overflow-y-auto pb-2">
              {allFolders.map(name => {
                const c = colorForFolder(name);
                const active = session.folder === name;
                return (
                  <button
                    key={name}
                    onClick={() => save(active ? "" : name)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${isDark ? "hover:bg-white/6" : "hover:bg-gray-50"}`}
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: c }} />
                    <span className="flex-1 truncate" style={{ color: active ? c : undefined }}>{name}</span>
                    {active && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: c }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Remove */}
        {session.folder && (
          <div className={`border-t px-4 py-2 ${isDark ? "border-white/8" : "border-gray-100"}`}>
            <button
              onClick={() => save("")}
              className="w-full flex items-center gap-2 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Remove from folder
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all active:scale-95"
        style={session.folder
          ? { background: `${color}22`, color, border: `1px solid ${color}44` }
          : { background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6", color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb" }
        }
      >
        <Folder className="w-2.5 h-2.5" />
        {session.folder || "Add folder"}
      </button>
      {modal}
    </>
  );
}