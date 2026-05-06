import React, { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, HelpCircle, Loader2, Zap, GraduationCap } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { format, addDays } from "date-fns";

const QUIZ_DIFFICULTIES = [
  { key: "easy", label: "Easy", color: "bg-green-500/15 text-green-400 border-green-500/25 hover:bg-green-500/25" },
  { key: "medium", label: "Medium", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25 hover:bg-yellow-500/25" },
  { key: "hard", label: "Hard", color: "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/25" },
];

// Spaced repetition intervals (days) based on score
function getNextInterval(scorePct, difficulty) {
  if (scorePct >= 80) return difficulty === "hard" ? 7 : 14;
  if (scorePct >= 60) return difficulty === "hard" ? 3 : 7;
  return 1; // review tomorrow if struggling
}

export default function EducationalToolsPanel({ session, transcript, summary, onFlashcardsGenerated, onQuizGenerated }) {
  const { isDark } = useTheme();
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(null);
  const [error, setError] = useState(null);
  const [scheduled, setScheduled] = useState(null); // { type, date }

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/50" : "text-gray-500";

  const context = transcript || summary || "";

  const saveStudyRecord = async ({ activityType, score, totalItems, difficulty }) => {
    try {
      const user = await base44.auth.me();
      const intervalDays = activityType === "quiz"
        ? getNextInterval(score, difficulty)
        : 3; // flashcards default: review in 3 days
      const nextReview = format(addDays(new Date(), intervalDays), "yyyy-MM-dd");
      await base44.entities.StudyRecord.create({
        user_email: user.email,
        session_id: session?.id,
        session_title: session?.title,
        session_type: session?.session_type,
        activity_type: activityType,
        score,
        total_items: totalItems,
        difficulty: difficulty || undefined,
        study_date: format(new Date(), "yyyy-MM-dd"),
        next_review_date: nextReview,
        review_interval_days: intervalDays,
        tags: session?.tags || [],
      });
      setScheduled({ type: activityType, date: nextReview, intervalDays });
    } catch (e) {
      console.warn("Failed to save study record:", e);
    }
  };

  const handleGenerateFlashcards = async () => {
    setLoadingFlashcards(true);
    setError(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert educator. Generate 10 study flashcards from the following educational session content.
Each flashcard should test a key concept, term, or fact from the session.
Return a JSON array of objects with these fields:
- front: the question or term (concise)
- back: the answer or definition
- category: topic category (short label)
- visual_hint: a single relevant emoji

Only return the JSON array, no other text.

Session content:
${context.slice(0, 6000)}`,
        response_json_schema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" },
                  category: { type: "string" },
                  visual_hint: { type: "string" },
                }
              }
            }
          }
        }
      });
      const cards = result?.flashcards || [];
      onFlashcardsGenerated(cards);
      await saveStudyRecord({ activityType: "flashcards", score: cards.length, totalItems: cards.length });
    } catch (e) {
      setError("Failed to generate flashcards. Try again.");
    }
    setLoadingFlashcards(false);
  };

  const handleGenerateQuiz = async (difficulty) => {
    setLoadingQuiz(difficulty);
    setError(null);
    try {
      const difficultyGuide = {
        easy: "basic recall and recognition questions with obvious answers",
        medium: "comprehension and application questions requiring understanding",
        hard: "analysis, synthesis, and critical thinking questions"
      };
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert educator. Generate 8 multiple-choice quiz questions at ${difficulty} difficulty from the following educational session content.
Difficulty level: ${difficultyGuide[difficulty]}

Each question must have:
- question: the question text
- options: array of exactly 4 answer choices (strings)
- correct_index: the index (0-3) of the correct answer
- explanation: brief explanation of why the answer is correct
- difficulty: "${difficulty}"

Return a JSON object with a "quiz" array. Only return the JSON, no other text.

Session content:
${context.slice(0, 6000)}`,
        response_json_schema: {
          type: "object",
          properties: {
            quiz: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_index: { type: "number" },
                  explanation: { type: "string" },
                  difficulty: { type: "string" },
                }
              }
            }
          }
        }
      });
      const quizItems = result?.quiz || [];
      onQuizGenerated(quizItems, (scorePct) => {
        saveStudyRecord({ activityType: "quiz", score: scorePct, totalItems: quizItems.length, difficulty });
      });
    } catch (e) {
      setError("Failed to generate quiz. Try again.");
    }
    setLoadingQuiz(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 mb-8 ${card}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${textMain}`}>Learning Tools</p>
          <p className={`text-xs ${textSub}`}>AI-powered study aids from this session</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Flashcards */}
        <button
          onClick={handleGenerateFlashcards}
          disabled={loadingFlashcards || !!loadingQuiz || !context}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
            isDark
              ? "border-white/8 bg-white/4 hover:bg-purple-500/10 hover:border-purple-500/30"
              : "border-gray-200 bg-gray-50 hover:bg-purple-50 hover:border-purple-300"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
          <div className="flex-1">
            <p className={`text-sm font-medium ${textMain}`}>Generate Flashcards</p>
            <p className={`text-xs ${textSub}`}>10 study cards from session content</p>
          </div>
          {loadingFlashcards && <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />}
        </button>

        {/* Quiz */}
        <div className={`rounded-xl border p-3 ${isDark ? 'border-white/8 bg-white/4' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-2.5">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <p className={`text-sm font-medium ${textMain}`}>Generate Quiz</p>
          </div>
          <div className="flex gap-2">
            {QUIZ_DIFFICULTIES.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => handleGenerateQuiz(key)}
                disabled={loadingFlashcards || !!loadingQuiz || !context}
                className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${color} disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1`}
              >
                {loadingQuiz === key
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-400 text-center">{error}</p>}

      {/* Scheduled review confirmation */}
      {scheduled && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className={`mt-3 rounded-xl p-3 flex items-center gap-2 text-xs ${isDark ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-green-50 border border-green-200 text-green-700"}`}>
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span>
            Next review scheduled for <strong>{format(new Date(scheduled.date), "MMM d")}</strong>
            {" "}(in {scheduled.intervalDays} day{scheduled.intervalDays !== 1 ? "s" : ""}) — tracked in Learning Progress
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}