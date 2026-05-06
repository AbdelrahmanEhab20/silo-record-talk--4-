import React from "react";
import { ChevronLeft } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

const ROOT_PATHS = ["/", "/Analytics", "/home", "/Dashboard", "/Settings", "/SessionDetail"];

export default function BackButton({ label = "Back" }) {
  const { isDark } = useTheme();
  const pathname = window.location.pathname;

  if (ROOT_PATHS.includes(pathname)) return null;

  const handleBack = () => {
    if (pathname === "/Pricing") {
      window.location.href = "/Settings";
    } else {
      window.history.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-1 text-[15px] font-medium transition-colors min-h-[44px] px-1 ${
        isDark ? "text-purple-400 hover:text-purple-300" : "text-blue-600 hover:text-blue-800"
      }`}
    >
      <ChevronLeft className="w-5 h-5" />
      {label}
    </button>
  );
}