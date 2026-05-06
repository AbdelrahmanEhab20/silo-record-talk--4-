import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";
import { BookOpen, Lightbulb, Zap, Users, Briefcase, Brain } from "lucide-react";

const PURPOSES = [
  { id: "meeting", label: "Meeting", icon: Users, color: "blue" },
  { id: "lecture", label: "Lecture", icon: BookOpen, color: "purple" },
  { id: "workshop", label: "Workshop", icon: Zap, color: "orange" },
  { id: "class", label: "Class", icon: Users, color: "green" },
  { id: "idea", label: "Idea", icon: Lightbulb, color: "yellow" },
  { id: "brainstorm", label: "Brainstorm", icon: Brain, color: "pink" },
  { id: "strategy", label: "Strategy", icon: Briefcase, color: "indigo" },
];

const colorMap = {
  blue: "from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-950/20",
  purple: "from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-950/20",
  orange: "from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-950/20",
  green: "from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-950/20",
  yellow: "from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-950/20",
  pink: "from-pink-100 to-pink-50 dark:from-pink-900/30 dark:to-pink-950/20",
  indigo: "from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-950/20",
};

const iconColorMap = {
  blue: "text-blue-600 dark:text-blue-400",
  purple: "text-purple-600 dark:text-purple-400",
  orange: "text-orange-600 dark:text-orange-400",
  green: "text-green-600 dark:text-green-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  pink: "text-pink-600 dark:text-pink-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
};

export default function PurposeStep({ selections, onSelection }) {
  const { isDark } = useTheme();

  return (
    <div className="space-y-3">
      {PURPOSES.map((purpose, idx) => {
        const Icon = purpose.icon;
        const isSelected = selections.purpose === purpose.id;

        return (
          <motion.button
            key={purpose.id}
            onClick={() => onSelection("purpose", purpose.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.2 }}
            className={`w-full p-4 rounded-2xl text-left transition-all ${
              isSelected
                ? "ring-2 ring-blue-500 shadow-md"
                : isDark
                ? "bg-[#1C1C1E] hover:bg-[#2C2C2E]"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[purpose.color]} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColorMap[purpose.color]}`} />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                  {purpose.label}
                </p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}