import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Zap, Users, CheckSquare, Lightbulb, Loader2, Copy, Check, MessageSquarePlus } from "lucide-react";
import { appClient } from "@/api/appClient";

const SPEAKER_COLORS = ['#A855F7', '#38BDF8', '#4ADE80', '#FB923C', '#F472B6'];

export default function SiloAgent({ segments = [], notes = [], subsessions = [], chunkInsights = [], isRecording = false, isPaused = false }) {
  const [expanded, setExpanded] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [insights, setInsights] = useState({ actions: [], decisions: [], speakers: [], aiNotes: [] });
  const [insightsHistory, setInsightsHistory] = useState([]);
  const [processedChunks, setProcessedChunks] = useState([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastAiUpdateRef, setLastAiUpdate] = useState(0);
  const [copiedSection, setCopiedSection] = useState(null);
  const [intervention, setIntervention] = useState(null);
  const [interventionGenerating, setInterventionGenerating] = useState(false);
  const [lastInterventionRef, setLastIntervention] = useState(0);
  const prevCountRef = useRef(0);
  const aiTimeoutRef = useRef(null);
  const scrollRef = useRef(null);

  // Update processed chunks from AI analysis
  useEffect(() => {
    if (chunkInsights.length > 0) {
      setProcessedChunks(chunkInsights);
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    }
  }, [chunkInsights]);

  // Pulse when new segment arrives
  useEffect(() => {
    if (segments.length > prevCountRef.current && chunkInsights.length === 0) {
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
      prevCountRef.current = segments.length;
    }
  }, [segments.length, chunkInsights]);

  // Extract insights from segments + notes (local keyword extraction)
  useEffect(() => {
    if (segments.length === 0 && notes.length === 0) return;

    const speakerSet = new Set(segments.map(s => s.speaker).filter(Boolean));

    // Simple keyword extraction for actions and decisions
    const actionKeywords = ['will', "i'll", "we'll", 'going to', 'need to', 'should', 'must', 'action', 'follow up', 'todo'];
    const decisionKeywords = ['decided', 'agreed', 'confirmed', 'approved', 'will use', 'we will', 'conclusion', 'resolved'];

    const allItems = [...segments, ...notes.map(n => ({ text: n, timestamp: '' }))]
      .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

    const actions = allItems
      .filter(s => { const t = String(s.text || ''); return actionKeywords.some(k => t.toLowerCase().includes(k)); })
      .slice(-4)
      .map(s => { const t = String(s.text || ''); return t.length > 60 ? t.slice(0, 60) + '…' : t; });

    const decisions = allItems
      .filter(s => { const t = String(s.text || ''); return decisionKeywords.some(k => t.toLowerCase().includes(k)); })
      .slice(-4)
      .map(s => { const t = String(s.text || ''); return t.length > 60 ? t.slice(0, 60) + '…' : t; });

    setInsights(prev => ({
      ...prev,
      actions,
      decisions,
      speakers: Array.from(speakerSet),
    }));
  }, [segments, notes]);

  // AI-powered real-time insights from subsessions + manual notes
  useEffect(() => {
    if (!isRecording || isPaused || (subsessions.length === 0 && segments.length < 10 && notes.length === 0)) return;

    // Throttle AI calls to every 30 seconds
    const now = Date.now();
    if (now - lastAiUpdateRef < 30000) return;

    const generateAiInsights = async () => {
      try {
        setAiGenerating(true);

        // Collect transcript ONLY from subsessions and live segments
        const subsessionTexts = subsessions
          .filter(s => s.transcript && (s.status === 'processing' || s.status === 'done'))
          .map((s, i) => `[Part ${i + 1}]\n${s.transcript.trim()}`)
          .join('\n\n');

        const currentTranscript = segments.map(s => String(s.text || '')).filter(Boolean).join(' ');
        const allTranscript = [subsessionTexts, currentTranscript ? `[Current]\n${currentTranscript}` : ''].filter(Boolean).join('\n\n');

        // Need at least 100 chars of real transcript to avoid hallucination
        if (allTranscript.trim().length < 100) return;

        const noteTexts = notes.map(n => (typeof n === 'object' ? n.text : n)).filter(Boolean);
        const manualNotesStr = noteTexts.length > 0 ? `\n\nUser Notes:\n${noteTexts.map((n, i) => `${i + 1}. ${n}`).join('\n')}` : '';

        const fullContext = allTranscript + manualNotesStr;

        const response = await appClient.integrations.Core.InvokeLLM({
          prompt: `You are Silo, an intelligent meeting assistant. Your ONLY job is to extract information STRICTLY from the transcript below — do NOT invent, assume, or add anything not explicitly mentioned in the transcript.

Extract ONLY what is directly stated in the transcript:
1. Action items — tasks explicitly mentioned with verbs like "will do", "needs to", "should", "follow up"
2. Decisions — things explicitly decided or agreed upon in the transcript
3. Key insights — important facts, findings or risks explicitly discussed

If the transcript is too short or unclear, return empty arrays. Do NOT fabricate content.

Transcript:\n${fullContext.slice(0, 3000)}`,
          response_json_schema: {
            type: "object",
            properties: {
              actions: { type: "array", items: { type: "string" } },
              decisions: { type: "array", items: { type: "string" } },
              insights: { type: "array", items: { type: "string" } }
            }
          }
        });

        if (response?.actions || response?.decisions || response?.insights) {
          const newInsight = {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actions: response.actions || [],
            decisions: response.decisions || [],
            aiNotes: response.insights || [],
          };
          setInsights(prev => ({
            ...prev,
            actions: response.actions || [],
            decisions: response.decisions || [],
            aiNotes: response.insights || [],
          }));
          setInsightsHistory(prev => [...prev, newInsight]);
          setPulse(true);
          setTimeout(() => setPulse(false), 800);
          // Scroll to bottom after update
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 100);
        }

        setLastAiUpdate(now);
      } catch (error) {
        console.warn('Silo AI analysis error:', error.message);
      } finally {
        setAiGenerating(false);
      }
    };

    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(generateAiInsights, 2000);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [subsessions, segments.length, notes.length, isRecording, isPaused]);

  // Smart intervention recommendation — every 45 seconds
  useEffect(() => {
    if (!isRecording || isPaused || segments.length < 8) return;
    const now = Date.now();
    if (now - lastInterventionRef < 45000) return;

    const generateIntervention = async () => {
      try {
        setInterventionGenerating(true);
        const currentTranscript = segments.slice(-15).map(s => String(s.text || '')).filter(Boolean).join(' ');
        const subsessionTexts = subsessions.filter(s => s.transcript).map((s, i) => `[Part ${i + 1}]\n${s.transcript}`).join('\n');
        const context = [subsessionTexts, currentTranscript ? `[Current]\n${currentTranscript}` : ''].filter(Boolean).join('\n\n');

        // Don't suggest interventions without real transcript content
        if (context.trim().length < 150) return;

        const response = await appClient.integrations.Core.InvokeLLM({
          prompt: `You are Silo, a smart meeting assistant. Based ONLY on what was said in this exact transcript, suggest ONE specific, actionable contribution the user could make right now — a question to ask, a point to clarify, or a topic to raise. Be brief (max 2 sentences). Base your suggestion STRICTLY on what was discussed — do not invent topics. If the transcript is too short or unclear, set needed=false.

Transcript:\n${context.slice(0, 2000)}`,
          response_json_schema: {
            type: "object",
            properties: {
              suggestion: { type: "string" },
              type: { type: "string" },
              needed: { type: "boolean" }
            }
          }
        });

        if (response?.needed && response?.suggestion) {
          setIntervention({ suggestion: response.suggestion, type: response.type || 'suggestion', at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
          setPulse(true);
          setTimeout(() => setPulse(false), 800);
        }
        setLastIntervention(now);
      } catch (e) {
        console.warn('Intervention generation error:', e.message);
      } finally {
        setInterventionGenerating(false);
      }
    };

    const t = setTimeout(generateIntervention, 3000);
    return () => clearTimeout(t);
  }, [segments.length, subsessions, isRecording, isPaused]);

  const copySection = (label, items) => {
    const text = `${label}:\n${items.map(i => `• ${i}`).join('\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!isRecording) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {/* Expanded Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-72 rounded-2xl bg-[#1C1C1E] border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #A855F7, #38BDF8)' }}>
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-white">Silo</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-400/20 text-green-400 font-medium">Active</span>
              </div>
              <button onClick={() => setExpanded(false)} className="text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div ref={scrollRef} className="overflow-y-auto max-h-[400px] scrollbar-hide">

              {/* Smart Intervention Banner */}
              {(intervention || interventionGenerating) && (
                <div className="mx-3 mt-3 rounded-xl border border-green-500/30 bg-green-500/8 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MessageSquarePlus className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] uppercase tracking-widest text-green-400 font-semibold">Your Turn to Speak</span>
                    {interventionGenerating && <Loader2 className="w-2.5 h-2.5 text-green-400 animate-spin ml-auto" />}
                    {intervention && (
                      <span className="text-[9px] text-white/30 ml-auto">{intervention.at}</span>
                    )}
                  </div>
                  {intervention ? (
                    <div className="flex gap-2 items-start">
                      <p className="text-xs text-green-300/80 leading-relaxed flex-1">{intervention.suggestion}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(intervention.suggestion).catch(() => {}); setCopiedSection('intervention'); setTimeout(() => setCopiedSection(null), 2000); }}
                        className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        {copiedSection === 'intervention' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-white/30 hover:text-white/60" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/30">Analyzing discussion context…</p>
                  )}
                </div>
              )}

              {/* Speakers */}
              {insights.speakers.length > 0 && (
                <div className="px-4 py-3 border-b border-white/8">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="w-3 h-3 text-white/40" />
                    <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Speakers</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.speakers.map((spk, i) => (
                      <span key={spk} className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: SPEAKER_COLORS[i % SPEAKER_COLORS.length] + '25', color: SPEAKER_COLORS[i % SPEAKER_COLORS.length] }}>
                        {spk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights history — all rounds */}
              {insightsHistory.length > 0 ? (
                <div className="space-y-0 divide-y divide-white/5">
                  {insightsHistory.map((round, rIdx) => (
                    <div key={rIdx} className={`px-4 py-3 ${rIdx === insightsHistory.length - 1 ? 'bg-purple-500/5' : ''}`}>
                      <p className="text-[9px] text-white/25 mb-2 font-medium">Update {rIdx + 1} · {round.timestamp}</p>

                      {round.actions.length > 0 && (
                        <div className="mb-2.5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <CheckSquare className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold flex-1">Action Items</span>
                            <button onClick={() => copySection('Action Items', round.actions)} className="p-0.5 rounded hover:bg-white/10 transition-colors">
                              {copiedSection === 'Action Items' ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3 text-white/25 hover:text-white/60" />}
                            </button>
                          </div>
                          <div className="space-y-1">
                            {round.actions.map((a, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="text-blue-400 text-xs shrink-0">→</span>
                                <p className="text-xs text-white/60 leading-relaxed">{a}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {round.decisions.length > 0 && (
                        <div className="mb-2.5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Lightbulb className="w-3 h-3 text-amber-400" />
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold flex-1">Key Decisions</span>
                            <button onClick={() => copySection('Key Decisions', round.decisions)} className="p-0.5 rounded hover:bg-white/10 transition-colors">
                              {copiedSection === 'Key Decisions' ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3 text-white/25 hover:text-white/60" />}
                            </button>
                          </div>
                          <div className="space-y-1">
                            {round.decisions.map((d, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="text-amber-400 text-xs shrink-0">★</span>
                                <p className="text-xs text-white/60 leading-relaxed">{d}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {round.aiNotes.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Zap className="w-3 h-3 text-cyan-400" />
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold flex-1">AI Insights</span>
                            <button onClick={() => copySection('AI Insights', round.aiNotes)} className="p-0.5 rounded hover:bg-white/10 transition-colors">
                              {copiedSection === 'AI Insights' ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3 text-white/25 hover:text-white/60" />}
                            </button>
                          </div>
                          <div className="space-y-1">
                            {round.aiNotes.map((note, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="text-cyan-400 text-xs shrink-0">⚡</span>
                                <p className="text-xs text-white/60 leading-relaxed">{note}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Current live insights (before first AI round completes) */
                <>
                  {insights.actions.length > 0 && (
                    <div className="px-4 py-3 border-b border-white/8">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckSquare className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold flex-1">Action Items</span>
                        <button onClick={() => copySection('Action Items', insights.actions)} className="p-0.5 rounded hover:bg-white/10 transition-colors">
                          {copiedSection === 'Action Items' ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3 text-white/25 hover:text-white/60" />}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {insights.actions.map((a, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-blue-400 text-xs shrink-0">→</span>
                            <p className="text-xs text-white/60 leading-relaxed">{a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {insights.decisions.length > 0 && (
                    <div className="px-4 py-3 border-b border-white/8">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold flex-1">Key Decisions</span>
                        <button onClick={() => copySection('Key Decisions', insights.decisions)} className="p-0.5 rounded hover:bg-white/10 transition-colors">
                          {copiedSection === 'Key Decisions' ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3 text-white/25 hover:text-white/60" />}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {insights.decisions.map((d, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-amber-400 text-xs shrink-0">★</span>
                            <p className="text-xs text-white/60 leading-relaxed">{d}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {insights.aiNotes.length === 0 && insights.actions.length === 0 && insights.decisions.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-white/30 text-xs">Listening and processing…</p>
                      <p className="text-white/20 text-[10px] mt-1">{aiGenerating ? 'Analyzing with AI...' : 'Insights will appear as the session progresses'}</p>
                    </div>
                  )}
                </>
              )}

              {aiGenerating && (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                  <span className="text-[10px] text-white/30">Generating new insights…</span>
                </div>
              )}
            </div>

            {/* Stats footer */}
            <div className="px-4 py-2 bg-white/3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-white/25">
                {subsessions.length > 0 ? `${subsessions.length} parts + current` : `${segments.length} segments`} • {notes.length} notes
              </span>
              <div className="flex items-center gap-1">
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                    <span className="text-[10px] text-cyan-400">Analyzing…</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 text-purple-400" />
                    <span className="text-[10px] text-purple-400">AI ready</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bot Button */}
      <motion.button
        onClick={() => setExpanded(v => !v)}
        animate={pulse ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.4 }}
        className="relative w-12 h-12 rounded-full shadow-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }}
      >
        <Bot className="w-6 h-6 text-white" />
        {/* Live pulse ring */}
        {isRecording && !isPaused && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'linear-gradient(135deg, #A855F7, #6366F1)' }} />
        )}
        {/* Badge */}
        {(insights.actions.length + insights.decisions.length + (intervention ? 1 : 0)) > 0 && (
          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center ${intervention ? 'bg-green-400' : 'bg-amber-400'}`}>
            {insights.actions.length + insights.decisions.length + (intervention ? 1 : 0)}
          </span>
        )}
      </motion.button>
    </div>
  );
}