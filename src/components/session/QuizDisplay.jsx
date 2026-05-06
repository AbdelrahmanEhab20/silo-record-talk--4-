import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy, X } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function QuizDisplay({ quiz, onClose, onScoreSubmitted }) {
  const { isDark } = useTheme();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]); // { questionIdx, selectedIdx, correct }
  const [finished, setFinished] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  if (!quiz || quiz.length === 0) return null;

  const current = quiz[currentIdx];
  const card = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/50" : "text-gray-500";

  const difficultyColors = {
    easy: "bg-green-500/15 text-green-400 border-green-500/25",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    hard: "bg-red-500/15 text-red-400 border-red-500/25",
  };

  const handleSelect = (optionIdx) => {
    if (selected !== null) return;
    const isCorrect = optionIdx === current.correct_index;
    setSelected(optionIdx);
    setAnswers(prev => [...prev, { questionIdx: currentIdx, selectedIdx: optionIdx, correct: isCorrect }]);
  };

  const handleNext = () => {
    if (currentIdx < quiz.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    } else {
      setFinished(true);
      // Fire score callback once when quiz finishes
      if (!scoreSaved && onScoreSubmitted) {
        const finalAnswers = [...answers];
        const pct = Math.round((finalAnswers.filter(a => a.correct).length / quiz.length) * 100);
        onScoreSubmitted(pct);
        setScoreSaved(true);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  };

  const score = answers.filter(a => a.correct).length;

  if (finished) {
    const pct = Math.round((score / quiz.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl border p-6 ${card} text-center`}>
        <div className="flex items-center justify-between mb-4">
          <p className={`text-sm font-semibold ${textMain}`}>Quiz Results</p>
          <button onClick={onClose} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/8 text-white/40 hover:bg-white/12' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: pct >= 70 ? 'linear-gradient(135deg, #10B981, #059669)' : pct >= 40 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <p className={`text-3xl font-bold mb-1 ${textMain}`}>{pct}%</p>
        <p className={`text-sm mb-1 ${textSub}`}>{score} / {quiz.length} correct</p>
        <p className={`text-xs mb-6 ${textSub}`}>
          {pct >= 80 ? "Excellent! 🎉" : pct >= 60 ? "Good job! Keep going." : "Keep practicing — you'll get there!"}
        </p>

        {/* Per-question review */}
        <div className="text-left space-y-2 mb-5">
          {quiz.map((q, i) => {
            const a = answers.find(a => a.questionIdx === i);
            return (
              <div key={i} className={`rounded-xl p-3 border text-xs flex items-start gap-2 ${
                a?.correct
                  ? isDark ? 'border-green-500/20 bg-green-500/10' : 'border-green-200 bg-green-50'
                  : isDark ? 'border-red-500/20 bg-red-500/10' : 'border-red-200 bg-red-50'
              }`}>
                {a?.correct
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-medium mb-0.5 ${textMain}`}>{q.question}</p>
                  {!a?.correct && (
                    <p className={`${isDark ? 'text-green-400' : 'text-green-700'}`}>
                      Correct: {q.options[q.correct_index]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleRestart}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border p-5 ${card}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={`text-sm font-semibold ${textMain}`}>Quiz</p>
          <p className={`text-xs ${textSub}`}>{currentIdx + 1} / {quiz.length}</p>
        </div>
        <div className="flex items-center gap-2">
          {current.difficulty && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${difficultyColors[current.difficulty] || difficultyColors.medium}`}>
              {current.difficulty}
            </span>
          )}
          <button onClick={onClose} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/8 text-white/40 hover:bg-white/12' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-1 rounded-full mb-5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
        <div className="h-full rounded-full bg-purple-500 transition-all duration-300"
          style={{ width: `${((currentIdx) / quiz.length) * 100}%` }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <p className={`text-base font-semibold mb-5 leading-snug ${textMain}`}>{current.question}</p>

          {/* Options */}
          <div className="space-y-2.5 mb-5">
            {current.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === current.correct_index;
              const showResult = selected !== null;

              let optStyle = isDark
                ? 'border-white/10 bg-white/4 text-white/80 hover:border-purple-500/40 hover:bg-purple-500/10'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-purple-400 hover:bg-purple-50';

              if (showResult) {
                if (isCorrect) optStyle = isDark
                  ? 'border-green-500/40 bg-green-500/15 text-green-300'
                  : 'border-green-400 bg-green-50 text-green-800';
                else if (isSelected && !isCorrect) optStyle = isDark
                  ? 'border-red-500/40 bg-red-500/15 text-red-300'
                  : 'border-red-400 bg-red-50 text-red-800';
                else optStyle = isDark ? 'border-white/5 bg-white/2 text-white/30' : 'border-gray-100 bg-gray-50 text-gray-400';
              }

              return (
                <button key={i} onClick={() => handleSelect(i)} disabled={selected !== null}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all flex items-center gap-3 ${optStyle}`}>
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                    showResult && isCorrect ? 'border-green-400 text-green-400' :
                    showResult && isSelected && !isCorrect ? 'border-red-400 text-red-400' :
                    isDark ? 'border-white/20 text-white/40' : 'border-gray-300 text-gray-400'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                  {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto shrink-0" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {selected !== null && current.explanation && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className={`rounded-xl p-3 mb-4 text-xs leading-relaxed ${isDark ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
              💡 {current.explanation}
            </motion.div>
          )}

          {/* Next button */}
          {selected !== null && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={handleNext}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors"
              style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}>
              {currentIdx < quiz.length - 1 ? 'Next Question' : 'See Results'}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}