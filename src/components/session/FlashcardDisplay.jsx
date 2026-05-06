import React, { useState } from "react";
import { motion } from "framer-motion";
import { Download, ChevronLeft, ChevronRight, Printer, Layers } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import jsPDF from "jspdf";
import FlashcardDeckMode from "./FlashcardDeckMode";

export default function FlashcardDisplay({ flashcards, title, onDeckComplete }) {
  const { isDark } = useTheme();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [deckMode, setDeckMode] = useState(false);

  if (!flashcards || flashcards.length === 0) return null;

  const current = flashcards[currentIdx];
  const card = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-white/60" : "text-gray-500";

  const toggleCardSelection = (idx) => {
    const newSet = new Set(selectedCards);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelectedCards(newSet);
  };

  if (deckMode) {
    return (
      <FlashcardDeckMode
        flashcards={flashcards}
        onClose={() => setDeckMode(false)}
        onComplete={(result) => {
          setDeckMode(false);
          if (onDeckComplete) onDeckComplete(result);
        }}
      />
    );
  }

  const exportPDF = async (cardsToExport) => {
    const cards = cardsToExport.length > 0
      ? flashcards.filter((_, i) => cardsToExport.has(i))
      : [current];

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const cardWidth = 85;
    const cardHeight = 110;
    const cols = 2;
    const rows = 2;
    const padding = 10;

    let cardCount = 0;

    for (let cardIdx = 0; cardIdx < cards.length; cardIdx += cols * rows) {
      if (cardIdx > 0) pdf.addPage();

      let col = 0, row = 0;

      for (let i = 0; i < cols * rows && cardIdx + i < cards.length; i++) {
        const card = cards[cardIdx + i];
        const x = padding + col * (cardWidth + 5);
        const y = padding + row * (cardHeight + 5);

        // Card border
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, y, cardWidth, cardHeight);

        // Front side header
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text("FRONT", x + 2, y + 4);

        // Front content
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        const frontLines = pdf.splitTextToSize(card.front, cardWidth - 4);
        pdf.text(frontLines, x + 2, y + 12, { maxWidth: cardWidth - 4 });

        // Divider line
        pdf.setDrawColor(220, 220, 220);
        pdf.line(x, y + cardHeight / 2, x + cardWidth, y + cardHeight / 2);

        // Back side header
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text("BACK", x + 2, y + cardHeight / 2 + 4);

        // Back content
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        const backLines = pdf.splitTextToSize(card.back, cardWidth - 4);
        pdf.text(backLines, x + 2, y + cardHeight / 2 + 12, { maxWidth: cardWidth - 4 });

        col++;
        if (col >= cols) {
          col = 0;
          row++;
        }
      }
    }

    pdf.save(`${title || "flashcards"}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border p-5 ${card}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={`text-sm font-semibold ${textMain}`}>Study Flashcards</p>
          <p className={`text-xs ${textSub}`}>{flashcards.length} cards • {current.category}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeckMode(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 text-white"
            style={{ background: "linear-gradient(135deg,#A855F7,#6366F1)" }}
          >
            <Layers className="w-3.5 h-3.5" />
            Practice
          </button>
          <button
            onClick={() => exportPDF(selectedCards)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              isDark ? "bg-white/8 hover:bg-white/12 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Large Flashcard */}
      <motion.div
        key={currentIdx}
        onClick={() => setFlipped(!flipped)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`min-h-[280px] rounded-2xl border-2 p-8 mb-5 cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
          isDark
            ? `border-white/10 ${flipped ? "bg-gradient-to-br from-purple-900/30 to-blue-900/30" : "bg-white/5"}`
            : `border-gray-200 ${flipped ? "bg-gradient-to-br from-purple-100 to-blue-100" : "bg-gray-50"}`
        }`}
      >
        <div className={`text-xs font-semibold mb-3 ${isDark ? "text-white/40" : "text-gray-400"}`}>
          {flipped ? "BACK" : "FRONT"} (Click to flip)
        </div>
        <div className={`text-base font-semibold leading-relaxed ${textMain}`}>
          {flipped ? current.back : current.front}
        </div>
        {current.visual_hint && !flipped && (
          <div className="text-3xl mt-4">{current.visual_hint}</div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            isDark ? "bg-white/8 hover:bg-white/12" : "bg-gray-100 hover:bg-gray-200"
          } disabled:opacity-40`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className={`text-xs font-medium ${textSub}`}>{currentIdx + 1} / {flashcards.length}</p>
        <button
          onClick={() => setCurrentIdx(Math.min(flashcards.length - 1, currentIdx + 1))}
          disabled={currentIdx === flashcards.length - 1}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            isDark ? "bg-white/8 hover:bg-white/12" : "bg-gray-100 hover:bg-gray-200"
          } disabled:opacity-40`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Bulk Export */}
      {selectedCards.size > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className={`rounded-xl border p-3 text-xs ${
            isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
          }`}
        >
          <p className={`${textSub} mb-2`}>{selectedCards.size} cards selected</p>
          <button
            onClick={() => exportPDF(selectedCards)}
            className="w-full py-2 px-3 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-xs font-medium flex items-center justify-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            Export Selected for Print
          </button>
        </motion.div>
      )}

      {/* Card Selector Grid */}
      <div className={`border-t pt-3 mt-3 ${isDark ? "border-white/10" : "border-gray-200"}`}>
        <p className={`text-xs font-medium mb-2 ${textSub}`}>Select cards to export:</p>
        <div className="grid grid-cols-4 gap-2">
          {flashcards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => toggleCardSelection(idx)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCards.has(idx)
                  ? "bg-purple-500 text-white"
                  : isDark ? "bg-white/8 text-white/60 hover:bg-white/12" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}