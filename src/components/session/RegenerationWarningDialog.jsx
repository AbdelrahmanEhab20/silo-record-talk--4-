import React from "react";
import { useTheme } from "@/lib/ThemeContext";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegenerationWarningDialog({ isOpen, onConfirm, onCancel, isLoading }) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const bg = isDark ? "bg-[#0A0A0A]" : "bg-white";
  const card = isDark ? "bg-[#1C1C1E]" : "bg-white";
  const border = isDark ? "border-white/8" : "border-gray-200";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className={`${card} rounded-2xl border ${border} p-6 max-w-sm mx-4 shadow-2xl`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Regenerate Summary?
            </h3>
          </div>
        </div>

        <p className={`text-sm mb-6 leading-relaxed ${isDark ? "text-white/70" : "text-gray-600"}`}>
          Regenerating will delete any amendments you've made to:
        </p>

        <ul className={`text-sm space-y-2 mb-6 pl-4 ${isDark ? "text-white/60" : "text-gray-500"}`}>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-1">•</span>
            <span>Speaker names and roles</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-1">•</span>
            <span>Summary and bullet points</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-1">•</span>
            <span>Action items and decisions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-1">•</span>
            <span>All other edited content</span>
          </li>
        </ul>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className={`flex-1 ${isDark ? "border-white/10 text-white/70 hover:bg-white/5" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Regenerating…
              </>
            ) : (
              "Regenerate"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}