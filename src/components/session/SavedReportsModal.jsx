import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Loader2, Trash2, ChevronRight, Clock, Folder } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/lib/ThemeContext";

export default function SavedReportsModal({ user, sessions, onOpenReport, onClose }) {
  const { isDark } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/50" : "text-gray-500";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return;
      setLoading(true);
      const data = await base44.entities.FolderReport.filter({ user_email: user.email }, "-created_date", 50);
      setReports(data);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeleting(id);
    await base44.entities.FolderReport.delete(id);
    setReports(prev => prev.filter(r => r.id !== id));
    setDeleting(null);
  };

  const handleOpen = (report) => {
    onOpenReport(report);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className={`absolute inset-x-0 bottom-0 top-16 rounded-t-2xl flex flex-col overflow-hidden ${isDark ? "bg-[#111111]" : "bg-[#F5F5F7]"}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-white/8" : "border-gray-200"} shrink-0`}>
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-purple-400" />
            <h2 className={`text-base font-bold ${text}`}>Saved Reports</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/50 hover:bg-white/14" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          )}

          {!loading && reports.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#A855F7,#6366F1)" }}>
                <FileText className="w-6 h-6 text-white" />
              </div>
              <p className={`text-sm font-medium ${text}`}>No saved reports yet</p>
              <p className={`text-xs mt-1 ${sub}`}>Generate a folder report to see it here</p>
            </div>
          )}

          {!loading && reports.length > 0 && (
            <div className="space-y-2.5">
              {reports.map(report => {
                const folderSessions = sessions.filter(s => s.folder === report.folder_name);
                return (
                  <button
                    key={report.id}
                    onClick={() => handleOpen(report)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${card} ${isDark ? "hover:bg-white/6" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.2),rgba(99,102,241,0.2))" }}>
                        <Folder className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${text}`}>{report.folder_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? "bg-purple-500/15 text-purple-400" : "bg-purple-100 text-purple-700"}`}>
                            {report.session_count || folderSessions.length} session{(report.session_count || folderSessions.length) !== 1 ? "s" : ""}
                          </span>
                          <span className={`flex items-center gap-1 text-[10px] ${sub}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(report.generated_at || report.created_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        {report.report_data?.executive_summary && (
                          <p className={`text-xs mt-1.5 leading-relaxed line-clamp-2 ${sub}`}>{report.report_data.executive_summary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleDelete(e, report.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"}`}
                        >
                          {deleting === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                        <ChevronRight className={`w-4 h-4 ${sub}`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}