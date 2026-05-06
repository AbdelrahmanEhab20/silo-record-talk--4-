import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";

const TEMPLATES = [
  {
    id: "professional",
    label: "Professional",
    description: "Clean, corporate style with headers and sections",
    preview: "📋",
    colors: { primary: "#1F2937", accent: "#3B82F6" }
  },
  {
    id: "modern",
    label: "Modern",
    description: "Contemporary design with cards and highlights",
    preview: "✨",
    colors: { primary: "#000000", accent: "#8B5CF6" }
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Simple and clean with minimal styling",
    preview: "—",
    colors: { primary: "#6B7280", accent: "#9CA3AF" }
  },
  {
    id: "colorful",
    label: "Colorful",
    description: "Vibrant design with gradient accents",
    preview: "🎨",
    colors: { primary: "#EC4899", accent: "#F59E0B" }
  },
  {
    id: "academic",
    label: "Academic",
    description: "Formal style suited for research and papers",
    preview: "📚",
    colors: { primary: "#1E3A8A", accent: "#DC2626" }
  },
  {
    id: "casual",
    label: "Casual",
    description: "Friendly and approachable design",
    preview: "😊",
    colors: { primary: "#059669", accent: "#F97316" }
  },
];

export default function TemplateStep({ selections, onSelection }) {
  const { isDark } = useTheme();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((template, idx) => {
          const isSelected = selections.template === template.id;

          return (
            <motion.button
              key={template.id}
              onClick={() => onSelection("template", template.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
              className={`p-4 rounded-2xl text-left transition-all ${
                isSelected
                  ? "ring-2 ring-blue-500 shadow-md"
                  : isDark
                  ? "bg-[#1C1C1E] hover:bg-[#2C2C2E]"
                  : "bg-white hover:bg-gray-50"
              } border ${isSelected ? "border-blue-500" : isDark ? "border-[#3A3A3C]" : "border-gray-200"}`}
            >
              {/* Preview Circle */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-3" style={{ backgroundColor: template.colors.accent + "20", color: template.colors.accent }}>
                {template.preview}
              </div>

              {/* Template Info */}
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {template.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-[#A1A1A6] mt-1 line-clamp-2">
                {template.description}
              </p>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="mt-3 flex items-center gap-1 text-xs text-blue-500 font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Selected
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Template Preview Info */}
      {selections.template && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border ${isDark ? "bg-[#1C1C1E] border-[#3A3A3C]" : "bg-blue-50 border-blue-200"}`}
        >
          <p className={`text-xs font-medium ${isDark ? "text-blue-400" : "text-blue-700"}`}>
            ℹ️ Your document will be styled using the <strong>{TEMPLATES.find(t => t.id === selections.template)?.label}</strong> template
          </p>
        </motion.div>
      )}
    </div>
  );
}