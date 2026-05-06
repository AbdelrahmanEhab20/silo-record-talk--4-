import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, X, ChevronDown, Trash2 } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function QuickNotes({ notes = [], onAddNote, duration = 0 }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  const formatTimestamp = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") setOpen(false);
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddNote({ text: trimmed, timestamp: formatTimestamp(duration), createdAt: Date.now() });
    setText("");
  };

  return (
    <>
      {/* Slide-up notes panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`fixed bottom-24 left-4 right-4 max-w-lg mx-auto z-40 rounded-2xl shadow-2xl border overflow-hidden ${
              isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-purple-400" />
                <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Meeting Notes</span>
                {notes.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                    {notes.length}
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className={`${isDark ? "text-white/30 hover:text-white/60" : "text-gray-400 hover:text-gray-600"} transition-colors`}>
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Input area */}
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a note… (Enter to save, Shift+Enter for new line)"
                rows={2}
                className={`w-full text-sm resize-none rounded-xl px-3 py-2.5 outline-none transition-colors ${
                  isDark
                    ? "bg-[#2C2C2E] border border-white/10 text-white placeholder-white/40 focus:border-purple-500/50"
                    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400"
                }`}
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[10px] font-mono ${isDark ? "text-white/25" : "text-gray-400"}`}>
                  @ {formatTimestamp(duration)}
                </span>
                <button
                  onClick={submit}
                  disabled={!text.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-30 transition-all text-white"
                  style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Saved notes list */}
            {notes.length > 0 && (
              <div className={`max-h-48 overflow-y-auto border-t ${isDark ? "border-white/8" : "border-gray-100"}`}>
                {[...notes].reverse().map((note, i) => (
                  <div
                    key={note.createdAt}
                    className={`px-4 py-2.5 flex gap-3 ${
                      i < notes.length - 1 ? (isDark ? "border-b border-white/5" : "border-b border-gray-50") : ""
                    }`}
                  >
                    <span className={`text-[10px] font-mono shrink-0 mt-0.5 ${isDark ? "text-white/25" : "text-gray-400"}`}>
                      {note.timestamp}
                    </span>
                    <p className={`text-xs flex-1 leading-relaxed ${isDark ? "text-white/70" : "text-gray-700"}`}>
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Note Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-24 left-4 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 ${
          open
            ? "bg-purple-600"
            : isDark
            ? "bg-[#2C2C2E] border border-white/10"
            : "bg-white border border-gray-200"
        }`}
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <PenLine className={`w-5 h-5 ${isDark ? "text-white/70" : "text-gray-600"}`} />
        )}
        {!open && notes.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-[9px] font-bold text-white flex items-center justify-center">
            {notes.length}
          </span>
        )}
      </button>
    </>
  );
}