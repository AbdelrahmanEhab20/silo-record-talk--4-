import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";
import { Check } from "lucide-react";

export default function CustomizationStep({ selections, onSelection }) {
  const { isDark } = useTheme();

  const toggleSwitch = (key) => {
    onSelection(key, !selections[key]);
  };

  const toggleOptions = [
    { key: "includeTranscript", label: "Include Transcript", desc: "Full text of the recording" },
    { key: "includeTimestamps", label: "Include Timestamps", desc: "Time markers for each section" },
  ];

  const toneOptions = [
    { value: "formal", label: "Formal", desc: "Professional tone" },
    { value: "professional", label: "Professional", desc: "Balanced approach" },
    { value: "casual", label: "Casual", desc: "Conversational style" },
  ];

  const lengthOptions = [
    { value: "short", label: "Short", desc: "Essential points only" },
    { value: "balanced", label: "Balanced", desc: "Complete summary" },
    { value: "detailed", label: "Detailed", desc: "Comprehensive coverage" },
  ];

  return (
    <div className="space-y-6">
      {/* Toggles */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider px-1">
          Content Options
        </p>
        {toggleOptions.map((option, idx) => (
          <motion.button
            key={option.key}
            onClick={() => toggleSwitch(option.key)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.2 }}
            className={`w-full p-4 rounded-2xl text-left transition-all ${
              isDark ? "bg-[#1C1C1E] hover:bg-[#2C2C2E]" : "bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-[#A1A1A6] mt-1">
                  {option.desc}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition-colors ${
                selections[option.key]
                  ? "bg-blue-500"
                  : isDark
                  ? "bg-[#3A3A3C]"
                  : "bg-gray-300"
              }`}>
                {selections[option.key] && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Tone Selection */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider px-1">
          Tone
        </p>
        <div className="grid grid-cols-3 gap-2">
          {toneOptions.map((tone, idx) => {
            const isSelected = selections.tone === tone.value;
            return (
              <motion.button
                key={tone.value}
                onClick={() => onSelection("tone", tone.value)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.2 }}
                className={`p-3 rounded-xl text-center transition-all ${
                  isSelected
                    ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : isDark
                    ? "bg-[#1C1C1E] hover:bg-[#2C2C2E]"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <p className={`text-[13px] font-medium ${
                  isSelected
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-900 dark:text-white"
                }`}>
                  {tone.label}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-[#A1A1A6] mt-1">
                  {tone.desc}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Length Selection */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider px-1">
          Length
        </p>
        <div className="grid grid-cols-3 gap-2">
          {lengthOptions.map((length, idx) => {
            const isSelected = selections.length === length.value;
            return (
              <motion.button
                key={length.value}
                onClick={() => onSelection("length", length.value)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.2 }}
                className={`p-3 rounded-xl text-center transition-all ${
                  isSelected
                    ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : isDark
                    ? "bg-[#1C1C1E] hover:bg-[#2C2C2E]"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <p className={`text-[13px] font-medium ${
                  isSelected
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-900 dark:text-white"
                }`}>
                  {length.label}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-[#A1A1A6] mt-1">
                  {length.desc}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}