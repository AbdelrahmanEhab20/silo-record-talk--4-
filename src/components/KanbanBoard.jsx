import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useTheme } from "@/lib/ThemeContext";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CheckSquare, Circle, Loader, Clock } from "lucide-react";

const COLUMNS = [
  { id: "todo",        label: "Todo",        color: "text-blue-400",   dotColor: "bg-blue-400",   Icon: Circle },
  { id: "inprogress",  label: "In Progress", color: "text-amber-400",  dotColor: "bg-amber-400",  Icon: Loader },
  { id: "completed",   label: "Completed",   color: "text-green-400",  dotColor: "bg-green-400",  Icon: CheckSquare },
];

function cardKey(item) {
  return `${item.sessionId}__${item.task?.slice(0, 60)}`;
}

export default function KanbanBoard({ allActions }) {
  const { isDark } = useTheme();
  // Manual drag overrides on top of the session data truth
  const [dragOverrides, setDragOverrides] = useState({});

  const columns = useMemo(() => {
    const cols = { todo: [], inprogress: [], completed: [] };
    allActions.forEach(item => {
      const key = cardKey(item);
      // Drag override takes precedence, otherwise derive from session completed field
      const status = dragOverrides[key] || (item.completed ? "completed" : "todo");
      cols[status]?.push({ ...item, _key: key });
    });
    return cols;
  }, [allActions, dragOverrides]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    setDragOverrides(prev => ({ ...prev, [draggableId]: destination.droppableId }));
  };

  const priorityColor = (p) => {
    if (p === "High") return "text-red-400 bg-red-400/10 border-red-400/20";
    if (p === "Medium") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  };

  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const colBg = isDark ? "bg-white/3" : "bg-gray-50";
  const textSub = isDark ? "text-white/40" : "text-gray-400";

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {COLUMNS.map(col => {
          const items = columns[col.id] || [];
          return (
            <div key={col.id} className={`flex-1 min-w-[260px] rounded-2xl ${colBg} p-3 flex flex-col gap-2`}>
              {/* Column header */}
              <div className="flex items-center gap-2 px-1 mb-1">
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full ${isDark ? "bg-white/8 text-white/40" : "bg-gray-200 text-gray-500"}`}>
                  {items.length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-2 flex-1 rounded-xl min-h-[80px] transition-colors ${snapshot.isDraggingOver ? (isDark ? "bg-white/5" : "bg-blue-50") : ""}`}
                  >
                    {items.map((item, index) => (
                      <Draggable key={item._key} draggableId={item._key} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`rounded-xl border p-3 flex flex-col gap-2 shadow-sm transition-shadow cursor-grab active:cursor-grabbing ${card} ${snapshot.isDragging ? "shadow-lg scale-[1.02]" : ""}`}
                          >
                            <p className={`text-xs font-medium leading-snug ${isDark ? "text-white/85" : "text-gray-800"}`}>
                              {item.task}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.priority && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityColor(item.priority)}`}>
                                  {item.priority}
                                </span>
                              )}
                              {item.owner && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/8 text-white/50" : "bg-gray-100 text-gray-500"}`}>
                                  {item.owner}
                                </span>
                              )}
                              {item.deadlineDate && (
                                <span className={`text-[10px] flex items-center gap-0.5 ${isDark ? "text-white/30" : "text-gray-400"}`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  {format(item.deadlineDate, "MMM d")}
                                </span>
                              )}
                            </div>
                            <Link
                              to={`/SessionDetail?id=${item.sessionId}`}
                              onClick={e => e.stopPropagation()}
                              className={`text-[10px] truncate mt-0.5 ${isDark ? "text-white/25 hover:text-white/50" : "text-gray-300 hover:text-gray-500"} transition-colors`}
                            >
                              ↗ {item.sessionTitle}
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div className={`text-center py-6 text-[11px] ${textSub}`}>Drop here</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}