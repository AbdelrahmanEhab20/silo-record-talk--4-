import React, { useState, useEffect } from "react";
import { X, Copy, Check, Loader2, Link as LinkIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/lib/ThemeContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function ShareLinkModal({ session, onClose }) {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  // Generate a unique share code
  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Fetch existing shares for this session
  const { data: shares = [] } = useQuery({
    queryKey: ["shares", session.id],
    queryFn: async () => {
      return base44.entities.PublicSessionShare.filter({ session_id: session.id });
    },
  });

  // Create new share mutation
  const createShareMutation = useMutation({
    mutationFn: async () => {
      const shareCode = generateShareCode();
      return base44.entities.PublicSessionShare.create({
        session_id: session.id,
        owner_email: session.user_email,
        share_code: shareCode,
        title: session.title,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", session.id] });
    },
  });

  // Delete share mutation
  const deleteShareMutation = useMutation({
    mutationFn: async (shareId) => {
      return base44.entities.PublicSessionShare.delete(shareId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", session.id] });
    },
  });

  const shareUrl = (code) => `https://siloainotes.com/share/${code}`;

  const handleCopyLink = (code) => {
    navigator.clipboard.writeText(shareUrl(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bg = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/10" : "border-gray-200";
  const inputCls = isDark ? "bg-[#0A0A0A] border-white/10 text-white/80" : "bg-gray-50 border-gray-200 text-gray-900";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className={`fixed inset-4 sm:inset-8 md:inset-[20%] z-50 rounded-2xl border ${bg} ${border} shadow-2xl flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${border}`}>
          <div className="flex items-center gap-3">
            <LinkIcon className="w-5 h-5 text-purple-400" />
            <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Share Session</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-white/8 hover:bg-white/14" : "bg-gray-100 hover:bg-gray-200"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p className={`text-sm ${isDark ? "text-white/60" : "text-gray-600"}`}>
            Generate a shareable link to let external stakeholders view this session's summary and transcript without needing an account.
          </p>

          {/* Existing Shares */}
          {shares.length > 0 ? (
            <div className="space-y-3">
              <p className={`text-xs font-semibold uppercase ${isDark ? "text-white/40" : "text-gray-400"}`}>Active shares</p>
              {shares.map((share) => (
                <div key={share.id} className={`p-4 rounded-xl border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <code className={`text-xs font-mono px-2 py-1 rounded ${isDark ? "bg-white/10 text-white/80" : "bg-white border border-gray-200 text-gray-800"}`}>
                      {share.share_code}
                    </code>
                    <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>
                      {share.access_count} views
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareUrl(share.share_code)}
                      className={`flex-1 text-xs px-3 py-2 rounded-lg border outline-none ${inputCls}`}
                    />
                    <button
                      onClick={() => handleCopyLink(share.share_code)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-purple-500 hover:bg-purple-600 transition-colors flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={() => deleteShareMutation.mutate(share.id)}
                      disabled={deleteShareMutation.isPending}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 rounded-xl border-2 border-dashed ${isDark ? "border-white/10" : "border-gray-200"}`}>
              <LinkIcon className={`w-8 h-8 mx-auto mb-3 ${isDark ? "text-white/20" : "text-gray-300"}`} />
              <p className={`text-sm ${isDark ? "text-white/40" : "text-gray-500"}`}>No shares yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${border} flex justify-end gap-3`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? "bg-white/8 text-white/70 hover:bg-white/14" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Close
          </button>
          <button
            onClick={() => createShareMutation.mutate()}
            disabled={createShareMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {createShareMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
            Generate New Link
          </button>
        </div>
      </div>
    </>
  );
}