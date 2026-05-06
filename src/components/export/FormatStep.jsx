import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";
import { FileText, File, Presentation } from "lucide-react";

const FORMATS = [
  { id: "PDF", label: "PDF", desc: "Universal format, best for sharing", icon: FileText, color: "red" },
  { id: "DOCX", label: "Word Document", desc: "Editable in Microsoft Word", icon: File, color: "blue" },
  { id: "PPTX", label: "PowerPoint", desc: "Presentation format", icon: Presentation, color: "orange" },
  { id: "TXT", label: "Text", desc: "Plain text, minimal formatting", icon: FileText, color: "gray" },
];

export default function FormatStep({ selections, onSelection }) {
  const { isDark } = useTheme();

  return (
    <div className="space-y-3">
      {FORMATS.map((format, idx) => {
        const Icon = format.icon;
        const isSelected = selections.format === format.id;

        return (
          <motion.button
            key={format.id}
            onClick={() => onSelection("format", format.id)}
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
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                format.color === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                format.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                format.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
                'bg-gray-100 dark:bg-gray-800/50'
              }`}>
                <Icon className={`w-5 h-5 ${
                  format.color === 'red' ? 'text-red-600 dark:text-red-400' :
                  format.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                  format.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                  'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                  {format.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-[#A1A1A6] mt-1">
                  {format.desc}
                </p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
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