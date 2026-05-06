import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/lib/ThemeContext";
import { Mic, LayoutDashboard, Settings, Calendar, TrendingUp } from "lucide-react";

const TABS = [
  { label: "Notes", icon: Mic, path: "/home" },
  { label: "Calendar", icon: Calendar, path: "/Calendar" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/Dashboard" },
  { label: "Insights", icon: TrendingUp, path: "/Insights" },
  { label: "Settings", icon: Settings, path: "/Settings" },
];

export default function BottomTabBar() {
  const { isDark } = useTheme();
  const location = useLocation();

  if (location.pathname === "/" || location.pathname.includes("SessionDetail")) return null;

  const bg = isDark ? "bg-[#111111]/90 border-white/10" : "bg-white/90 border-gray-200";

  return (
    <div
      className={`border-t backdrop-blur-xl ${bg}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        top: 'auto',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
        WebkitPosition: 'fixed',
        WebkitUserSelect: 'none'
      }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {TABS.map(({ label, icon: Icon, path }) => {
          const active = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              onClick={(e) => e.currentTarget.blur()}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] min-w-[56px] transition-colors select-none ${
                active
                  ? "text-purple-500"
                  : isDark
                  ? "text-white/30 hover:text-white/60"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}