import React, { useState } from "react";
import { Loader2, Check, X, Sparkles } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";

export default function SpeakerIdentificationPanel({ sessionId, transcript, currentMapping, onApplyMapping, isDark }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState({});
  const [error, setError] = useState(null);

  const handleIdentifySpeakers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('autoIdentifySpeakers', {
        sessionId,
      });
      
      if (response.data?.suggestions && Object.keys(response.data.suggestions).length > 0) {
        setSuggestions(response.data.suggestions);
        setSelectedSuggestions(response.data.suggestions);
        setShowSuggestions(true);
      } else {
        setError('No unmapped speakers found or suggestions could not be generated.');
      }
    } catch (err) {
      setError(err.message || 'Failed to identify speakers');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestions = () => {
    Object.entries(selectedSuggestions).forEach(([speaker, name]) => {
      onApplyMapping(speaker, name);
    });
    setShowSuggestions(false);
    setSuggestions({});
    setSelectedSuggestions({});
  };

  const toggleSuggestion = (speaker) => {
    setSelectedSuggestions(prev => {
      const updated = { ...prev };
      if (updated[speaker]) {
        delete updated[speaker];
      } else {
        updated[speaker] = suggestions[speaker];
      }
      return updated;
    });
  };

  if (showSuggestions && Object.keys(suggestions).length > 0) {
    return (
      <div className={`rounded-xl border p-4 space-y-3 ${
        isDark
          ? 'bg-purple-500/8 border-purple-500/20'
          : 'bg-purple-50 border-purple-200'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <h3 className={`text-sm font-semibold ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
            Suggested Speaker Names
          </h3>
        </div>
        
        <div className="space-y-2">
          {Object.entries(suggestions).map(([speaker, name]) => (
            <label key={speaker} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              selectedSuggestions[speaker]
                ? isDark
                  ? 'bg-purple-500/20'
                  : 'bg-purple-100'
                : isDark
                ? 'hover:bg-purple-500/10'
                : 'hover:bg-purple-50'
            }`}>
              <input
                type="checkbox"
                checked={!!selectedSuggestions[speaker]}
                onChange={() => toggleSuggestion(speaker)}
                className="w-4 h-4 rounded"
              />
              <div className="flex-1">
                <p className={`text-xs font-mono ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  {speaker}
                </p>
                <p className={`text-sm font-semibold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                  {name}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleApplySuggestions}
            disabled={Object.keys(selectedSuggestions).length === 0}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              Object.keys(selectedSuggestions).length === 0
                ? isDark
                  ? 'bg-white/8 text-white/40 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isDark
                ? 'bg-purple-500/30 text-purple-300 hover:bg-purple-500/40'
                : 'bg-purple-200 text-purple-900 hover:bg-purple-300'
            }`}
          >
            <Check className="w-4 h-4" />
            Apply Selected
          </button>
          <button
            onClick={() => {
              setShowSuggestions(false);
              setSuggestions({});
              setSelectedSuggestions({});
            }}
            className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              isDark
                ? 'bg-white/8 text-white/60 hover:bg-white/12'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleIdentifySpeakers}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
        loading
          ? isDark
            ? 'bg-white/8 text-white/40 cursor-not-allowed'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : isDark
          ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 active:scale-95'
          : 'bg-purple-100 text-purple-700 hover:bg-purple-200 active:scale-95'
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Identifying speakers...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          AI Identify Speakers
        </>
      )}
    </button>
  );
}