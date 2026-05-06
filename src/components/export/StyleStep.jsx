import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";

const STYLES_BY_PURPOSE = {
  meeting: [
    {
      id: "mckinsey",
      label: "McKinsey Style",
      desc: "Corporate consulting format with key insights and recommendations",
      preview: "Executive insights • Key findings • Strategic recommendations",
      icon: "📊",
      tone: "executive"
    },
    {
      id: "government",
      label: "Government Style",
      desc: "Official government report format with formal structure",
      preview: "Meeting summary • Decisions • Action items • Next steps",
      icon: "🏛️",
      tone: "formal"
    },
    {
      id: "professional",
      label: "Professional Style",
      desc: "Standard business meeting notes with clean formatting",
      preview: "Attendees • Topics discussed • Decisions • Follow-ups",
      icon: "💼",
      tone: "professional"
    },
  ],
  lecture: [
    {
      id: "friendly",
      label: "Friendly Learning",
      desc: "Conversational style with relatable explanations and tips",
      preview: "Key concepts • Think of it this way... • Pro tips • Remember...",
      icon: "😊",
      tone: "conversational"
    },
    {
      id: "structured",
      label: "Structured Study Notes",
      desc: "Organized notes optimized for learning and test preparation",
      preview: "Learning objectives • Key points • Examples • Practice questions",
      icon: "📚",
      tone: "academic"
    },
    {
      id: "flashcard",
      label: "Flashcards",
      desc: "Question-and-answer format perfect for quick review and memorization",
      preview: "Q: What is...? → A: Definition and context",
      icon: "🎓",
      tone: "concise"
    },
    {
      id: "teacher",
      label: "Teacher Mode",
      desc: "Detailed guide designed for educators to teach the content",
      preview: "Teaching points • Student misconceptions • Activities • Assessment",
      icon: "👨‍🏫",
      tone: "instructional"
    },
  ],
  class: [
    {
      id: "friendly",
      label: "Friendly Learning",
      desc: "Conversational style with relatable explanations",
      preview: "Key concepts • Easy explanations • Tips • Reminders",
      icon: "😊",
      tone: "conversational"
    },
    {
      id: "structured",
      label: "Structured Study Notes",
      desc: "Organized for exam prep and comprehensive understanding",
      preview: "Topics • Definitions • Examples • Study guide",
      icon: "📚",
      tone: "academic"
    },
    {
      id: "flashcard",
      label: "Flashcards",
      desc: "Quick Q&A format for rapid review",
      preview: "Q & A format optimized for memory retention",
      icon: "🎓",
      tone: "concise"
    },
    {
      id: "teacher",
      label: "Teacher Mode",
      desc: "Guide for teaching the material",
      preview: "Teaching strategies • Key points • Student activities",
      icon: "👨‍🏫",
      tone: "instructional"
    },
  ],
  workshop: [
    {
      id: "professional",
      label: "Professional Style",
      desc: "Formal workshop summary with outcomes",
      preview: "Workshop overview • Key learnings • Deliverables • Next steps",
      icon: "💼",
      tone: "professional"
    },
    {
      id: "friendly",
      label: "Friendly Learning",
      desc: "Conversational workshop recap with practical insights",
      preview: "What we learned • Takeaways • How to apply it • Resources",
      icon: "😊",
      tone: "conversational"
    },
  ],
  strategy: [
    {
      id: "mckinsey",
      label: "McKinsey Style",
      desc: "Strategic consulting framework with analysis and recommendations",
      preview: "Situation • Insights • Recommendations • Implementation roadmap",
      icon: "📊",
      tone: "executive"
    },
    {
      id: "professional",
      label: "Professional Style",
      desc: "Clear strategic document with business focus",
      preview: "Objectives • Strategy • Key actions • Timeline",
      icon: "💼",
      tone: "professional"
    },
  ],
  brainstorm: [
    {
      id: "friendly",
      label: "Friendly Learning",
      desc: "Creative brainstorm summary with enthusiasm",
      preview: "All ideas listed • Grouped by theme • Potential • Next actions",
      icon: "😊",
      tone: "conversational"
    },
    {
      id: "structured",
      label: "Structured Study Notes",
      desc: "Organized ideas categorized by relevance and feasibility",
      preview: "Category • Ideas • Evaluation • Priority ranking",
      icon: "📚",
      tone: "academic"
    },
  ],
  idea: [
    {
      id: "mckinsey",
      label: "McKinsey Style",
      desc: "Polished concept with business case and metrics",
      preview: "Problem statement • Solution • Business case • Success metrics",
      icon: "📊",
      tone: "executive"
    },
    {
      id: "professional",
      label: "Professional Style",
      desc: "Professional pitch document with clear value proposition",
      preview: "Overview • Benefits • Implementation • ROI",
      icon: "💼",
      tone: "professional"
    },
  ],
};

// Default styles per purpose
const DEFAULT_STYLE = {
  meeting: "professional",
  lecture: "structured",
  class: "structured",
  workshop: "professional",
  strategy: "mckinsey",
  brainstorm: "friendly",
  idea: "professional",
};

export default function StyleStep({ selections, onSelection }) {
  const { isDark } = useTheme();
  const styles = STYLES_BY_PURPOSE[selections.purpose] || [];
  const isMultiSelect = selections.purpose === "meeting";

  // Auto-set default style if not already selected
  useEffect(() => {
    if (!selections.style && selections.purpose) {
      const defaultStyle = DEFAULT_STYLE[selections.purpose];
      if (defaultStyle) {
        onSelection("style", defaultStyle);
      }
    }
  }, [selections.purpose, selections.style, onSelection]);

  const handleSelect = (styleId) => {
    if (isMultiSelect) {
      const selectedStyles = selections.style ? selections.style.split(",") : [];
      if (selectedStyles.includes(styleId)) {
        const updated = selectedStyles.filter(s => s !== styleId);
        onSelection("style", updated.length > 0 ? updated.join(",") : null);
      } else {
        onSelection("style", [...selectedStyles, styleId].join(","));
      }
    } else {
      onSelection("style", styleId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {styles.map((style, idx) => {
          const selectedStyles = selections.style ? selections.style.split(",") : [];
          const isSelected = isMultiSelect ? selectedStyles.includes(style.id) : selections.style === style.id;

          return (
            <motion.button
              key={style.id}
              onClick={() => handleSelect(style.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
              className={`w-full p-5 rounded-2xl text-left transition-all border-2 ${
                isSelected
                  ? `border-blue-500 ${isDark ? "bg-blue-500/10" : "bg-blue-50"} shadow-md`
                  : `border-transparent ${isDark ? "bg-[#1C1C1E] hover:bg-[#2C2C2E]" : "bg-white hover:bg-gray-50"}`
              }`}
            >
              {/* Style Icon and Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl flex-shrink-0">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
                      {style.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#A1A1A6] mt-1">
                      {style.desc}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 ml-3 mt-1">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Preview Snippet */}
              <div className={`px-3 py-2 rounded-lg text-xs ${isDark ? "bg-black/30" : "bg-gray-100"}`}>
                <p className={isDark ? "text-[#A1A1A6]" : "text-gray-600"}>
                  {style.preview}
                </p>
              </div>

              {/* Tone Badge */}
              <div className="mt-3 flex gap-2">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  isSelected
                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                    : isDark
                    ? "bg-[#3A3A3C] text-[#A1A1A6]"
                    : "bg-gray-200 text-gray-700"
                }`}>
                  {style.tone}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Info Note */}
      {selections.style && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border ${isDark ? "bg-[#1C1C1E] border-[#3A3A3C]" : "bg-blue-50 border-blue-200"}`}
        >
          <p className={`text-xs font-medium ${isDark ? "text-blue-400" : "text-blue-700"}`}>
            ℹ️ AI will adapt the output to match the <strong>{STYLES_BY_PURPOSE[selections.purpose]?.find(s => s.id === selections.style)?.label}</strong> format and tone
          </p>
        </motion.div>
      )}
    </div>
  );
}