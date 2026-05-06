import React, { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, X, Lightbulb } from "lucide-react";

export default function NaturalLanguageSearch({ transcript, onClose }) {
  const { isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const search = async () => {
    if (!query.trim() || !transcript) return;
    setLoading(true);
    setResults(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a meeting transcript search assistant. Answer the user's question based on the transcript below.

User Question: ${query}

Transcript:
${transcript}

Respond with ONLY valid JSON (no markdown) matching this structure:
{
  "answer": "Direct answer to the question in 1-2 sentences",
  "relevant_snippets": [
    { "snippet": "Exact quote from transcript", "context": "Who said it / when in meeting", "start_time": "HH:MM if available or null" }
  ],
  "summary": "Brief explanation of what was found"
}

Rules:
- Extract exact quotes from the transcript
- Include up to 3 most relevant snippets
- If answer not found, say so clearly
- Always return valid JSON`,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            relevant_snippets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  snippet: { type: "string" },
                  context: { type: "string" },
                  start_time: { type: ["string", "null"] }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });
      setResults(result);
      setExpanded(true);
    } catch (e) {
      console.error("Search failed", e);
      setResults({
        answer: "Search failed. Please try again.",
        relevant_snippets: [],
        summary: "Error searching transcript"
      });
    }
    setLoading(false);
  };

  const bg = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const inputBg = isDark ? "bg-white/5 border-white/8" : "bg-gray-50 border-gray-200";

  return (
    <div className={`rounded-2xl border shadow-2xl overflow-hidden ${bg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">Search Transcript</span>
        </div>
        <button onClick={onClose} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/40 hover:text-white" : "bg-gray-100 text-gray-400 hover:text-gray-700"}`}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ask a question (e.g., 'What did Sarah decide about budget?')"
            className={`flex-1 px-3 py-2 rounded-lg text-sm border ${inputBg} outline-none focus:border-blue-500/60 transition-colors ${isDark ? "text-white placeholder-white/30" : "text-gray-900 placeholder-gray-400"}`}
          />
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-3">
            {/* Answer */}
            <div className={`rounded-lg p-3 ${isDark ? "bg-blue-500/10" : "bg-blue-50"} border ${isDark ? "border-blue-500/20" : "border-blue-200"}`}>
              <p className={`text-xs font-semibold ${isDark ? "text-blue-400" : "text-blue-600"} mb-1`}>Answer</p>
              <p className={`text-sm leading-relaxed ${isDark ? "text-white/80" : "text-gray-700"}`}>{results.answer}</p>
            </div>

            {/* Snippets */}
            {results.relevant_snippets?.length > 0 && (
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${textSub}`}>Relevant Excerpts</p>
                <div className="space-y-2">
                  {results.relevant_snippets.map((item, i) => (
                    <div key={i} className={`rounded-lg p-3 border ${isDark ? "bg-white/3 border-white/8" : "bg-gray-50 border-gray-200"}`}>
                      <p className={`text-xs italic mb-2 leading-relaxed ${isDark ? "text-white/70" : "text-gray-600"}`}>"{item.snippet}"</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${textSub}`}>{item.context}</span>
                        {item.start_time && <span className="text-xs text-purple-400">{item.start_time}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {results.summary && (
              <div className={`rounded-lg p-3 border-l-4 ${isDark ? "bg-amber-500/10 border-amber-500" : "bg-amber-50 border-amber-400"}`}>
                <div className="flex gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className={`text-xs leading-relaxed ${isDark ? "text-white/70" : "text-gray-600"}`}>{results.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!results && !loading && (
          <div className={`rounded-lg p-6 text-center ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className={`text-sm ${textSub}`}>Ask a question to search the meeting transcript</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <p className={`text-xs ${textSub}`}>Searching transcript…</p>
          </div>
        )}
      </div>
    </div>
  );
}