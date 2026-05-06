import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";
import { Download, Check } from "lucide-react";
import { appClient } from "@/api/appClient";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";

export default function ExportButton({ selections, sessionId }) {
  const { isDark } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch session data
      const sessions = await appClient.entities.Session.list("-created_date", 100);
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) {
        throw new Error("Session not found");
      }

      const fileName = `${session.title || "export"}.${selections.format.toLowerCase()}`;

      if (selections.format === "PDF") {
        generatePDF(session, fileName);
      } else if (selections.format === "DOCX") {
        generateDOCX(session, fileName);
      } else if (selections.format === "TXT") {
        generateTXT(session, fileName);
      }

      setIsComplete(true);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDF = (session, fileName) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(session.title || "Untitled Session", margin, yPos);
    yPos += 10;

    // Date and Duration
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const date = new Date(session.created_date);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const durationMin = Math.round((session.duration || 0) / 60);
    doc.text(`${dateStr} • ${timeStr} • ${durationMin} min`, margin, yPos);
    yPos += 8;

    // Divider
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Content
    doc.setFontSize(11);
    const contentText = Array.isArray(session.summary_text)
      ? session.summary_text.join("\n\n")
      : session.summary_text || "No content available";

    const lines = doc.splitTextToSize(contentText, contentWidth);
    lines.forEach((line) => {
      if (yPos > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    });

    // Download
    doc.save(fileName);
  };

  const generateDOCX = async (session, fileName) => {
    const contentText = Array.isArray(session.summary_text)
      ? session.summary_text.join("\n\n")
      : session.summary_text || "No content available";

    const date = new Date(session.created_date);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const durationMin = Math.round((session.duration || 0) / 60);

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: session.title || "Untitled Session",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `${dateStr} • ${timeStr} • ${durationMin} min`,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: contentText,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateTXT = (session, fileName) => {
    const date = new Date(session.created_date);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const durationMin = Math.round((session.duration || 0) / 60);

    const contentText = Array.isArray(session.summary_text)
      ? session.summary_text.join("\n\n")
      : session.summary_text || "No content available";

    const text = `${session.title || "Untitled Session"}\n${dateStr} • ${timeStr} • ${durationMin} min\n\n${contentText}`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isComplete) {
    return (
      <motion.button
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-2xl transition-colors min-h-[44px] flex items-center justify-center gap-2"
      >
        <Check className="w-5 h-5" />
        Export Complete
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={handleExport}
      disabled={isExporting}
      whileTap={{ scale: 0.98 }}
      className={`w-full font-medium py-3 rounded-2xl transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
        isExporting
          ? `${isDark ? "bg-gray-700" : "bg-gray-300"} text-gray-600 cursor-not-allowed`
          : "bg-blue-500 hover:bg-blue-600 text-white"
      }`}
    >
      {isExporting ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          Export to {selections.format}
        </>
      )}
    </motion.button>
  );
}