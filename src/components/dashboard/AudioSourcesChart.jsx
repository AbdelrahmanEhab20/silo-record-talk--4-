import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Mic, Upload, Link2, Image, Type } from "lucide-react";

const SOURCE_CONFIG = {
  "In-App Recording": { color: "#A855F7", icon: Mic, light: "#EDE9FE" },
  "Audio Upload": { color: "#06B6D4", icon: Upload, light: "#CFFAFE" },
  "Video URL": { color: "#F59E0B", icon: Link2, light: "#FEF3C7" },
  "Images": { color: "#EC4899", icon: Image, light: "#FCE7F3" },
  "Text": { color: "#F97316", icon: Type, light: "#FFEDD5" },
};

const SOURCE_LABELS = {
  recording: "In-App Recording",
  audio_upload: "Audio Upload",
  video_url: "Video URL",
  text: "Text",
  images: "Images",
};

export default function AudioSourcesChart({ sessions }) {
  const { isDark } = useTheme();

  const counts = sessions.reduce((acc, s) => {
    let source = s.source || "recording"; // default to recording if not set
    const label = SOURCE_LABELS[source] || "In-App Recording";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(SOURCE_CONFIG)
    .map(([name, cfg]) => ({ name, value: counts[name] || 0, color: cfg.color, icon: cfg.icon, light: cfg.light }))
    .filter(d => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-100";
  const textSub = isDark ? "text-white/40" : "text-gray-400";
  const trackBg = isDark ? "bg-white/8" : "bg-gray-100";

  if (total === 0) return null;

  return (
    <div className={`${card} rounded-2xl border ${border} p-5`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Mic className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-semibold">Audio Sources</h2>
      </div>

      {/* Donut centered */}
      <div className="flex justify-center mb-5">
        <div className="w-44 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive={false}
                labelLine={false}
                label={false}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#1C1C1E" : "#fff",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
                  borderRadius: 10,
                  color: isDark ? "#fff" : "#111",
                  fontSize: 12,
                }}
                formatter={(v, name) => [`${v} session${v !== 1 ? "s" : ""}`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Center label overlay — absolute positioned over the chart */}
      <div className="relative -mt-[168px] mb-[124px] flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{total}</p>
          <p className={`text-[10px] ${textSub}`}>sessions</p>
        </div>
      </div>

      {/* Legend list — full width, stacked */}
      <div className="space-y-3">
        {data.map(({ name, value, color, icon: Icon, light }) => {
          const pct = Math.round((value / total) * 100);
          const badgeBg = isDark ? `${color}20` : light;
          const labelColor = isDark ? "text-white/80" : "text-gray-700";
          
          return (
            <div key={name} className="flex items-center gap-3">
              {/* Icon badge */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: badgeBg }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>

              {/* Label + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium truncate ${labelColor}`}>{name}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-bold" style={{ color }}>{value}</span>
                    <span className={`text-[10px] ${textSub}`}>{pct}%</span>
                  </div>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${trackBg}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}