import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/lib/ThemeContext";
import { X, Share2, Check, Users, Lock, Eye, Pencil } from "lucide-react";

export default function ShareSessionModal({ session, onClose }) {
  const { isDark } = useTheme();
  const [workspaces, setWorkspaces] = useState([]);
  const [sharedWith, setSharedWith] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(null);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      const [myWorkspaces, memberOf, existing] = await Promise.all([
        base44.entities.Workspace.filter({ owner_email: user.email }),
        base44.entities.WorkspaceMember.filter({ user_email: user.email, status: "active" }),
        base44.entities.SharedSession.filter({ session_id: session.id }),
      ]);
      const memberWorkspaceIds = memberOf.map((m) => m.workspace_id);
      const otherWorkspaces = memberWorkspaceIds.length > 0
        ? await Promise.all(memberWorkspaceIds.map((id) => base44.entities.Workspace.get(id).catch(() => null)))
        : [];
      const allWorkspaces = [
        ...myWorkspaces,
        ...otherWorkspaces.filter(Boolean).filter((w) => !myWorkspaces.find((mw) => mw.id === w.id)),
      ];
      setWorkspaces(allWorkspaces);
      setSharedWith(existing);
      setLoading(false);
    };
    load();
  }, [session.id]);

  const getShareForWorkspace = (workspaceId) =>
    sharedWith.find((s) => s.workspace_id === workspaceId);

  const handleShare = async (workspace, permission) => {
    setSharing(workspace.id);
    const existing = getShareForWorkspace(workspace.id);
    if (existing) {
      await base44.entities.SharedSession.update(existing.id, { permission });
      setSharedWith((prev) => prev.map((s) => s.id === existing.id ? { ...s, permission } : s));
    } else {
      const user = await base44.auth.me();
      const created = await base44.entities.SharedSession.create({
        session_id: session.id,
        workspace_id: workspace.id,
        shared_by_email: user.email,
        permission,
        session_title: session.title,
      });
      setSharedWith((prev) => [...prev, created]);
    }
    setSharing(null);
  };

  const handleUnshare = async (workspaceId) => {
    const existing = getShareForWorkspace(workspaceId);
    if (!existing) return;
    setSharing(workspaceId);
    await base44.entities.SharedSession.delete(existing.id);
    setSharedWith((prev) => prev.filter((s) => s.id !== existing.id));
    setSharing(null);
  };

  const bg = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/10" : "border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-lg rounded-t-3xl ${bg} p-6 pb-10`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className={`w-10 h-1 rounded-full mx-auto mb-5 ${isDark ? "bg-white/20" : "bg-gray-300"}`} />

        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Share Session
          </h2>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/10 text-white/60" : "bg-gray-100 text-gray-500"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className={`text-xs ${textSub} mb-5 truncate`}>{session.title}</p>

        {loading ? (
          <p className={`text-sm text-center py-6 ${textSub}`}>Loading workspaces…</p>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-8">
            <Users className={`w-8 h-8 mx-auto mb-2 ${textSub}`} />
            <p className={`text-sm ${textSub}`}>No workspaces yet.</p>
            <p className={`text-xs mt-1 ${textSub}`}>Create a workspace first from the Teams tab.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((ws) => {
              const shared = getShareForWorkspace(ws.id);
              const isSharing = sharing === ws.id;
              return (
                <div key={ws.id} className={`rounded-2xl border ${border} p-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{ws.name}</p>
                      {shared && (
                        <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Shared
                        </p>
                      )}
                    </div>
                    {shared && (
                      <button
                        onClick={() => handleUnshare(ws.id)}
                        disabled={isSharing}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${isDark ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleShare(ws, "view")}
                      disabled={isSharing}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                        shared?.permission === "view"
                          ? "bg-purple-500 text-white"
                          : isDark ? "bg-white/8 text-white/60 hover:bg-white/12" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> View only
                    </button>
                    <button
                      onClick={() => handleShare(ws, "edit")}
                      disabled={isSharing}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                        shared?.permission === "edit"
                          ? "bg-blue-500 text-white"
                          : isDark ? "bg-white/8 text-white/60 hover:bg-white/12" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Can edit
                    </button>
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