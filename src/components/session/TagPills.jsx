import React from "react";

const COLORS = [
  { bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.35)", text: "#C084FC" },
  { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.35)", text: "#818CF8" },
  { bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.3)", text: "#67E8F9" },
  { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", text: "#FCD34D" },
  { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)", text: "#6EE7B7" },
];

export default function TagPills({ tags }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, i) => {
        const c = COLORS[i % COLORS.length];
        return (
          <span
            key={tag}
            className="px-3 py-1 rounded-full text-xs font-medium border"
            style={{ background: c.bg, borderColor: c.border, color: c.text }}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}