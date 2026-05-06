import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";
import { X } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function PreviewModal({ sessionId, onClose }) {
  const { isDark } = useTheme();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) return;
      try {
        const response = await appClient.entities.Session.filter({ id: sessionId }, "-created_date", 1);
        if (response.length > 0) {
          setSessionData(response[0]);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className={`relative w-full max-h-[90vh] rounded-t-3xl ${
            isDark ? "bg-[#1C1C1E]" : "bg-white"
          } overflow-hidden flex flex-col`}
        >
          {/* Header */}
          <div className={`sticky top-0 z-10 px-5 py-4 border-b ${
            isDark ? "border-white/10 bg-[#1C1C1E]" : "border-gray-200 bg-white"
          } flex items-center justify-between`}>
            <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Export Preview
            </h2>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-y-auto scrollbar-hide px-5 py-6 space-y-6 ${
            isDark ? "bg-[#0A0A0A]" : "bg-gray-50"
          }`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-3 border-gray-200 dark:border-[#3A3A3C] border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* Document Preview Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-5 rounded-2xl ${
                    isDark ? "bg-[#1C1C1E]" : "bg-white"
                  } shadow-sm border ${isDark ? "border-white/10" : "border-gray-200"}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/30">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          DOC
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {sessionData?.title || "Untitled Session"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[#A1A1A6] mt-1">
                          Meeting Notes • {sessionData?.folder || "General"}
                        </p>
                      </div>
                    </div>

                    <div className={`h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`} />

                    <div>
                      <p className="text-xs text-gray-600 dark:text-[#A1A1A6] mb-2">Sample preview:</p>
                      <div className={`p-3 rounded-lg ${
                        isDark ? "bg-[#2C2C2E]" : "bg-gray-50"
                      } text-xs text-gray-700 dark:text-[#A1A1A6] leading-relaxed`}>
                        {sessionData?.summary_text 
                          ? (Array.isArray(sessionData.summary_text) 
                              ? sessionData.summary_text.slice(0, 5).join("\n")
                              : sessionData.summary_text.substring(0, 300) + "...")
                          : "No summary available"
                        }
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Session Details */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className={`p-5 rounded-2xl ${
                    isDark ? "bg-[#1C1C1E]" : "bg-white"
                  } shadow-sm border ${isDark ? "border-white/10" : "border-gray-200"}`}
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    Session Details
                  </h3>
                  <div className={`space-y-3 text-xs divide-y ${isDark ? "divide-white/10" : "divide-gray-200"}`}>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-[#A1A1A6]">Title</span>
                      <span className="font-medium text-gray-900 dark:text-white">{sessionData?.title}</span>
                    </div>
                    <div className="flex justify-between pt-3">
                      <span className="text-gray-600 dark:text-[#A1A1A6]">Duration</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {sessionData?.duration ? Math.round(sessionData.duration / 60) + " min" : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3">
                      <span className="text-gray-600 dark:text-[#A1A1A6]">Created</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {sessionData?.created_date ? new Date(sessionData.created_date).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                    {sessionData?.tags && sessionData.tags.length > 0 && (
                      <div className="pt-3">
                        <p className="text-gray-600 dark:text-[#A1A1A6] mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {sessionData.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isDark ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Transcript Preview */}
                {sessionData?.transcript_text && (
                  <div className={`p-5 rounded-2xl ${
                    isDark ? "bg-[#1C1C1E]" : "bg-white"
                  } shadow-sm border ${isDark ? "border-white/10" : "border-gray-200"}`}>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Transcript Preview
                    </h3>
                    <div className={`p-3 rounded-lg ${
                      isDark ? "bg-[#2C2C2E]" : "bg-gray-50"
                    } text-xs text-gray-700 dark:text-[#A1A1A6] leading-relaxed line-clamp-6`}>
                      {sessionData.transcript_text.substring(0, 400)}...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}