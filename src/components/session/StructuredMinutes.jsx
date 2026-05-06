import React, { useState, useRef } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, User, Calendar, MessageSquare, ThumbsUp, HelpCircle, Lightbulb, AlertCircle, Users, Plus, X, ArrowRight, Pencil, Check, ScanSearch, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AttendeeCard from "./AttendeeCard";
import AttendeeImport from "./AttendeeImport";
import SpeakerIdentificationPanel from "./SpeakerIdentificationPanel";

const PRIORITY_COLORS = {
  High: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/20" },
  Medium: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" },
  Low: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/20" },
};

const SPEAKER_COLORS = [
  "text-purple-400", "text-blue-400", "text-emerald-400", "text-amber-400",
  "text-pink-400", "text-cyan-400", "text-orange-400", "text-rose-400",
];

const TYPE_CONFIG = {
  stated:      { icon: MessageSquare, label: "Stated",      color: "text-blue-400" },
  recommended: { icon: ThumbsUp,      label: "Recommended", color: "text-emerald-400" },
  suggested:   { icon: Lightbulb,     label: "Suggested",   color: "text-amber-400" },
  questioned:  { icon: HelpCircle,    label: "Questioned",  color: "text-purple-400" },
  agreed:      { icon: CheckCircle2,  label: "Agreed",      color: "text-green-400" },
  disagreed:   { icon: AlertCircle,   label: "Disagreed",   color: "text-red-400" },
};

function SectionCard({ title, icon: Icon, children, isDark }) {
  const cardBg = isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200";
  const subText = isDark ? "text-white/40" : "text-gray-400";
  return (
    <div className={`rounded-2xl border p-4 mb-4 ${cardBg}`}>
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${subText}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />} {title}
      </h3>
      {children}
    </div>
  );
}

function BulletList({ items, isDark }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className={`flex gap-2 text-sm leading-snug ${isDark ? "text-white/80" : "text-gray-700"}`}>
          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? "bg-white/30" : "bg-gray-400"}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ThemeBlock({ theme, isDark }) {
  return (
    <div className={`mb-5 pb-5 border-b last:border-b-0 last:mb-0 last:pb-0 ${isDark ? "border-white/8" : "border-gray-100"}`}>
      <p className={`text-sm font-semibold mb-3 ${isDark ? "text-purple-300" : "text-purple-600"}`}>
        {theme.title}
      </p>
      <ul className="space-y-2.5">
        {theme.points?.map((pt, i) => (
          <li key={i} className={`flex gap-2.5 text-sm leading-relaxed ${isDark ? "text-white/80" : "text-gray-700"}`}>
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? "bg-purple-400/50" : "bg-purple-400"}`} />
            <span>{pt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionCard({ action, isDark, onRemove, readonly }) {
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState(false);
  const colors = PRIORITY_COLORS[action.priority] || PRIORITY_COLORS.Medium;

  return (
    <div className={`rounded-xl border mb-3 overflow-hidden transition-all ${
      done
        ? isDark ? "opacity-40 border-white/5" : "opacity-40 border-gray-100"
        : isDark ? "border-white/10 bg-white/4" : "border-gray-200 bg-gray-50"
    }`}>
      <div className={`flex items-center gap-3 p-3 ${!readonly ? "cursor-pointer" : ""}`} onClick={() => !readonly && setExpanded(!expanded)}>
        {!readonly && (
          <button onClick={(e) => { e.stopPropagation(); setDone(!done); }} className="shrink-0">
            {done
              ? <CheckCircle2 className="w-5 h-5 text-green-400" />
              : <Circle className={`w-5 h-5 ${isDark ? "text-white/20" : "text-gray-300"}`} />
            }
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${done ? "line-through" : ""} ${isDark ? "text-white" : "text-gray-900"}`}>
            {action.task}
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${colors.bg} ${colors.text} ${colors.border}`}>
          {action.priority}
        </span>
        {!readonly && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove && onRemove(); }}
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isDark ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {expanded ? <ChevronUp className={`w-4 h-4 shrink-0 ${isDark ? "text-white/30" : "text-gray-400"}`} />
          : <ChevronDown className={`w-4 h-4 shrink-0 ${isDark ? "text-white/30" : "text-gray-400"}`} />}
      </div>
      {expanded && (
        <div className={`px-4 pb-3 pt-1 space-y-2 border-t ${isDark ? "border-white/8" : "border-gray-100"}`}>
          <div className="flex items-center gap-2">
            <User className={`w-3.5 h-3.5 ${isDark ? "text-white/30" : "text-gray-400"}`} />
            <span className={`text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>Owner:</span>
            <span className={`text-xs font-medium ${isDark ? "text-white/80" : "text-gray-700"}`}>{action.owner || "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className={`w-3.5 h-3.5 ${isDark ? "text-white/30" : "text-gray-400"}`} />
            <span className={`text-xs ${isDark ? "text-white/50" : "text-gray-500"}`}>Deadline:</span>
            <span className={`text-xs font-medium ${isDark ? "text-white/80" : "text-gray-700"}`}>{action.deadline || "TBD"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendeesSection({ attendees, isDark, audioUrl, transcript, onUpdateAttendee, onAddAttendee, onApplyToAll, sessionId, currentMapping }) {
  return (
    <SectionCard title="Attendees" icon={Users} isDark={isDark}>
      <div className="space-y-3 mb-3">
        {attendees?.length > 0 ? (
          attendees.map((att, i) => (
            <AttendeeCard
              key={i}
              attendee={att}
              index={i}
              audioUrl={audioUrl}
              transcript={transcript}
              onUpdate={onUpdateAttendee}
              onApplyToAll={onApplyToAll}
            />
          ))
        ) : (
          <p className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
            No attendees yet.
          </p>
        )}
        {transcript && sessionId && (
          <SpeakerIdentificationPanel
            sessionId={sessionId}
            transcript={transcript}
            currentMapping={currentMapping}
            onApplyMapping={onApplyToAll}
            isDark={isDark}
          />
        )}
      </div>
      <AttendeeImport onAdd={onAddAttendee} />
    </SectionCard>
  );
}

function DetailedDiscussions({ items, isDark }) {
  const [expanded, setExpanded] = useState(false);
  if (!items?.length) return null;
  const visible = expanded ? items : items.slice(0, 5);
  const speakers = [...new Set(items.map(d => d.speaker))];
  const speakerColor = (name) => SPEAKER_COLORS[speakers.indexOf(name) % SPEAKER_COLORS.length];

  return (
    <SectionCard title="Detailed Discussion" icon={MessageSquare} isDark={isDark}>
      <div className="space-y-3">
        {visible.map((item, i) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.stated;
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex gap-2.5 pb-3 border-b last:border-b-0 last:pb-0 ${isDark ? "border-white/8" : "border-gray-100"}`}>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={`text-xs font-semibold ${speakerColor(item.speaker)}`}>{item.speaker}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDark ? "bg-white/6 text-white/40" : "bg-gray-100 text-gray-400"}`}>{cfg.label}</span>
                </div>
                <p className={`text-sm leading-snug ${isDark ? "text-white/80" : "text-gray-700"}`}>{item.content}</p>
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`mt-3 w-full text-xs font-medium flex items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${isDark ? "text-white/40 hover:text-white/70 bg-white/4" : "text-gray-400 hover:text-gray-700 bg-gray-50"}`}
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Show Less</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Show {items.length - 5} More</>
          }
        </button>
      )}
    </SectionCard>
  );
}

function NextStepsSection({ items, isDark, onAdd, onRemove, onEdit, readonly }) {
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const cardBg = isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200";
  const inputCls = `flex-1 text-sm px-3 py-2 rounded-xl border outline-none transition-colors ${
    isDark
      ? "bg-[#1C1C1E] border-white/10 text-white placeholder:text-white/25 focus:border-purple-500/50"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400"
  }`;

  const handleAdd = () => {
    if (!addText.trim()) return;
    onAdd(addText.trim());
    setAddText("");
    setAdding(false);
  };

  const startEdit = (i) => {
    setEditingIndex(i);
    setEditText(items[i]);
    setAdding(false);
  };

  const handleEditSave = () => {
    if (!editText.trim()) return;
    onEdit(editingIndex, editText.trim());
    setEditingIndex(null);
    setEditText("");
  };

  return (
    <div className={`rounded-2xl border p-4 mb-4 ${cardBg}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${textSub}`}>
          <ArrowRight className="w-3.5 h-3.5" /> Next Steps
        </h3>
        {!readonly && (
          <button
            onClick={() => { setAdding(v => !v); setEditingIndex(null); }}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
              adding ? "bg-purple-500/20 text-purple-400" : isDark ? "bg-white/8 text-white/50 hover:text-white" : "bg-gray-100 text-gray-500 hover:text-gray-800"
            }`}
          >
            {adding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {adding ? "Cancel" : "Add"}
          </button>
        )}
      </div>

      {!readonly && adding && (
        <div className="flex gap-2 mb-3">
          <input autoFocus className={inputCls} placeholder="Describe the next step..." value={addText}
            onChange={e => setAddText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setAddText(""); } }} />
          <button onClick={handleAdd} disabled={!addText.trim()}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all shrink-0"
            style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}>
            Add
          </button>
        </div>
      )}

      {items?.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className={`group ${isDark ? "text-white/80" : "text-gray-700"}`}>
              {editingIndex === i ? (
                <div className="flex gap-2">
                  <input autoFocus className={inputCls} value={editText} onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingIndex(null); }} />
                  <button onClick={handleEditSave} disabled={!editText.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 shrink-0"
                    style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingIndex(null)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isDark ? "border-white/10 text-white/40" : "border-gray-200 text-gray-400"}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
               <div className="flex gap-2 items-start">
                 <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? "bg-white/30" : "bg-gray-400"}`} />
                 <span className="flex-1 text-sm leading-snug py-0.5">{item}</span>
                 {!readonly && (
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                     <button onClick={() => startEdit(i)}
                       className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isDark ? "text-white/30 hover:text-white/70 hover:bg-white/8" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}`}>
                       <Pencil className="w-3 h-3" />
                     </button>
                     <button onClick={() => onRemove(i)}
                       className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isDark ? "text-white/30 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"}`}>
                       <X className="w-3 h-3" />
                     </button>
                   </div>
                 )}
               </div>
              )}
            </li>
          ))}
        </ul>
      ) : !adding ? (
        <p className={`text-xs ${textSub}`}>No next steps yet. Tap <strong>Add</strong> to create one.</p>
      ) : null}
    </div>
  );
}

export default function StructuredMinutes({ data, onDataChange, readonly = false, audioUrl, transcript, originalSummary, onRestoreOriginal, sessionId }) {
  const { isDark } = useTheme();
  const [scanningDecisions, setScanningDecisions] = useState(false);
  const [diggingDeeper, setDiggingDeeper] = useState(false);
  // Track whether we're currently showing the deep view (toggled after first dig)
  const [showingDeep, setShowingDeep] = useState(false);
  // Store deep result in-memory so toggling back doesn't re-run AI
  const deepResultRef = useRef(null);

  if (!data) return null;
  
  // hasOriginal means dig deeper was already run once (original was saved before dig)
  const hasOriginal = !!originalSummary && originalSummary !== JSON.stringify(data);

  // ── Hierarchical chunk helpers (same as FolderReportModal) ───────────────
  const CHUNK_SIZE = 8000;
  const chunkText = (text) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE));
    return chunks;
  };
  const summarizeChunkDeep = async (chunk, idx, total) => base44.integrations.Core.InvokeLLM({
    prompt: `Extract detailed notes from part ${idx + 1} of ${total} of a meeting transcript. Preserve EVERY topic, decision, action item, quote, fact, number, and name mentioned. Be granular and comprehensive — these notes will feed a deep-detail report.

TRANSCRIPT CHUNK:
${chunk}`,
  });

  const getProcessedTranscript = async (text) => {
    if (!text || text.length <= CHUNK_SIZE) return text || "";
    const chunks = chunkText(text);
    const summaries = await Promise.all(chunks.map((c, i) => summarizeChunkDeep(c, i, chunks.length)));
    const combined = summaries.join("\n\n---\n\n");
    if (combined.length > CHUNK_SIZE * 2) {
      return base44.integrations.Core.InvokeLLM({
        prompt: `Consolidate these chunk summaries into ONE exhaustive summary preserving ALL key points, decisions, action items, facts, and speaker contributions:\n\n${combined}`,
      });
    }
    return combined;
  };

  const digDeeper = async () => {
    if (!transcript) return;

    // ── If deep result exists in memory, just show it (no AI call) ───────
    if (deepResultRef.current) {
      if (onDataChange) onDataChange(deepResultRef.current);
      setShowingDeep(true);
      return;
    }

    // ── FIRST TIME: run AI deep analysis ─────────────────────────────────
    setDiggingDeeper(true);
    const processedText = await getProcessedTranscript(transcript);
    const result = await base44.integrations.Core.InvokeLLM({
      model: "gpt_5",
      prompt: `You are a senior meeting analyst. Produce a DEEPLY DETAILED analysis of this meeting.

TRANSCRIPT (processed):
${processedText}

Existing key discussions for reference (expand and enrich these, do NOT just copy):
${JSON.stringify(data.key_discussions || [])}

Return ONLY a JSON object with these fields:

{
  "executive_summary": ["8-12 detailed sentences covering full context, all participants, key themes, tensions, resolutions, and significance"],
  "key_discussions": [
    {
      "title": "Exact Topic Title",
      "points": ["5-10 highly detailed bullet points per topic — include specific names, facts, figures, what was said, debated, and concluded"]
    }
  ],
  "decisions": ["Every decision, agreement, resolution — specific and detailed, minimum 1 sentence each"],
  "action_items": [
    { "task": "exact task description", "owner": "who", "deadline": "when or TBD", "priority": "High|Medium|Low", "status": "pending", "completed": false }
  ]
}

Be exhaustive. Use real names. Include direct references to what was said. No vague summaries.`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "array", items: { type: "string" } },
          key_discussions: { type: "array", items: { type: "object", properties: { title: { type: "string" }, points: { type: "array", items: { type: "string" } } } } },
          decisions: { type: "array", items: { type: "string" } },
          action_items: { type: "array", items: { type: "object", properties: { task: { type: "string" }, owner: { type: "string" }, deadline: { type: "string" }, priority: { type: "string" }, status: { type: "string" }, completed: { type: "boolean" } } } },
        }
      }
    });
    const deepData = {
      ...data,
      executive_summary: result.executive_summary?.length ? result.executive_summary : data.executive_summary,
      key_discussions: result.key_discussions?.length ? result.key_discussions : data.key_discussions,
      decisions: result.decisions?.length ? result.decisions : data.decisions,
      action_items: result.action_items?.length ? result.action_items : data.action_items,
    };
    deepResultRef.current = deepData;
    setShowingDeep(true);
    if (onDataChange) onDataChange(deepData);
    setDiggingDeeper(false);
  };

  const scanForMoreDecisions = async () => {
    if (!transcript) return;
    setScanningDecisions(true);
    const existing = (data.decisions || []).join("; ");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Scan this meeting transcript for ALL decisions, agreements, and conclusions that were made.

EXISTING DECISIONS (already found — do NOT repeat):
${existing || "None yet"}

TRANSCRIPT:
${transcript}

Find every additional decision, agreement, resolution, or conclusion that is NOT already listed above.
Look for: explicit decisions ("we decided...", "agreed to..."), implicit resolutions, consensus reached, policy choices made.

Return ONLY a JSON object with a "decisions" array of new decision strings not already covered:
{ "decisions": ["decision 1", "decision 2"] }

If nothing new found, return { "decisions": [] }.`,
      response_json_schema: {
        type: "object",
        properties: { decisions: { type: "array", items: { type: "string" } } }
      }
    });
    const newDecisions = result?.decisions || [];
    if (newDecisions.length > 0) {
      const updated = { ...data, decisions: [...(data.decisions || []), ...newDecisions] };
      if (onDataChange) onDataChange(updated);
    }
    setScanningDecisions(false);
  };

  const handleAddNextStep = (step) => {
    const updated = { ...data, next_steps: [...(data.next_steps || []), step] };
    if (onDataChange) onDataChange(updated);
  };

  const handleRemoveNextStep = (index) => {
    const updated = { ...data, next_steps: (data.next_steps || []).filter((_, i) => i !== index) };
    if (onDataChange) onDataChange(updated);
  };

  const handleEditNextStep = (index, newText) => {
    const updated = { ...data, next_steps: (data.next_steps || []).map((s, i) => i === index ? newText : s) };
    if (onDataChange) onDataChange(updated);
  };

  const handleUpdateAttendee = (index, updatedAttendee) => {
    const updated = { ...data, attendees: (data.attendees || []).map((a, i) => i === index ? updatedAttendee : a) };
    if (onDataChange) onDataChange(updated);
  };

  const handleAddAttendee = (newAttendee) => {
    const updated = { ...data, attendees: [...(data.attendees || []), newAttendee] };
    if (onDataChange) onDataChange(updated);
  };

  const handleApplyToAllSpeakers = (originalName, newName) => {
    if (!data) return;
    
    // Replace all occurrences in transcript (with word boundaries to avoid partial matches)
    let updatedTranscript = data.transcript_text || "";
    const regex = new RegExp(`\\b${originalName}:`, 'g');
    updatedTranscript = updatedTranscript.replace(regex, `${newName}:`);

    // Update speaker mapping
    const mapping = { ...(data.speaker_mapping || {}), [originalName]: newName };

    const updated = {
      ...data,
      transcript_text: updatedTranscript,
      speaker_mapping: mapping,
    };
    if (onDataChange) onDataChange(updated);
  };

  return (
    <div className="space-y-1">
      <AttendeesSection attendees={data.attendees} isDark={isDark} audioUrl={audioUrl} transcript={transcript} onUpdateAttendee={handleUpdateAttendee} onAddAttendee={handleAddAttendee} onApplyToAll={handleApplyToAllSpeakers} sessionId={sessionId} currentMapping={data.speaker_mapping} />

      {data.executive_summary?.length > 0 && (
        <SectionCard title="Executive Summary" isDark={isDark}>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            {data.executive_summary.join(" ")}
          </p>
        </SectionCard>
      )}

      {data.key_discussions?.length > 0 && (
       <div className={`rounded-2xl border p-4 mb-4 ${isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200"}`}>
         <div className="flex items-center justify-between mb-3">
           <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? "text-white/40" : "text-gray-400"}`}>
             <MessageSquare className="w-3.5 h-3.5" /> Key Discussions
           </h3>
           {!readonly && transcript && (
             <div className="flex items-center gap-1.5">
               {/* Show "Original" button only when deep result exists and we're showing deep */}
               {(showingDeep || (deepResultRef.current && !showingDeep)) && originalSummary && (
                 <button
                   onClick={() => { onRestoreOriginal?.(); setShowingDeep(false); }}
                   className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                     !showingDeep
                       ? isDark ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30" : "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                       : isDark ? "bg-white/8 text-white/50 hover:bg-white/14" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                   }`}
                 >
                   ↺ Original
                 </button>
               )}
               <button
                 onClick={digDeeper}
                 disabled={diggingDeeper}
                 className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                   showingDeep
                     ? isDark ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-400/30" : "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                     : isDark ? "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                 }`}
               >
                 {diggingDeeper ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanSearch className="w-3 h-3" />}
                 {diggingDeeper ? "Digging deeper…" : "Dig Deeper"}
               </button>
             </div>
           )}
         </div>
         {diggingDeeper && (
           <p className={`text-[10px] mb-3 ${isDark ? "text-purple-400/60" : "text-purple-400"}`}>
             Using GPT-5 to extract full detail from every part of the transcript…
           </p>
         )}
         {data.key_discussions.map((theme, i) => (
           <ThemeBlock key={i} theme={theme} isDark={isDark} />
         ))}
       </div>
      )}

      <DetailedDiscussions items={data.detailed_discussions} isDark={isDark} />

      <div className={`rounded-2xl border p-4 mb-4 ${isDark ? "bg-white/5 border-white/8" : "bg-white border-gray-200"}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? "text-white/40" : "text-gray-400"}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Decisions & Agreements
          </h3>
          {!readonly && transcript && (
            <button
              onClick={scanForMoreDecisions}
              disabled={scanningDecisions}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${isDark ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
            >
              {scanningDecisions ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanSearch className="w-3 h-3" />}
              {scanningDecisions ? "Scanning…" : "Scan More"}
            </button>
          )}
        </div>
        <BulletList items={data.decisions} isDark={isDark} />
        {!data.decisions?.length && !scanningDecisions && (
          <p className={`text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>No decisions found yet.</p>
        )}
      </div>

      {data.action_items?.length > 0 && (
        <SectionCard title="Action Items" isDark={isDark}>
          {data.action_items.map((action, i) => (
            <ActionCard
              key={i}
              action={action}
              isDark={isDark}
              readonly={readonly}
              onRemove={() => {
                const updated = { ...data, action_items: data.action_items.filter((_, idx) => idx !== i) };
                if (onDataChange) onDataChange(updated);
              }}
            />
          ))}
        </SectionCard>
      )}

      <NextStepsSection
        items={data.next_steps}
        isDark={isDark}
        readonly={readonly}
        onAdd={handleAddNextStep}
        onRemove={handleRemoveNextStep}
        onEdit={handleEditNextStep}
      />

      {data.risks?.length > 0 && (
        <SectionCard title="Risks & Gaps" isDark={isDark}>
          <BulletList items={data.risks} isDark={isDark} />
        </SectionCard>
      )}

      {data.ai_insights?.length > 0 && (
        <SectionCard title="AI Insights" isDark={isDark}>
          <BulletList items={data.ai_insights} isDark={isDark} />
        </SectionCard>
      )}
    </div>
  );
}