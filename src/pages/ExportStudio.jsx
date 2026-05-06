import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@/lib/ThemeContext";
import PurposeStep from "@/components/export/PurposeStep";
import StyleStep from "@/components/export/StyleStep";
import FormatStep from "@/components/export/FormatStep";
import TemplateStep from "@/components/export/TemplateStep";
import CustomizationStep from "@/components/export/CustomizationStep";
import PreviewStep from "@/components/export/PreviewStep";
import ExportButton from "@/components/export/ExportButton";

const STEPS = [
  { id: 1, title: "Purpose", component: PurposeStep },
  { id: 2, title: "Style", component: StyleStep },
  { id: 3, title: "Format", component: FormatStep },
  { id: 4, title: "Template", component: TemplateStep },
  { id: 5, title: "Customize", component: CustomizationStep },
  { id: 6, title: "Preview", component: PreviewStep },
];

export default function ExportStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const { isDark } = useTheme();

  const [currentStep, setCurrentStep] = useState(1);
  const [selections, setSelections] = useState({
    purpose: null,
    style: null,
    format: "PDF",
    template: "professional",
    includeTranscript: true,
    includeTimestamps: true,
    tone: "professional",
    length: "balanced",
  });

  const handleSelection = (key, value) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]'
    }`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-opacity-80 backdrop-blur-md transition-colors duration-300 border-b border-gray-200 dark:border-[#3A3A3C]" 
           style={{ backgroundColor: isDark ? 'rgba(10, 10, 10, 0.8)' : 'rgba(245, 245, 247, 0.8)' }}>
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 1 ? "Cancel" : "Back"}
            </button>
            <span className="text-xs font-semibold text-gray-500 dark:text-[#A1A1A6] tracking-wider">
              STEP {currentStep} OF {STEPS.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-gray-200 dark:bg-[#3A3A3C] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                {STEPS[currentStep - 1].title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-[#A1A1A6] mb-6">
                {currentStep === 1 && "What type of session is this?"}
                {currentStep === 2 && "How should the content be presented?"}
                {currentStep === 3 && "Choose your export format"}
                {currentStep === 4 && "Select a document template"}
                {currentStep === 5 && "Fine-tune your export"}
                {currentStep === 6 && "Review your export"}
              </p>

              <CurrentStepComponent
                selections={selections}
                onSelection={handleSelection}
                sessionId={sessionId}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Actions - Sticky */}
      <div className="flex-shrink-0 bg-opacity-80 backdrop-blur-md border-t border-gray-200 dark:border-[#3A3A3C] transition-colors duration-300"
           style={{ backgroundColor: isDark ? 'rgba(10, 10, 10, 0.8)' : 'rgba(245, 245, 247, 0.8)' }}>
        <div className="max-w-lg mx-auto px-5 py-4">
          {currentStep === STEPS.length ? (
            <ExportButton selections={selections} sessionId={sessionId} />
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-2xl transition-colors min-h-[44px]"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}