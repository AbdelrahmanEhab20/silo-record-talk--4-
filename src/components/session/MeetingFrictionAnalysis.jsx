import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { X, AlertTriangle, TrendingDown, Users, Loader2, Zap } from "lucide-react";

export default function MeetingFrictionAnalysis({ transcript, onClose }) {
  const { isDark } = useTheme();
  const [friction, setFriction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (transcript) {
      analyzeFriction();
    }
  }, [transcript]);

  const parseSpeakerSegments = () => {
    const segments = [];
    const regex = /\[(\d{1,2}):(\d{2})\]\s*([^:]+):\s*(.+?)(?=\[\d{1,2}:\d{2}\]|$)/g;
    let match;

    while ((match = regex.exec(transcript)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const totalSeconds = minutes * 60 + seconds;
      const speaker = match[3].trim();
      const text = match[4].trim();

      segments.push({
        speaker,
        startTime: totalSeconds,
        text,
        wordCount: text.split(/\s+/).length,
        duration: Math.ceil(text.split(/\s+/).length / 2.5) // ~150 words/min
      });
    }
    return segments;
  };

  const detectInterruptions = (segments) => {
    const interruptions = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      const gapBetween = next.startTime - (current.startTime + current.duration);

      // Very short gaps indicate potential interruptions
      if (gapBetween < 2 && gapBetween >= 0) {
        interruptions.push({
          type: "interruption",
          interrupter: next.speaker,
          interrupted: current.speaker,
          time: next.startTime,
          severity: gapBetween < 0.5 ? "high" : "medium"
        });
      }
    }
    return interruptions;
  };

  const detectSentimentDips = async (segments) => {
    const dips = [];
    const speakerGroups = {};

    // Group by speaker
    segments.forEach(s => {
      if (!speakerGroups[s.speaker]) speakerGroups[s.speaker] = [];
      speakerGroups[s.speaker].push(s);
    });

    // Analyze sentiment for each speaker's contributions
    for (const [speaker, segs] of Object.entries(speakerGroups)) {
      if (segs.length < 2) continue;

      const texts = segs.map(s => s.text).join(" ");
      const negativeWords = ["issue", "problem", "concern", "disagree", "difficult", "failed", "blocked", "risk", "urgent", "critical", "confused", "unclear"];
      const negCount = negativeWords.filter(w => texts.toLowerCase().includes(w)).length;

      if (negCount > segs.length * 0.8) {
        const avgWordCount = segs.reduce((sum, s) => sum + s.wordCount, 0) / segs.length;
        dips.push({
          type: "sentiment_dip",
          speaker,
          severity: negCount > segs.length * 1.5 ? "high" : "medium",
          negativeIndicators: negCount,
          avgContributionLength: Math.round(avgWordCount)
        });
      }
    }
    return dips;
  };

  const detectParticipationImbalance = (segments) => {
    const participationByName = {};
    let maxTalk = 0;

    segments.forEach(s => {
      if (!participationByName[s.speaker]) {
        participationByName[s.speaker] = { count: 0, totalWords: 0 };
      }
      participationByName[s.speaker].count += 1;
      participationByName[s.speaker].totalWords += s.wordCount;
      maxTalk = Math.max(maxTalk, participationByName[s.speaker].totalWords);
    });

    const participation = Object.entries(participationByName).map(([name, data]) => ({
      speaker: name,
      frequency: data.count,
      totalWords: data.totalWords,
      percentage: maxTalk > 0 ? Math.round((data.totalWords / maxTalk) * 100) : 0
    }));

    participation.sort((a, b) => b.totalWords - a.totalWords);

    const imbalancePoints = [];
    if (participation.length > 1) {
      const topTalker = participation[0];
      const otherAvg = participation.slice(1).reduce((sum, p) => sum + p.totalWords, 0) / (participation.length - 1);
      
      if (topTalker.totalWords > otherAvg * 2) {
        imbalancePoints.push({
          type: "participation_imbalance",
          topSpeaker: topTalker.speaker,
          dominanceRatio: Math.round((topTalker.totalWords / otherAvg) * 10) / 10,
          severity: topTalker.totalWords > otherAvg * 3 ? "high" : "medium"
        });
      }

      // Detect silent participants
      const minTalker = participation[participation.length - 1];
      if (minTalker.totalWords < otherAvg * 0.3) {
        imbalancePoints.push({
          type: "low_participation",
          speaker: minTalker.speaker,
          frequency: minTalker.frequency,
          severity: minTalker.totalWords === 0 ? "high" : "medium"
        });
      }
    }

    return { participation, imbalancePoints };
  };

  const analyzeFriction = async () => {
    setLoading(true);
    try {
      const segments = parseSpeakerSegments();
      if (segments.length === 0) {
        setFriction({ error: "No speaker data found in transcript" });
        setLoading(false);
        return;
      }

      const interruptions = detectInterruptions(segments);
      const sentimentDips = await detectSentimentDips(segments);
      const { participation, imbalancePoints } = detectParticipationImbalance(segments);

      const frictionScore = (interruptions.length * 2 + sentimentDips.length * 1.5 + imbalancePoints.length * 1.8) / Math.max(segments.length, 1);

      setFriction({
        frictionScore: Math.min(100, Math.round(frictionScore * 10)),
        interruptions,
        sentimentDips,
        participation,
        imbalancePoints,
        totalSpeakers: participation.length,
        totalInterruptions: interruptions.length
      });
    } catch (e) {
      console.error("Friction analysis failed", e);
      setFriction({ error: "Analysis failed" });
    }
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score > 60) return "text-red-400";
    if (score > 40) return "text-amber-400";
    return "text-green-400";
  };

  const getSeverityBadge = (severity) => {
    const isDarkMode = isDark;
    if (severity === "high") {
      return isDarkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600";
    }
    return isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600";
  };

  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-100";

  return (
    <div className={`${card} rounded-2xl border ${border} p-5 space-y-5`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-semibold">Meeting Friction Analysis</h3>
        </div>
        <button onClick={onClose} className={`w-6 h-6 rounded-full flex items-center justify-center ${isDark ? "bg-white/8 text-white/40 hover:text-white/60" : "bg-gray-100 text-gray-400 hover:text-gray-600"}`}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <p className={`text-xs ${textSub}`}>Analyzing friction points…</p>
        </div>
      )}

      {!loading && friction?.error && (
        <div className={`rounded-lg p-3 ${isDark ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-yellow-50 border border-yellow-200"}`}>
          <p className={`text-xs ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>{friction.error}</p>
        </div>
      )}

      {!loading && friction && !friction.error && (
        <div className="space-y-5">
          {/* Friction Score */}
          <div className={`rounded-lg p-3 ${isDark ? "bg-white/3" : "bg-gray-50"}`}>
            <p className={`text-xs ${textSub} mb-2`}>Overall Friction Score</p>
            <div className="flex items-end gap-3">
              <span className={`text-3xl font-bold ${getScoreColor(friction.frictionScore)}`}>{friction.frictionScore}</span>
              <p className={`text-xs ${textSub} mb-1`}>{friction.frictionScore > 60 ? "High friction" : friction.frictionScore > 40 ? "Moderate friction" : "Low friction"}</p>
            </div>
          </div>

          {/* Interruptions */}
          {friction.interruptions.length > 0 && (
            <div className="space-y-2">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textSub} flex items-center gap-1.5`}>
                <AlertTriangle className="w-3.5 h-3.5" /> {friction.interruptions.length} Interruptions Detected
              </p>
              <div className="space-y-1.5">
                {friction.interruptions.map((int, i) => (
                  <div key={i} className={`rounded p-2.5 text-xs ${int.severity === "high" ? (isDark ? "bg-red-500/15 border border-red-500/30" : "bg-red-50 border border-red-200") : (isDark ? "bg-amber-500/15 border border-amber-500/30" : "bg-amber-50 border border-amber-200")}`}>
                    <p className={isDark ? "text-white/80" : "text-gray-900"}>
                      <strong>{int.interrupter}</strong> interrupted <strong>{int.interrupted}</strong>
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={textSub}>~{int.time}s</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getSeverityBadge(int.severity)}`}>{int.severity} severity</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Dips */}
          {friction.sentimentDips.length > 0 && (
            <div className="space-y-2">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textSub} flex items-center gap-1.5`}>
                <TrendingDown className="w-3.5 h-3.5" /> {friction.sentimentDips.length} Sentiment Dips
              </p>
              <div className="space-y-1.5">
                {friction.sentimentDips.map((dip, i) => (
                  <div key={i} className={`rounded p-2.5 text-xs ${dip.severity === "high" ? (isDark ? "bg-red-500/15 border border-red-500/30" : "bg-red-50 border border-red-200") : (isDark ? "bg-amber-500/15 border border-amber-500/30" : "bg-amber-50 border border-amber-200")}`}>
                    <p className={isDark ? "text-white/80" : "text-gray-900"}>
                      <strong>{dip.speaker}</strong> showed negative sentiment in contributions
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={textSub}>{dip.negativeIndicators} negative indicators</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getSeverityBadge(dip.severity)}`}>{dip.severity} severity</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participation Imbalance */}
          {friction.imbalancePoints.length > 0 && (
            <div className="space-y-2">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textSub} flex items-center gap-1.5`}>
                <Users className="w-3.5 h-3.5" /> {friction.imbalancePoints.length} Participation Issues
              </p>
              <div className="space-y-1.5">
                {friction.imbalancePoints.map((imb, i) => (
                  <div key={i} className={`rounded p-2.5 text-xs ${imb.severity === "high" ? (isDark ? "bg-red-500/15 border border-red-500/30" : "bg-red-50 border border-red-200") : (isDark ? "bg-amber-500/15 border border-amber-500/30" : "bg-amber-50 border border-amber-200")}`}>
                    {imb.type === "participation_imbalance" ? (
                      <>
                        <p className={isDark ? "text-white/80" : "text-gray-900"}>
                          <strong>{imb.topSpeaker}</strong> dominated discussion ({imb.dominanceRatio}x more talk time)
                        </p>
                      </>
                    ) : (
                      <p className={isDark ? "text-white/80" : "text-gray-900"}>
                        <strong>{imb.speaker}</strong> had minimal participation ({imb.frequency} turns)
                      </p>
                    )}
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs mt-1 ${getSeverityBadge(imb.severity)}`}>{imb.severity} severity</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participation Chart */}
          <div className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Speaker Participation</p>
            <div className="space-y-1.5">
              {friction.participation.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-20 truncate">{p.speaker}</span>
                  <div className={`h-6 rounded overflow-hidden flex-1 ${isDark ? "bg-white/8" : "bg-gray-200"}`}>
                    <div 
                      className={`h-full ${p.percentage > 50 ? "bg-red-400" : "bg-blue-400"}`}
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                  <span className={`text-xs w-8 text-right ${textSub}`}>{p.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {friction.interruptions.length === 0 && friction.sentimentDips.length === 0 && friction.imbalancePoints.length === 0 && (
            <div className={`rounded-lg p-4 text-center ${isDark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}>
              <p className={isDark ? "text-green-400 text-sm font-medium" : "text-green-600 text-sm font-medium"}>No significant friction detected ✓</p>
              <p className={`text-xs mt-1 ${isDark ? "text-green-400/60" : "text-green-600/60"}`}>Meeting ran smoothly with balanced participation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}