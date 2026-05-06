import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { useMutation } from "@tanstack/react-query";
import { CheckSquare, Square, Calendar, User, Flag, ListChecks, Plus, X, Building2, Users, Pencil, Check, ScanSearch, Loader2, CalendarPlus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import AddToCalendarModal from "@/components/calendar/AddToCalendarModal";

const PRIORITY_STYLES = {
  High: "text-red-400 bg-red-500/10 border-red-500/20",
  Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Low: "text-green-400 bg-green-500/10 border-green-500/20",
};

const PRIORITIES = ["High", "Medium", "Low"];

function ItemForm({ initial = {}, isDark, onSave, onCancel, submitLabel = "Add Item" }) {
  const [task, setTask] = useState(initial.task || "");
  const [owner, setOwner] = useState(initial.owner || "");
  const [deadline, setDeadline] = useState(initial.deadline || "");
  const [department, setDepartment] = useState(initial.department || "");
  const [team, setTeam] = useState(initial.team || "");
  const [priority, setPriority] = useState(initial.priority || "Medium");

  const card = isDark ? "bg-[#2C2C2E] border-white/10" : "bg-gray-50 border-gray-200";
  const inputCls = `w-full text-sm px-3 py-2 rounded-xl border outline-none transition-colors ${
    isDark
      ? "bg-[#1C1C1E] border-white/10 text-white placeholder:text-white/25 focus:border-purple-500/50"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400"
  }`;
  const labelCls = `text-[10px] font-semibold uppercase tracking-wider mb-1 block ${isDark ? "text-white/40" : "text-gray-400"}`;

  return (
    <div className={`mx-3 mb-3 mt-2 rounded-2xl border p-4 space-y-3 ${card}`}>
      <div>
        <label className={labelCls}>Action Item *</label>
        <input className={inputCls} placeholder="Describe the action item..." value={task} onChange={e => setTask(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}><User className="w-2.5 h-2.5 inline mr-1" />Assign To</label>
          <input className={inputCls} placeholder="Person name" value={owner} onChange={e => setOwner(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}><Calendar className="w-2.5 h-2.5 inline mr-1" />Deadline</label>
          <input className={inputCls} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}><Building2 className="w-2.5 h-2.5 inline mr-1" />Department</label>
          <input className={inputCls} placeholder="e.g. Marketing" value={department} onChange={e => setDepartment(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}><Users className="w-2.5 h-2.5 inline mr-1" />Team</label>
          <input className={inputCls} placeholder="e.g. Growth" value={team} onChange={e => setTeam(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}><Flag className="w-2.5 h-2.5 inline mr-1" />Priority</label>
        <div className="flex gap-2">
          {PRIORITIES.map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${priority === p ? PRIORITY_STYLES[p] : isDark ? "bg-white/5 border-white/10 text-white/40" : "bg-white border-gray-200 text-gray-400"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave({ task, owner, deadline, department, team, priority })} disabled={!task.trim()}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
          style={{ background: "linear-gradient(135deg, #A855F7, #6366F1)" }}>
          {submitLabel}
        </button>
        <button onClick={onCancel}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-white/10 text-white/50 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-800"}`}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ActionItems({ sessionId, summaryText, transcript, onSummaryUpdated, sessionTitle }) {
  const { isDark } = useTheme();
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [calModal, setCalModal] = useState(null);

  // Prevent useEffect from overwriting local state after we just saved
  const localUpdateRef = useRef(false);

  // Trigger auto-scan once when transcript exists and action_items are empty
  const autoScanTriggeredRef = useRef(false);

  useEffect(() => {
    if (localUpdateRef.current) {
      localUpdateRef.current = false;
      return;
    }
    if (!summaryText) return;

    try {
      const parsed = typeof summaryText === "string" ? JSON.parse(summaryText) : summaryText;
      const raw = parsed?.action_items || [];
      setItems(
        raw.map((item, i) => ({
          id: i,
          task: item.task || "",
          owner: item.owner || "",
          deadline: item.deadline || item.due_date || "",
          department: item.department || "",
          team: item.team || "",
          priority: item.priority || "Medium",
          completed: item.completed || item.status === "completed" || false,
        }))
      );
    } catch {
      setItems([]);
    }
  }, [summaryText]);

  const persistItems = async (updatedItems) => {
    const parsed = summaryText
      ? (typeof summaryText === "string"
          ? (() => {
              try { return JSON.parse(summaryText); } catch { return {}; }
            })()
          : { ...summaryText })
      : {};

    parsed.action_items = updatedItems.map(({ task, owner, deadline, department, team, priority, completed }) => ({
      task,
      owner,
      deadline,
      department,
      team,
      priority,
      completed,
      status: completed ? "completed" : "pending",
    }));

    const newText = JSON.stringify(parsed);
    localUpdateRef.current = true;
    await appClient.entities.Session.update(sessionId, { summary_text: newText });
    if (onSummaryUpdated) onSummaryUpdated(newText);
  };

  const toggleMutation = useMutation({
    mutationFn: async (id) => {
      setItems((prev) => {
        const updated = prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
        persistItems(updated);
        return updated;
      });
    },
  });

  const handleAddItem = async (data) => {
    const updated = [...items, { ...data, id: Date.now(), completed: false }];
    setItems(updated);
    setShowAddForm(false);
    await persistItems(updated);
  };

  const handleEditSave = async (id, data) => {
    const updated = items.map((item) => (item.id === id ? { ...item, ...data } : item));
    setItems(updated);
    setEditingId(null);
    await persistItems(updated);
  };

  const handleDelete = async (id) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    await persistItems(updated);
  };

  const scanForMore = useCallback(async () => {
    if (!transcript || !transcript.trim()) return;
    if (scanning) return;

    setScanning(true);
    try {
      const existingTasks = items.map((i) => i.task).join("; ");
      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are scanning a meeting transcript to find ALL action items and tasks that were mentioned, even implicitly.

EXISTING ACTION ITEMS (already found — do NOT repeat these):
${existingTasks || "None yet"}

TRANSCRIPT:
${transcript}

Find every additional action item, task, commitment, or follow-up mentioned in the transcript that is NOT already in the existing list above.
Look for:
- Direct assignments ("X will do Y", "can you handle Z")
- Implicit commitments ("we should...", "someone needs to...")
- Follow-ups mentioned ("let's circle back on...", "we'll schedule...")
- Deliverables promised

Return ONLY a JSON array of new action items not already covered:
[{ "task": "...", "owner": "person name or TBD", "deadline": "TBD", "priority": "High|Medium|Low" }]

If nothing new found, return an empty array [].`,
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  owner: { type: "string" },
                  deadline: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      const newRaw = result?.items || (Array.isArray(result) ? result : []);
      if (newRaw.length > 0) {
        const newItems = newRaw.map((item, i) => ({
          id: Date.now() + i,
          task: item.task || "",
          owner: item.owner || "",
          deadline: item.deadline || "",
          department: "",
          team: "",
          priority: item.priority || "Medium",
          completed: false,
        }));

        const updated = [...items, ...newItems];
        setItems(updated);
        await persistItems(updated);
      }
    } finally {
      setScanning(false);
    }
}, [transcript, items, scanning, summaryText, sessionId, onSummaryUpdated]);
  // Auto-scan once after transcript exists and no action items were found in summary
  useEffect(() => {
    if (!transcript || !transcript.trim()) return;
    if (scanning) return;
    if (items.length > 0) return;
    if (autoScanTriggeredRef.current) return;

    autoScanTriggeredRef.current = true;
    scanForMore().catch((e) => {
      console.error("Auto scan failed:", e);
      autoScanTriggeredRef.current = false;
    });
  }, [transcript, items.length, scanning, scanForMore]);

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-100";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const completedCount = items.filter((i) => i.completed).length;

  return (
    <div className={`rounded-2xl border ${card} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold">Action Items</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${textSub}`}>{completedCount}/{items.length} done</span>
          {transcript && (
            <button
              onClick={scanForMore}
              disabled={scanning}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${isDark ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
            >
              {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanSearch className="w-3 h-3" />}
              {scanning ? "Scanning…" : "Scan More"}
            </button>
          )}
          <button
            onClick={() => { setShowAddForm((v) => !v); setEditingId(null); }}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
              showAddForm ? "bg-purple-500/20 text-purple-400" : isDark ? "bg-white/8 text-white/60 hover:text-white" : "bg-gray-100 text-gray-500 hover:text-gray-800"
            }`}
          >
            {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAddForm ? "Cancel" : "Add"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-1 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${items.length ? (completedCount / items.length) * 100 : 0}%` }}
        />
      </div>

      {/* Add Form */}
      {showAddForm && <ItemForm isDark={isDark} onSave={handleAddItem} onCancel={() => setShowAddForm(false)} submitLabel="Add Item" />}

      {/* Items */}
      {items.length > 0 && (
        <div className="divide-y divide-white/5">
          {items.map((item) => (
            <div key={item.id}>
              {editingId === item.id ? (
                <ItemForm
                  initial={item}
                  isDark={isDark}
                  onSave={(data) => handleEditSave(item.id, data)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save Changes"
                />
              ) : (
                <div className={`flex gap-3 px-4 py-3 transition-colors ${isDark ? "hover:bg-white/3" : "hover:bg-gray-50"} ${item.completed ? "opacity-50" : ""}`}>
                  <div className="pt-0.5 shrink-0 cursor-pointer" onClick={() => toggleMutation.mutate(item.id)}>
                    {item.completed ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className={`w-4 h-4 ${textSub}`} />}
                  </div>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleMutation.mutate(item.id)}>
                    <p className={`text-sm leading-snug mb-1.5 ${item.completed ? "line-through" : ""} ${isDark ? "text-white/85" : "text-gray-800"}`}>
                      {item.task}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.owner && <span className={`flex items-center gap-1 text-[10px] ${textSub}`}><User className="w-3 h-3" />{item.owner}</span>}
                      {item.department && <span className={`flex items-center gap-1 text-[10px] ${textSub}`}><Building2 className="w-3 h-3" />{item.department}</span>}
                      {item.team && <span className={`flex items-center gap-1 text-[10px] ${textSub}`}><Users className="w-3 h-3" />{item.team}</span>}
                      {item.deadline && <span className={`flex items-center gap-1 text-[10px] ${textSub}`}><Calendar className="w-3 h-3" />{item.deadline}</span>}
                      {item.priority && (
                        <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.Medium}`}>
                          <Flag className="w-2.5 h-2.5" />{item.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCalModal({ item, sessionTitle }); }}
                      title="Add to Google Calendar"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "text-white/25 hover:text-blue-400 hover:bg-blue-500/10" : "text-gray-300 hover:text-blue-500 hover:bg-blue-50"}`}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setShowAddForm(false); }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "text-white/25 hover:text-white/70 hover:bg-white/8" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isDark ? "text-white/25 hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && !showAddForm && (
        <div className={`px-4 py-6 text-center text-xs ${textSub}`}>
          No action items yet. Tap <strong>Add</strong> to create one.
        </div>
      )}

      <AnimatePresence>
        {calModal && (
          <AddToCalendarModal
            item={calModal.item}
            sessionTitle={calModal.sessionTitle}
            onClose={() => setCalModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}