import React from "react";
import { motion } from "framer-motion";
import { Download, Lightbulb } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import jsPDF from "jspdf";

export default function StructuredNotes({ content }) {
  const { isDark } = useTheme();

  if (!content) return null;

  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/60" : "text-gray-500";
  const card = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";
  const sectionBg = isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200";

  const exportPDF = () => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const lineHeight = 5;
    let yPos = margin;

    const addNewPageIfNeeded = (height) => {
      if (yPos + height > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
      }
    };

    // Title
    pdf.setFontSize(18);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(0, 0, 0);
    const titleLines = pdf.splitTextToSize(content.title, pageWidth - 2 * margin);
    pdf.text(titleLines, margin, yPos);
    yPos += titleLines.length * lineHeight + 5;

    // Sections
    if (content.sections) {
      content.sections.forEach((section) => {
        addNewPageIfNeeded(10);

        // Section Heading
        pdf.setFontSize(14);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(102, 102, 255);
        const headingLines = pdf.splitTextToSize(section.heading, pageWidth - 2 * margin);
        pdf.text(headingLines, margin, yPos);
        yPos += headingLines.length * lineHeight + 3;

        // Points
        section.points.forEach((point) => {
          addNewPageIfNeeded(15);

          // Bullet
          pdf.setFontSize(11);
          pdf.setFont(undefined, "bold");
          pdf.setTextColor(0, 0, 0);
          const bulletLines = pdf.splitTextToSize(`• ${point.bullet}`, pageWidth - 2 * margin - 5);
          pdf.text(bulletLines, margin + 5, yPos);
          yPos += bulletLines.length * lineHeight;

          // Explanation
          pdf.setFontSize(10);
          pdf.setFont(undefined, "normal");
          pdf.setTextColor(80, 80, 80);
          const explainLines = pdf.splitTextToSize(point.explanation, pageWidth - 2 * margin - 10);
          pdf.text(explainLines, margin + 10, yPos);
          yPos += explainLines.length * lineHeight + 2;
        });

        yPos += 3;
      });
    }

    // Action Items
    if (content.action_items && content.action_items.length > 0) {
      addNewPageIfNeeded(15);

      pdf.setFontSize(14);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(102, 102, 255);
      pdf.text("Action Items", margin, yPos);
      yPos += lineHeight + 2;

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      pdf.setTextColor(0, 0, 0);
      content.action_items.forEach((item) => {
        const itemLines = pdf.splitTextToSize(`✓ ${item}`, pageWidth - 2 * margin - 5);
        addNewPageIfNeeded(itemLines.length * lineHeight);
        pdf.text(itemLines, margin + 5, yPos);
        yPos += itemLines.length * lineHeight + 1;
      });
    }

    // Key Definitions
    if (content.key_definitions && content.key_definitions.length > 0) {
      addNewPageIfNeeded(15);

      pdf.setFontSize(14);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(102, 102, 255);
      pdf.text("Key Definitions", margin, yPos);
      yPos += lineHeight + 2;

      pdf.setFontSize(10);
      content.key_definitions.forEach((def) => {
        addNewPageIfNeeded(10);

        pdf.setFont(undefined, "bold");
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${def.term}:`, margin, yPos);
        yPos += lineHeight;

        pdf.setFont(undefined, "normal");
        pdf.setTextColor(80, 80, 80);
        const defLines = pdf.splitTextToSize(def.definition, pageWidth - 2 * margin - 5);
        pdf.text(defLines, margin + 5, yPos);
        yPos += defLines.length * lineHeight + 2;
      });
    }

    pdf.save(`${content.title || "structured-notes"}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border p-6 ${card}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className={`text-lg font-bold ${textMain}`}>{content.title}</p>
          <p className={`text-xs ${textSub} mt-1`}>Well-structured study notes</p>
        </div>
        <button
          onClick={exportPDF}
          className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-xs font-medium flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {content.sections?.map((section, sIdx) => (
          <motion.div
            key={sIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 }}
            className={`rounded-xl border p-4 ${sectionBg}`}
          >
            <h3 className={`text-sm font-bold mb-3 ${textMain}`}>{section.heading}</h3>
            <div className="space-y-3">
              {section.points?.map((point, pIdx) => (
                <div key={pIdx} className="space-y-1">
                  <p className={`text-xs font-semibold ${textMain} flex items-start gap-2`}>
                    <span className="text-purple-400 mt-0.5">•</span>
                    {point.bullet}
                  </p>
                  <p className={`text-xs leading-relaxed ml-4 ${textSub}`}>{point.explanation}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action Items */}
      {content.action_items && content.action_items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-xl border p-4 mt-5 ${sectionBg}`}
        >
          <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textMain}`}>
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Action Items
          </h3>
          <div className="space-y-2">
            {content.action_items.map((item, idx) => (
              <p key={idx} className={`text-xs ${textSub} flex items-start gap-2`}>
                <span className="text-green-500 mt-0.5">✓</span>
                {item}
              </p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Definitions */}
      {content.key_definitions && content.key_definitions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`rounded-xl border p-4 mt-5 ${sectionBg}`}
        >
          <h3 className={`text-sm font-bold mb-3 ${textMain}`}>Key Definitions</h3>
          <div className="space-y-2">
            {content.key_definitions.map((def, idx) => (
              <div key={idx}>
                <p className={`text-xs font-semibold ${textMain}`}>{def.term}</p>
                <p className={`text-xs ${textSub} ml-2`}>{def.definition}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}