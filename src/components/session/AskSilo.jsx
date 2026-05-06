import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Bot, Zap, CheckSquare, Lightbulb, ArrowRight, BarChart2, User, Calendar, Flag, CircleDot, Clock, TrendingUp, Sparkles, ListChecks } from "lucide-react";
import { appClient } from "@/api/appClient";
import { useTheme } from "@/lib/ThemeContext";
import FlashcardDisplay from "./FlashcardDisplay";
import StructuredNotes from "./StructuredNotes";

export default function AskSilo({ session, transcript, summary, onFlashcardsGenerated, onStructuredContentGenerated }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const [flashcards, setFlashcards] = useState(null);
  const [structuredContent, setStructuredContent] = useState(null);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    if (open && !preloaded && (transcript || summary)) {
      setPreloaded(true);
      setMessages([{
        role: "assistant",
        text: `Hi! I've read through your session and I'm ready to answer questions. Ask me anything about the transcript, key decisions, action items, or insights.`
      }]);
    }
  }, [open, preloaded, transcript, summary]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const buildSystemContext = () => {
    let ctx = `You are Silo AI, an expert meeting assistant. The user is asking questions about a specific recorded session.\n\n`;
    ctx += `Session title: ${session?.title || "Unknown"}\n`;
    if (session?.session_type) ctx += `Session type: ${session.session_type}\n`;
    if (session?.created_date) ctx += `Date: ${new Date(session.created_date).toLocaleString()}\n`;
    ctx += `\n`;

    // Parse structured summary and inject all fields
    let parsed = null;
    try { parsed = summary ? (typeof summary === "string" ? JSON.parse(summary) : summary) : null; } catch {}

    if (parsed) {
      if (parsed.executive_summary?.length) {
        ctx += `EXECUTIVE SUMMARY:\n${Array.isArray(parsed.executive_summary) ? parsed.executive_summary.join(" ") : parsed.executive_summary}\n\n`;
      }
      if (parsed.decisions?.length) {
        ctx += `DECISIONS & AGREEMENTS:\n${parsed.decisions.map((d, i) => `${i+1}. ${d}`).join("\n")}\n\n`;
      }
      if (parsed.action_items?.length) {
        ctx += `ACTION ITEMS:\n${parsed.action_items.map((a, i) => `${i+1}. ${a.task} — Owner: ${a.owner || "TBD"}, Deadline: ${a.deadline || "TBD"}, Priority: ${a.priority || "Medium"}`).join("\n")}\n\n`;
      }
      if (parsed.next_steps?.length) {
        ctx += `NEXT STEPS:\n${parsed.next_steps.map((s, i) => `${i+1}. ${s}`).join("\n")}\n\n`;
      }
      if (parsed.risks?.length) {
        ctx += `RISKS & GAPS:\n${parsed.risks.map(r => `• ${r}`).join("\n")}\n\n`;
      }
      if (parsed.ai_insights?.length) {
        ctx += `AI INSIGHTS:\n${parsed.ai_insights.map(i => `• ${i}`).join("\n")}\n\n`;
      }
      if (parsed.key_discussions?.length) {
        ctx += `KEY DISCUSSIONS:\n${parsed.key_discussions.map(d => `• ${d.title}: ${(d.points || []).join("; ")}`).join("\n")}\n\n`;
      }
      if (parsed.attendees?.length) {
        ctx += `ATTENDEES:\n${parsed.attendees.map(a => `• ${a.name}${a.role ? ` (${a.role})` : ""}`).join("\n")}\n\n`;
      }
    }

    if (transcript) ctx += `FULL TRANSCRIPT:\n${transcript.slice(0, 10000)}\n\n`;
    ctx += `Answer concisely and helpfully based only on the session content above. If the answer is not in the content, say so.`;
    return ctx;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    const history = messages.map(m => `${m.role === "user" ? "User" : "Silo"}: ${m.text}`).join("\n");
    const prompt = `${buildSystemContext()}\n\nConversation so far:\n${history}\n\nUser: ${userMsg}\n\nSilo:`;
    const reply = await appClient.integrations.Core.InvokeLLM({ prompt });
    setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    setLoading(false);
  };

  const generateFlashcards = async () => {
    setGeneratingFlashcards(true);
    try {
      const response = await appClient.functions.invoke('generateFlashcards', {
        transcript,
        summary,
        title: session?.title
      });
      setFlashcards(response.data.flashcards);
      if (onFlashcardsGenerated) onFlashcardsGenerated(response.data.flashcards);
      setMessages(prev => [...prev, { role: "assistant", text: "✨ I've created flashcards for this session! Check them out below." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't generate flashcards. Please try again." }]);
    }
    setGeneratingFlashcards(false);
  };

  const generateStructuredContent = async () => {
    setGeneratingContent(true);
    try {
      const response = await appClient.functions.invoke('generateStructuredContent', {
        transcript,
        summary,
        title: session?.title
      });
      setStructuredContent(response.data);
      if (onStructuredContentGenerated) onStructuredContentGenerated(response.data);
      setMessages(prev => [...prev, { role: "assistant", text: "📚 I've organized the session into well-structured study notes!" }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't generate study notes. Please try again." }]);
    }
    setGeneratingContent(false);
  };

  const card = isDark ? "bg-[#1C1C1E] border-white/10" : "bg-white border-gray-200";
  const inputCls = isDark ? "bg-[#2C2C2E] border-white/10 text-white placeholder-white/30" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";

  // Parse structured fields from LLM output like "**Task:** ..." or "Task: ..."
  const parseStructuredItems = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    let current = null;

    lines.forEach(line => {
      // New numbered item: "1." or "1. **Task:** ..."
      if (/^\d+[\.\)]\s*/.test(line)) {
        if (current) items.push(current);
        current = { fields: {} };
        const rest = line.replace(/^\d+[\.\)]\s*/, '');
        // Might have "**Task:** value" on same line
        const fieldMatch = rest.match(/^\*{0,2}(Task|Action|Decision|Step|Item)\*{0,2}[:\s]+(.+)/i);
        if (fieldMatch) current.fields['Task'] = fieldMatch[2].replace(/\*\*/g, '').trim();
        else if (rest) current.fields['Task'] = rest.replace(/\*\*/g, '').trim();
      }
      // Field line: "**Owner:** value" or "Owner: value"
      else if (current) {
        const fieldMatch = line.match(/^\*{0,2}([A-Za-z ]+)\*{0,2}:\s*\*{0,2}(.+?)\*{0,2}$/);
        if (fieldMatch) {
          const key = fieldMatch[1].trim();
          const val = fieldMatch[2].trim();
          if (key && val) current.fields[key] = val;
        }
      }
    });
    if (current) items.push(current);
    return items.filter(it => Object.keys(it.fields).length > 0);
  };

  const priorityConfig = (p = '') => {
    const lp = p.toLowerCase();
    if (lp === 'high') return { cls: "text-red-400 bg-red-500/15 border-red-500/30", dot: "bg-red-400" };
    if (lp === 'medium') return { cls: "text-amber-400 bg-amber-500/15 border-amber-500/30", dot: "bg-amber-400" };
    return { cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-400" };
  };

  const statusConfig = (s = '') => {
    const ls = s.toLowerCase();
    if (ls === 'completed' || ls === 'done') return { cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", icon: "✓" };
    if (ls === 'pending' || ls === 'in progress') return { cls: "text-amber-400 bg-amber-500/15 border-amber-500/30", icon: "⏳" };
    return { cls: "text-blue-400 bg-blue-500/15 border-blue-500/30", icon: "◦" };
  };

  const CARD_ACCENTS = [
    "from-purple-500/20 to-indigo-500/10 border-l-purple-500",
    "from-blue-500/20 to-cyan-500/10 border-l-blue-500",
    "from-pink-500/20 to-rose-500/10 border-l-pink-500",
    "from-amber-500/20 to-orange-500/10 border-l-amber-500",
    "from-emerald-500/20 to-teal-500/10 border-l-emerald-500",
  ];

  // Render assistant message text with rich formatting
  const renderMessage = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    // Detect if it's a numbered structured list
    const hasNumbered = lines.some(l => /^\d+[\.\)]\s/.test(l));
    const hasFields = lines.some(l => /^\*{0,2}(Task|Owner|Deadline|Priority|Status|Decision|Step|Action|Responsible|Due|Assigned)\*{0,2}:/i.test(l));

    if (hasNumbered && hasFields) {
      const items = parseStructuredItems(text);
      if (items.length > 0) {
        // Find intro text (before the numbered list)
        const introLines = [];
        for (const l of lines) { if (/^\d+[\.\)]/.test(l)) break; introLines.push(l); }
        const intro = introLines.join(' ').replace(/\*\*/g, '').trim();

        return (
          <div className="space-y-3 w-full">
            {intro && (
              <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-gray-500"}`}>{intro}</p>
            )}
            {items.map((item, idx) => {
              const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
              const task = item.fields['Task'] || item.fields['Action'] || item.fields['Decision'] || item.fields['Step'] || '';
              const owner = item.fields['Owner'] || item.fields['Responsible'] || item.fields['Assigned'] || '';
              const deadline = item.fields['Deadline'] || item.fields['Due'] || item.fields['Due Date'] || '';
              const priority = item.fields['Priority'] || '';
              const status = item.fields['Status'] || '';
              const extra = Object.entries(item.fields).filter(([k]) =>
                !['Task','Action','Decision','Step','Owner','Responsible','Assigned','Deadline','Due','Due Date','Priority','Status'].includes(k)
              );
              const pc = priority ? priorityConfig(priority) : null;
              const sc = status ? statusConfig(status) : null;

              return (
                <div key={idx} className={`relative rounded-2xl border border-l-4 overflow-hidden ${accent} ${isDark ? "bg-gradient-to-br border-white/10" : "bg-gradient-to-br border-gray-200"}`}
                  style={{ borderLeftWidth: 3 }}>
                  {/* Index badge */}
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: "linear-gradient(135deg,#A855F7,#6366F1)", color: "white" }}>
                    {idx + 1}
                  </div>

                  <div className="p-3 pr-8 space-y-2.5">
                    {/* Task title */}
                    {task && (
                      <div className="flex items-start gap-2">
                        <ListChecks className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-400" />
                        <p className={`text-xs font-semibold leading-snug ${isDark ? "text-white" : "text-gray-900"}`}>{task}</p>
                      </div>
                    )}

                    {/* Meta chips row */}
                    <div className="flex flex-wrap gap-1.5">
                      {owner && (
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${isDark ? "bg-white/8 border-white/15 text-white/70" : "bg-white border-gray-200 text-gray-600"}`}>
                          <User className="w-2.5 h-2.5" />{owner}
                        </span>
                      )}
                      {deadline && (
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${isDark ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-600"}`}>
                          <Calendar className="w-2.5 h-2.5" />{deadline}
                        </span>
                      )}
                      {pc && (
                        <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${pc.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />{priority}
                        </span>
                      )}
                      {sc && (
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${sc.cls}`}>
                          {sc.icon} {status}
                        </span>
                      )}
                    </div>

                    {/* Extra fields */}
                    {extra.length > 0 && (
                      <div className={`text-[10px] space-y-0.5 pt-1 border-t ${isDark ? "border-white/8 text-white/50" : "border-gray-200 text-gray-500"}`}>
                        {extra.map(([k, v]) => (
                          <p key={k}><span className="font-semibold">{k}:</span> {v}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    }

    // Split into segments: intro prose + bullet/numbered points
    const introLines = [];
    const pointLines = [];
    let seenPoint = false;
    lines.forEach(l => {
      if (/^[-•*]\s/.test(l) || /^\d+[\.\)]\s/.test(l)) { seenPoint = true; pointLines.push(l); }
      else if (seenPoint) pointLines.push(l);
      else introLines.push(l);
    });

    const INSIGHT_ACCENTS = [
      { border: "border-l-purple-500", bg: "from-purple-500/15 to-transparent", icon: <Sparkles className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" /> },
      { border: "border-l-blue-500", bg: "from-blue-500/15 to-transparent", icon: <TrendingUp className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" /> },
      { border: "border-l-cyan-500", bg: "from-cyan-500/15 to-transparent", icon: <Lightbulb className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" /> },
      { border: "border-l-pink-500", bg: "from-pink-500/15 to-transparent", icon: <Zap className="w-3 h-3 text-pink-400 shrink-0 mt-0.5" /> },
      { border: "border-l-amber-500", bg: "from-amber-500/15 to-transparent", icon: <CheckSquare className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" /> },
    ];

    const renderBoldText = (text) => {
      const cleaned = text.replace(/\*\*([^*]+)\*\*/g, (_, t) => `__B__${t}__B__`);
      return cleaned.split('__B__').map((part, j) =>
        j % 2 === 1
          ? <strong key={j} className={isDark ? "text-white font-semibold" : "text-gray-900 font-semibold"}>{part}</strong>
          : <span key={j}>{part}</span>
      );
    };

    // If we have bullet/numbered points — render as insight cards
    if (pointLines.length > 0) {
      const intro = introLines.join(' ').replace(/\*\*/g, '').trim();
      const cards = pointLines
        .filter(l => /^[-•*]\s/.test(l) || /^\d+[\.\)]\s/.test(l))
        .map(l => l.replace(/^[-•*\d\.\)]+\s*/, '').trim());

      return (
        <div className="space-y-2.5 w-full">
          {intro && (
            <p className={`text-xs leading-relaxed ${isDark ? "text-white/55" : "text-gray-500"}`}>{intro}</p>
          )}
          {cards.map((point, idx) => {
            const acc = INSIGHT_ACCENTS[idx % INSIGHT_ACCENTS.length];
            return (
              <div key={idx}
                className={`flex items-start gap-2.5 rounded-2xl border-l-[3px] bg-gradient-to-r p-3 ${acc.border} ${acc.bg} ${isDark ? "bg-white/5 border-white/8" : "bg-white/80 border-gray-100"}`}
                style={{ background: undefined }}
              >
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white`}
                  style={{ background: "linear-gradient(135deg,#A855F7,#6366F1)" }}>
                  {idx + 1}
                </div>
                <p className={`text-xs leading-relaxed flex-1 ${isDark ? "text-white/85" : "text-gray-800"}`}>
                  {renderBoldText(point)}
                </p>
              </div>
            );
          })}
        </div>
      );
    }

    // Pure prose — wrap in a subtle insight panel
    const fullText = lines.join(' ');
    const sentences = fullText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);

    if (sentences.length >= 2) {
      return (
        <div className={`rounded-2xl border p-3 space-y-2 ${isDark ? "bg-white/4 border-white/10" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-white/35" : "text-gray-400"}`}>Insight</span>
          </div>
          {sentences.map((s, i) => (
            <div key={i} className={`flex items-start gap-2 ${i > 0 ? `pt-2 border-t ${isDark ? "border-white/8" : "border-gray-200"}` : ""}`}>
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${["bg-purple-400","bg-blue-400","bg-cyan-400","bg-pink-400"][i % 4]}`} />
              <p className={`text-xs leading-relaxed ${isDark ? "text-white/80" : "text-gray-700"}`}>{renderBoldText(s)}</p>
            </div>
          ))}
        </div>
      );
    }

    // Fallback: single line
    return (
      <p className={`text-xs leading-relaxed ${isDark ? "text-white/80" : "text-gray-700"}`}>
        {renderBoldText(fullText)}
      </p>
    );
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white shadow-2xl"
        style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)", boxShadow: "0 8px 32px rgba(139,92,246,0.5)" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } }}
      >
        <Bot className="w-5 h-5 text-white" />
        <span className="text-xs font-semibold">Ask Silo</span>
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{ border: "2px solid rgba(168,85,247,0.4)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>

      {/* Full Page Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`fixed inset-4 sm:inset-8 z-50 rounded-3xl border shadow-2xl flex flex-col ${card}`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Ask Silo</p>
                  <p className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>Session AI Assistant</p>
                </div>
                <button onClick={() => setOpen(false)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "text-white/40 hover:bg-white/8" : "text-gray-400 hover:bg-gray-100"}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages & Generated Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "max-w-[85%] text-white rounded-br-sm"
                          : "w-full rounded-bl-sm " + (isDark ? "bg-white/8 text-white/80" : "bg-gray-100 text-gray-800")
                      }`}
                      style={msg.role === "user" ? { background: "linear-gradient(135deg, #A855F7, #6366F1)" } : {}}
                    >
                      {msg.role === "assistant" ? renderMessage(msg.text) : msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className={`px-3 py-2 rounded-2xl rounded-bl-sm ${isDark ? "bg-white/8" : "bg-gray-100"}`}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
                
                {/* Flashcards */}
                {flashcards && <FlashcardDisplay flashcards={flashcards} title={session?.title} />}
                
                {/* Structured Notes */}
                {structuredContent && <StructuredNotes content={structuredContent} title={session?.title} />}
              </div>

              {/* Quick Ask Buttons */}
              <div className="px-3 pt-2 pb-1 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-white/30" : "text-gray-400"}`}>Quick Ask</p>
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  {[
                    { label: "Key Decisions", icon: CheckSquare, q: "What were the key decisions made in this session?" },
                    { label: "Action Items", icon: Zap, q: "List all action items and who is responsible for each." },
                    { label: "Session Insights", icon: BarChart2, q: "What are the most important insights from this session?" },
                    { label: "Next Steps", icon: ArrowRight, q: "What are the next steps discussed in this session?" },
                  ].map(({ label, icon: Icon, q }) => (
                    <button
                      key={label}
                      disabled={loading || !transcript}
                      onClick={() => { setInput(q); setTimeout(() => { setInput(""); setMessages(prev => [...prev, { role: "user", text: q }]); setLoading(true); const history = messages.map(m => `${m.role === "user" ? "User" : "Silo"}: ${m.text}`).join("\n"); appClient.integrations.Core.InvokeLLM({ prompt: `${buildSystemContext()}\n\nConversation so far:\n${history}\n\nUser: ${q}\n\nSilo:` }).then(reply => { setMessages(prev => [...prev, { role: "assistant", text: reply }]); setLoading(false); }); }, 0); }}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium border transition-all disabled:opacity-40 ${isDark ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                    >
                      <Icon className="w-3 h-3 shrink-0 text-purple-400" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="px-3 py-2 border-t flex gap-1 flex-wrap" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}>
                <button
                  onClick={generateFlashcards}
                  disabled={generatingFlashcards || !transcript}
                  className="flex-1 min-w-[100px] px-2 py-2 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-40 transition-all flex items-center justify-center gap-1"
                >
                  {generatingFlashcards ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Flashcards
                </button>
                <button
                  onClick={generateStructuredContent}
                  disabled={generatingContent || !transcript}
                  className="flex-1 min-w-[100px] px-2 py-2 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-40 transition-all flex items-center justify-center gap-1"
                >
                  {generatingContent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Study Notes
                </button>
              </div>

              {/* Input */}
              <div className="px-3 py-3 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}>
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Ask about this session..."
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs ${inputCls}`}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}