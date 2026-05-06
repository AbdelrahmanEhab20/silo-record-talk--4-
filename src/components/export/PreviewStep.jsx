import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";

export default function PreviewStep({ selections, sessionId, onSelection }) {
  const { isDark } = useTheme();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        const sessions = await base44.entities.Session.list("-created_date", 100);
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
          setSessionData(session);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleTitleEdit = () => {
    setEditedTitle(sessionData?.title || "");
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      setSessionData(prev => ({ ...prev, title: editedTitle.trim() }));
    }
    setIsEditingTitle(false);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + " • " + 
           date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "";
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-3 border-gray-200 dark:border-[#3A3A3C] border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const previewDetails = [
    { label: "Purpose", value: selections.purpose },
    { label: "Style", value: selections.style },
    { label: "Format", value: selections.format },
    { label: "Tone", value: selections.tone },
    { label: "Length", value: selections.length },
    { label: "Transcript", value: selections.includeTranscript ? "Included" : "Excluded" },
    { label: "Timestamps", value: selections.includeTimestamps ? "Included" : "Excluded" },
  ];

  return (
    <div className="space-y-6">
      {/* Document Preview Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`p-6 rounded-3xl ${
          isDark ? "bg-[#1C1C1E]" : "bg-white"
        } shadow-md border border-gray-200 dark:border-[#3A3A3C]`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              selections.format === "PDF" ? "bg-red-100 dark:bg-red-900/30" :
              selections.format === "DOCX" ? "bg-blue-100 dark:bg-blue-900/30" :
              selections.format === "PPTX" ? "bg-orange-100 dark:bg-orange-900/30" :
              "bg-gray-100 dark:bg-gray-800/50"
            }`}>
              <span className={`text-xs font-bold ${
                selections.format === "PDF" ? "text-red-600 dark:text-red-400" :
                selections.format === "DOCX" ? "text-blue-600 dark:text-blue-400" :
                selections.format === "PPTX" ? "text-orange-600 dark:text-orange-400" :
                "text-gray-600 dark:text-gray-400"
              }`}>
                {selections.format}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-[15px] font-semibold border ${isDark ? 'bg-[#2C2C2E] border-[#3A3A3C] text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    autoFocus
                  />
                  <button onClick={handleTitleSave} className="text-blue-500 font-medium text-sm">
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-semibold text-gray-900 dark:text-white break-words">
                    {sessionData?.title || "Untitled Session"}
                  </p>
                  <button onClick={handleTitleEdit} className="text-xs text-blue-500 hover:text-blue-600 flex-shrink-0 mt-1">
                    Edit
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-[#A1A1A6] mt-2">
                {formatDateTime(sessionData?.created_date)} • {formatDuration(sessionData?.duration)}
              </p>
            </div>
          </div>

          <div className={`h-px ${isDark ? "bg-[#3A3A3C]" : "bg-gray-200"}`} />

          <div className="text-sm text-gray-600 dark:text-[#A1A1A6]">
            <p>Sample preview of your {selections.format} export:</p>
            <div className={`mt-3 p-3 rounded-lg ${
              isDark ? "bg-[#2C2C2E]" : "bg-gray-50"
            } text-xs line-clamp-3`}>
              {sessionData?.summary_text 
                ? (Array.isArray(sessionData.summary_text) 
                    ? sessionData.summary_text.slice(0, 3).join(" • ")
                    : sessionData.summary_text)
                : "No summary available"
              }
            </div>
          </div>
        </div>
      </motion.div>

      {/* Settings Summary */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider px-1">
          Export Settings
        </p>
        <div className={`rounded-2xl overflow-hidden divide-y divide-gray-200 dark:divide-[#3A3A3C] ${
          isDark ? "bg-[#1C1C1E]" : "bg-white"
        }`}>
          {previewDetails.map((detail, idx) => (
            <motion.div
              key={detail.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
              className="px-4 py-3 flex items-center justify-between"
            >
              <span className="text-sm text-gray-600 dark:text-[#A1A1A6]">
                {detail.label}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {detail.value}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Info Note */}
      <div className={`p-4 rounded-2xl ${
        isDark ? "bg-blue-900/20" : "bg-blue-50"
      } border border-blue-200 dark:border-blue-800/50`}>
        <p className="text-xs text-blue-900 dark:text-blue-300">
          ✓ Your export is ready to generate. Click <strong>Export</strong> to download your {selections.format.toLowerCase()} file.
        </p>
      </div>
    </div>
  );
}