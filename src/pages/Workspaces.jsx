import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Trash2, UserPlus, X, ChevronRight, FileText, Loader2, Crown, Check } from "lucide-react";

export default function Workspaces() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: myWorkspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces", user?.email],
    queryFn: () => base44.entities.Workspace.filter({ owner_email: user.email }),
    enabled: !!user,
  });

  const { data: memberOf = [] } = useQuery({
    queryKey: ["workspace-memberships", user?.email],
    queryFn: () => base44.entities.WorkspaceMember.filter({ user_email: user.email, status: "active" }),
    enabled: !!user,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", selectedWorkspace?.id],
    queryFn: () => base44.entities.WorkspaceMember.filter({ workspace_id: selectedWorkspace.id }),
    enabled: !!selectedWorkspace,
  });

  const { data: sharedSessions = [] } = useQuery({
    queryKey: ["shared-sessions", selectedWorkspace?.id],
    queryFn: () => base44.entities.SharedSession.filter({ workspace_id: selectedWorkspace.id }),
    enabled: !!selectedWorkspace,
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const ws = await base44.entities.Workspace.create({
      name: newName.trim(),
      description: newDesc.trim(),
      owner_email: user.email,
    });
    await base44.entities.WorkspaceMember.create({
      workspace_id: ws.id,
      user_email: user.email,
      role: "owner",
      status: "active",
    });
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    setCreating(false);
    setSelectedWorkspace(ws);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const email = inviteEmail.trim().toLowerCase();

    // Create workspace membership record
    await base44.entities.WorkspaceMember.create({
      workspace_id: selectedWorkspace.id,
      user_email: email,
      role: "member",
      status: "invited",
    });

    // Invite user to the app (sends platform invite email)
    try {
      await base44.users.inviteUser(email, "user");
    } catch (e) {
      // User may already exist — that's fine
    }

    // Send a custom invite email from Silo
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `You've been invited to "${selectedWorkspace.name}" on Silo AI Notes`,
        from_name: "Silo AI Notes",
        body: `Hi there,

${user?.full_name || user?.email} has invited you to join the workspace "${selectedWorkspace.name}" on Silo AI Notes.

Silo AI Notes helps teams capture, transcribe, and summarize meetings automatically using AI.

Click the link below to accept your invitation and get started:
https://siloainotes.com

If you already have an account, you'll see the workspace under your Teams tab after logging in.

Best,
The Silo Team`,
      });
    } catch (e) {
      console.error("Invite email failed", e);
    }

    queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
    setInviteEmail("");
    setInviting(false);
  };

  const handleRemoveMember = async (memberId) => {
    await base44.entities.WorkspaceMember.delete(memberId);
    queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
  };

  const handleDeleteWorkspace = async (wsId) => {
    if (!window.confirm("Delete this workspace? This cannot be undone.")) return;
    await base44.entities.Workspace.delete(wsId);
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    if (selectedWorkspace?.id === wsId) setSelectedWorkspace(null);
  };

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors ${isDark ? "bg-black/40 border-white/10 text-white placeholder-white/30 focus:border-purple-500/50" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400"}`;

  if (selectedWorkspace) {
    const isOwner = selectedWorkspace.owner_email === user?.email;
    return (
      <div className={`min-h-screen ${bg} ${isDark ? "text-white" : "text-gray-900"}`}>
        <div className="max-w-lg mx-auto px-5 pt-10 pb-28">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSelectedWorkspace(null)}
              className={`w-9 h-9 rounded-full flex items-center justify-center border ${isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200"}`}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{selectedWorkspace.name}</h1>
              {selectedWorkspace.description && (
                <p className={`text-xs truncate ${textSub}`}>{selectedWorkspace.description}</p>
              )}
            </div>
            {isOwner && (
              <button
                onClick={() => handleDeleteWorkspace(selectedWorkspace.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500"}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Members */}
          <div className={`rounded-2xl border ${card} p-5 mb-4`}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Members
            </h2>
            <div className="space-y-2 mb-4">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">{m.user_email}</p>
                    <p className={`text-xs ${textSub} capitalize`}>
                      {m.role === "owner" && <Crown className="w-3 h-3 inline mr-1 text-yellow-400" />}
                      {m.role} · {m.status}
                    </p>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className={`text-xs px-2 py-1 rounded-lg ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500"}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invite by email…"
                  className={inputCls}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-3 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium disabled:opacity-40 flex items-center gap-1"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Shared Sessions */}
          <div className={`rounded-2xl border ${card} p-5`}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Shared Sessions
            </h2>
            {sharedSessions.length === 0 ? (
              <p className={`text-sm text-center py-4 ${textSub}`}>No sessions shared yet. Open a session and tap Share to add one.</p>
            ) : (
              <div className="space-y-2">
                {sharedSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/SessionDetail?id=${s.session_id}`)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate flex-1">{s.session_title || "Untitled Session"}</p>
                      <span className={`text-xs ml-2 px-2 py-0.5 rounded-full capitalize ${s.permission === "edit" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>
                        {s.permission}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${textSub}`}>Shared by {s.shared_by_email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${isDark ? "text-white" : "text-gray-900"}`}>
      <div className="max-w-lg mx-auto px-5 pt-10 pb-28">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Teams</h1>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-400">Beta</span>
            </div>
            <p className={`text-xs mt-1 ${textSub}`}>Collaborate on meeting notes</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Create workspace sheet */}
        {showCreate && (
          <div className={`rounded-2xl border ${card} p-5 mb-4`}>
            <h2 className="text-sm font-semibold mb-4">New Workspace</h2>
            <div className="space-y-3">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Workspace name" className={inputCls} />
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" className={inputCls} />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isDark ? "bg-white/8 text-white/60" : "bg-gray-100 text-gray-600"}`}>Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-500 text-white disabled:opacity-40 flex items-center justify-center gap-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>
        ) : myWorkspaces.length === 0 && memberOf.length === 0 ? (
          <div className="text-center py-16">
            <div className={`w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
              <Users className={`w-8 h-8 ${textSub}`} />
            </div>
            <p className={`text-sm font-medium mb-1 ${isDark ? "text-white/60" : "text-gray-600"}`}>No workspaces yet</p>
            <p className={`text-xs ${textSub}`}>Create one to start sharing sessions with your team</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myWorkspaces.map((ws) => (
              <button key={ws.id} onClick={() => setSelectedWorkspace(ws)} className={`w-full text-left rounded-2xl border ${card} p-4 flex items-center gap-4 transition-colors active:scale-[0.98]`}>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{ws.name}</p>
                  {ws.description && <p className={`text-xs truncate mt-0.5 ${textSub}`}>{ws.description}</p>}
                  <p className={`text-xs mt-0.5 ${textSub}`}>Owner</p>
                </div>
                <ChevronRight className={`w-4 h-4 ${textSub}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}