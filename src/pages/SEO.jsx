import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import KeywordEngine from "@/components/seo/KeywordEngine";
import ContentGenerator from "@/components/seo/ContentGenerator";
import SEOAnalyzer from "@/components/seo/SEOAnalyzer";
import ProgrammaticSEO from "@/components/seo/ProgrammaticSEO";
import SEODashboard from "@/components/seo/SEODashboard";
import { BarChart2, Search, FileText, Zap, Target } from "lucide-react";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart2 },
  { id: "keywords", label: "Keywords", icon: Search },
  { id: "content", label: "Content", icon: FileText },
  { id: "analyzer", label: "Analyzer", icon: Target },
  { id: "programmatic", label: "Programmatic", icon: Zap },
];

export default function SEO() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("dashboard");

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const tabBg = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const sub = isDark ? "text-white/40" : "text-gray-400";

  return (
    <div className={`${bg} min-h-screen pb-24`}>
      <div className="max-w-2xl mx-auto px-5">
        {/* Header */}
        <div className="pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚀</span>
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>SEO Engine</h1>
          </div>
          <p className={`text-sm ${sub}`}>AI-powered SEO — keywords, content, analysis & programmatic scale</p>
        </div>

        {/* Tab Bar */}
        <div className={`${tabBg} rounded-2xl p-1 flex gap-1 mb-6 overflow-x-auto scrollbar-hide`}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all min-w-[60px] ${
                activeTab === id
                  ? "text-white"
                  : `${sub} hover:${isDark ? "text-white/60" : "text-gray-600"}`
              }`}
              style={activeTab === id ? { background: "linear-gradient(135deg, #A855F7, #6366F1)" } : {}}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "dashboard" && <SEODashboard />}
        {activeTab === "keywords" && <KeywordEngine />}
        {activeTab === "content" && <ContentGenerator />}
        {activeTab === "analyzer" && <SEOAnalyzer />}
        {activeTab === "programmatic" && <ProgrammaticSEO />}
      </div>
    </div>
  );
}