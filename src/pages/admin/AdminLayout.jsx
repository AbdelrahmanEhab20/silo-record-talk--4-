import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "@/lib/ThemeContext";
import { ChevronLeft, Users, BarChart3, Settings, Shield } from "lucide-react";
import { isSystemAdmin } from "@/lib/roles";
import { useAuth } from "@/lib/AuthContext";

const navLinkClass = ({ isActive }, isDark) =>
  `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
    isActive
      ? isDark
        ? "bg-white/10 text-white"
        : "bg-gray-900 text-white"
      : isDark
        ? "text-white/50 hover:text-white hover:bg-white/5"
        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
  }`;

export default function AdminLayout() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const bg = isDark ? "bg-[#0A0A0A]" : "bg-[#F5F5F7]";
  const card = isDark ? "bg-[#1C1C1E] border-white/8" : "bg-white border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-white/40" : "text-gray-500";

  return (
    <div className={`min-h-screen ${bg}`}>
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${isDark ? "border-white/10 bg-black/80" : "border-gray-200 bg-[#F5F5F7]/90"}`}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className={`p-2 rounded-xl ${isDark ? "bg-white/10" : "bg-white shadow-sm"}`}
          >
            <ChevronLeft className={`w-5 h-5 ${text}`} />
          </button>
          <div className="flex-1">
            <h1 className={`text-lg font-semibold ${text}`}>Organization admin</h1>
            <p className={`text-xs ${sub}`}>{user?.email}</p>
          </div>
          {isSystemAdmin(user) && (
            <Link
              to="/admin/platform"
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl ${isDark ? "bg-white/10 text-white" : "bg-white text-gray-700 shadow-sm"}`}
            >
              <Settings className="w-4 h-4" />
              Platform
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <nav className={`flex flex-wrap gap-2 p-2 rounded-2xl border mb-6 ${card}`}>
          <NavLink to="/admin/org" end className={(p) => navLinkClass(p, isDark)}>
            <Users className="w-4 h-4" />
            Users
          </NavLink>
          <NavLink to="/admin/org/usage" className={(p) => navLinkClass(p, isDark)}>
            <BarChart3 className="w-4 h-4" />
            Usage
          </NavLink>
          <NavLink to="/admin/org/invites" className={(p) => navLinkClass(p, isDark)}>
            <Shield className="w-4 h-4" />
            Invites
          </NavLink>
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
