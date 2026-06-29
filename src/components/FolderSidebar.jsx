import React, { useMemo, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { X, Folder, FolderOpen, LayoutGrid, Plus, Pencil, Trash2, Check, Flag, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { appClient } from "@/api/appClient";
import { useQueryClient } from "@tanstack/react-query";
import { SESSIONS_QUERY_KEY } from "@/lib/query-client";

const FOLDER_COLORS = [
  "#a855f7", "#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#ef4444", "#f97316", "#ec4899",
];

function colorForFolder(name) {
  if (!name) return "#888";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
}

export default function FolderSidebar({
  sessions = [],
  activeFolder,
  onSelect,
  onClose,
  onFolderRenamed,
  onFolderDeleted,
}) {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const allSessions = sessions;

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);

  const folders = useMemo(() => {
    const map = {};
    allSessions.forEach(s => {
      const f = s.folder?.trim();
      if (f) map[f] = (map[f] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allSessions]);

  const bg = isDark ? "bg-[#141414]" : "bg-white";
  const border = isDark ? "border-white/10" : "border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputCls = isDark ? "bg-white/8 border-white/10 text-white placeholder-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";

  const createFolder = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    setNewName("");
    setCreating(false);
    setSaving(false);
    onSelect(name);
    onClose();
  };

  const renameFolder = async () => {
    const oldName = renamingFolder;
    const newVal = renameValue.trim();
    if (!newVal || newVal === oldName || saving) return;
    setSaving(true);
    const toUpdate = allSessions.filter(s => s.folder === oldName);
    await Promise.all(toUpdate.map(s => appClient.entities.Session.update(s.id, { folder: newVal })));
    onFolderRenamed?.(oldName, newVal);
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    if (activeFolder === oldName) onSelect(newVal);
    setRenamingFolder(null);
    setRenameValue("");
    setSaving(false);
  };

  const deleteFolder = async (folderName) => {
    if (!confirm(`Remove all sessions from folder "${folderName}"? Sessions will not be deleted.`)) return;
    setSaving(true);
    const toUpdate = allSessions.filter(s => s.folder === folderName);
    await Promise.all(toUpdate.map(s => appClient.entities.Session.update(s.id, { folder: null })));
    onFolderDeleted?.(folderName);
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    if (activeFolder === folderName) onSelect(null);
    setSaving(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div className="absolute inset-0" style={{ background: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }} />

        <motion.div
          className={`relative ml-auto w-72 h-full ${bg} border-l ${border} shadow-2xl flex flex-col`}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
            <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Folders</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setCreating(true); setNewName(""); }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}
                title="New folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={onClose} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? "bg-white/8 text-white/40 hover:bg-white/14" : "bg-gray-100 text-gray-500 hover:bg-gray-200"} transition-colors`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Create folder input */}
          {creating && (
            <div className={`px-4 py-3 border-b ${border}`}>
              <p className={`text-xs mb-2 font-medium ${textSub}`}>New folder name</p>
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setCreating(false); }}
                  placeholder="e.g. Client Project"
                  className={`flex-1 text-sm px-3 py-2 rounded-xl border outline-none ${inputCls}`}
                />
                <button
                  onClick={createFolder}
                  disabled={!newName.trim() || saving}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-40 shrink-0"
                  style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)" }}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-white/8 text-white/40 hover:bg-white/14" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {/* All */}
             <button
               onClick={() => { onSelect(null); onClose(); }}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                 activeFolder === null
                   ? "bg-purple-500/15 text-purple-400"
                   : isDark ? "text-white/70 hover:bg-white/6" : "text-gray-700 hover:bg-gray-100"
               }`}
             >
               <LayoutGrid className="w-4 h-4 shrink-0" />
               <span className="flex-1 text-sm font-medium">All Sessions</span>
               <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? "bg-white/8 text-white/30" : "bg-gray-100 text-gray-400"}`}>
                 {allSessions.length}
               </span>
             </button>

             {/* Archived virtual folder */}
             {(() => {
               const archivedCount = allSessions.filter(s => s.storage_tier === 'archived').length;
               return (
                 <button
                   onClick={() => { onClose(); navigate('/ArchivedSessions'); }}
                   className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                     isDark ? "text-white/70 hover:bg-white/6" : "text-gray-700 hover:bg-gray-100"
                   }`}
                 >
                   <Archive className="w-4 h-4 shrink-0 text-purple-400" />
                   <span className="flex-1 text-sm font-medium">Archived</span>
                   {archivedCount > 0 && (
                     <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                       {archivedCount}
                     </span>
                   )}
                 </button>
               );
             })()}

             {/* Flagged virtual folder */}
             {allSessions.some(s => s.is_flagged) && (
               <button
                 onClick={() => { onSelect("__flagged__"); onClose(); }}
                 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                   activeFolder === "__flagged__"
                     ? "bg-amber-500/15 text-amber-400"
                     : isDark ? "text-white/70 hover:bg-white/6" : "text-gray-700 hover:bg-gray-100"
                 }`}
               >
                 <Flag className={`w-4 h-4 shrink-0 ${activeFolder === "__flagged__" ? "fill-amber-400 text-amber-400" : "text-amber-400"}`} />
                 <span className="flex-1 text-sm font-medium">Flagged</span>
                 <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFolder === "__flagged__" ? "bg-amber-500/20 text-amber-400" : isDark ? "bg-white/8 text-white/30" : "bg-gray-100 text-gray-400"}`}>
                   {allSessions.filter(s => s.is_flagged).length}
                 </span>
               </button>
             )}

            {folders.length > 0 && (
              <div className={`text-[10px] font-semibold uppercase tracking-widest px-3 pt-3 pb-1 ${textSub}`}>
                Folders
              </div>
            )}

            {folders.map(([name, count]) => {
              const color = colorForFolder(name);
              const isActive = activeFolder === name;
              const isRenaming = renamingFolder === name;
              const Icon = isActive ? FolderOpen : Folder;

              if (isRenaming) {
                return (
                  <div key={name} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? "bg-white/8" : "bg-gray-100"}`}>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") renameFolder(); if (e.key === "Escape") setRenamingFolder(null); }}
                      className={`flex-1 text-sm bg-transparent outline-none ${isDark ? "text-white" : "text-gray-900"}`}
                    />
                    <button onClick={renameFolder} disabled={saving} className="text-purple-400 hover:text-purple-300">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setRenamingFolder(null)} className={`${isDark ? "text-white/30 hover:text-white/60" : "text-gray-400 hover:text-gray-600"}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={name}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? isDark ? "bg-white/8" : "bg-gray-100"
                      : isDark ? "text-white/70 hover:bg-white/6" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => { onSelect(name); onClose(); }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                    <span className="flex-1 text-sm font-medium truncate">{name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
                      {count}
                    </span>
                  </button>
                  {/* Rename & delete — show on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setRenamingFolder(name); setRenameValue(name); }}
                      className={`w-6 h-6 rounded flex items-center justify-center ${isDark ? "text-white/30 hover:text-white/70 hover:bg-white/10" : "text-gray-300 hover:text-gray-600 hover:bg-gray-200"} transition-colors`}
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteFolder(name)}
                      className="w-6 h-6 rounded flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {folders.length === 0 && !creating && (
              <div className={`text-center py-10 px-4`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${isDark ? "bg-white/6" : "bg-gray-100"}`}>
                  <Folder className={`w-5 h-5 ${textSub}`} />
                </div>
                <p className={`text-xs ${textSub} leading-relaxed`}>No folders yet. Tap + to create one, or assign sessions to folders from their card.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
