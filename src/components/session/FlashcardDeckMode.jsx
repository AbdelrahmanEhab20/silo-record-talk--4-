import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";
import { X, CheckCircle2, XCircle, RotateCcw, GraduationCap } from "lucide-react";

/**
 * FlashcardDeckMode
 * Full-screen swipe-to-know / swipe-to-skip deck practice mode.
 * Props:
 *   flashcards: array of { front, back, category, visual_hint }
 *   onClose: () => void
 *   onComplete: ({ known, unknown }) => void  — called when deck is finished
 */
export default function FlashcardDeckMode({ flashcards, onClose, onComplete }) {
  const { isDark } = useTheme();
  const [flipped, setFlipped] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [known, setKnown] = useState([]); // indices
  const [unknown, setUnknown] = useState([]); // indices
  const [exitDir, setExitDir] = useState(null); // "right" | "left"
  const [done, setDone] = useState(false);

  // Drag state
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-150, 0, 150], [-18, 0, 18]);
  const knownOpacity = useTransform(dragX, [20, 80], [0, 1]);
  const unknownOpacity = useTransform(dragX, [-80, -20], [1, 0]);

  const current = flashcards[currentIdx];
  const progress = (currentIdx / flashcards.length) * 100;

  const advance = (dir) => {
    setExitDir(dir);
    if (dir === "right") setKnown(k => [...k, currentIdx]);
    else setUnknown(u => [...u, currentIdx]);

    setTimeout(() => {
      setExitDir(null);
      setFlipped(false);
      dragX.set(0);
      if (currentIdx + 1 >= flashcards.length) {
        setDone(true);
        const finalKnown = dir === "right"
          ? [...known, currentIdx]
          : known;
        const finalUnknown = dir === "left"
          ? [...unknown, currentIdx]
          : unknown;
        onComplete({ known: finalKnown, unknown: finalUnknown });
      } else {
        setCurrentIdx(i => i + 1);
      }
    }, 350);
  };

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 80) advance("right");
    else if (info.offset.x < -80) advance("left");
    else animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F0F0F5]";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const cardFace = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";

  if (done) {
    const knownCount = known.length + (exitDir === "right" ? 0 : 0);
    const unknownCount = unknown.length;
    const total = flashcards.length;
    const pct = Math.round((knownCount / total) * 100);

    return (
      <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center ${bg} px-6`}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: pct >= 70 ? "linear-gradient(135deg,#10B981,#059669)" : "linear-gradient(135deg,#F59E0B,#D97706)" }}>
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h2 className={`text-2xl font-bold mb-1 ${textMain}`}>Session Complete!</h2>
          <p className={`text-sm mb-8 ${textSub}`}>{total} cards reviewed</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`rounded-2xl border p-4 ${isDark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
              <p className="text-3xl font-bold text-green-400 mb-1">{known.length}</p>
              <p className={`text-xs font-medium ${isDark ? "text-green-400/70" : "text-green-700"}`}>Known ✓</p>
            </div>
            <div className={`rounded-2xl border p-4 ${isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200"}`}>
              <p className="text-3xl font-bold text-red-400 mb-1">{unknown.length}</p>
              <p className={`text-xs font-medium ${isDark ? "text-red-400/70" : "text-red-700"}`}>Review ✗</p>
            </div>
          </div>

          <div className={`rounded-xl p-3 mb-6 text-sm ${isDark ? "bg-white/5 border border-white/8 text-white/60" : "bg-gray-100 border border-gray-200 text-gray-600"}`}>
            {pct >= 80 ? "🎉 Excellent! This session is saved in your Learning Progress." :
             pct >= 50 ? "👍 Good progress! Keep practicing the ones you missed." :
             "📚 Keep going! Review the unknown cards again soon."}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-colors ${isDark ? "border-white/10 text-white/60 hover:bg-white/6" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
              Done
            </button>
            <button onClick={() => { setCurrentIdx(0); setKnown([]); setUnknown([]); setFlipped(false); setDone(false); setExitDir(null); dragX.set(0); }}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors"
              style={{ background: "linear-gradient(135deg,#A855F7,#6366F1)" }}>
              <RotateCcw className="w-4 h-4" /> Retry All
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col ${bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={onClose}
          className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/50 hover:bg-white/12" : "bg-white border border-gray-200 text-gray-500"}`}>
          <X className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className={`text-xs font-semibold ${textSub}`}>{currentIdx + 1} / {flashcards.length}</p>
          {current.category && (
            <p className={`text-[10px] mt-0.5 ${textSub}`}>{current.category}</p>
          )}
        </div>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? "bg-white/4" : "bg-gray-100"}`}>
          <span className={`text-xs font-bold ${textMain}`}>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Progress */}
      <div className={`h-1 mx-5 rounded-full mb-6 ${isDark ? "bg-white/8" : "bg-gray-200"}`}>
        <motion.div className="h-full rounded-full bg-purple-500"
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Swipe hint labels */}
      <div className="flex justify-between px-8 mb-4">
        <motion.div style={{ opacity: unknownOpacity }}
          className="flex items-center gap-1.5 text-red-400">
          <XCircle className="w-5 h-5" />
          <span className="text-sm font-bold">Review</span>
        </motion.div>
        <motion.div style={{ opacity: knownOpacity }}
          className="flex items-center gap-1.5 text-green-400">
          <span className="text-sm font-bold">Known</span>
          <CheckCircle2 className="w-5 h-5" />
        </motion.div>
      </div>

      {/* Card stack */}
      <div className="flex-1 flex items-center justify-center px-5">
        <AnimatePresence mode="wait">
          {exitDir ? (
            <motion.div key={`exit-${currentIdx}`}
              initial={{ x: 0, rotate: 0, opacity: 1 }}
              animate={{ x: exitDir === "right" ? 350 : -350, rotate: exitDir === "right" ? 20 : -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`w-full max-w-sm rounded-3xl border-2 p-8 min-h-[340px] flex flex-col items-center justify-center text-center ${cardFace}`}>
            </motion.div>
          ) : (
            <motion.div
              key={currentIdx}
              style={{ x: dragX, rotate }}
              drag="x"
              dragConstraints={{ left: -200, right: 200 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              onClick={() => setFlipped(f => !f)}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-sm rounded-3xl border-2 p-8 min-h-[340px] flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing select-none ${cardFace}`}
              style={{ x: dragX, rotate, touchAction: "none" }}>

              {/* Flip indicator */}
              <div className={`absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                flipped
                  ? isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"
                  : isDark ? "bg-white/8 text-white/30" : "bg-gray-100 text-gray-400"
              }`}>
                {flipped ? "ANSWER" : "QUESTION"}
              </div>

              {/* Visual hint emoji */}
              {current.visual_hint && !flipped && (
                <div className="text-5xl mb-5">{current.visual_hint}</div>
              )}

              {/* Card content */}
              <motion.div key={flipped ? "back" : "front"}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}>
                <p className={`text-lg font-semibold leading-relaxed ${textMain}`}>
                  {flipped ? current.back : current.front}
                </p>
              </motion.div>

              <p className={`mt-6 text-xs ${textSub}`}>
                {flipped ? "Swipe right if you knew it ✓" : "Tap to reveal answer"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 px-8 pb-12 pt-4">
        <button
          onClick={() => advance("left")}
          className="flex-1 h-14 rounded-2xl border-2 border-red-500/30 bg-red-500/10 text-red-400 flex items-center justify-center gap-2 text-sm font-semibold active:scale-95 transition-transform">
          <XCircle className="w-5 h-5" /> Review
        </button>
        <button
          onClick={() => { if (!flipped) { setFlipped(true); } else { advance("right"); } }}
          className="flex-1 h-14 rounded-2xl border-2 border-green-500/30 bg-green-500/10 text-green-400 flex items-center justify-center gap-2 text-sm font-semibold active:scale-95 transition-transform">
          <CheckCircle2 className="w-5 h-5" /> {flipped ? "Known" : "Reveal"}
        </button>
      </div>
    </div>
  );
}