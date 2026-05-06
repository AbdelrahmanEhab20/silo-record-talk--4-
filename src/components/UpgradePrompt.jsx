import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { base44 } from "@/api/base44Client";
import { AlertCircle, X } from "lucide-react";

export default function UpgradePrompt({ onClose }) {
  const { isDark } = useTheme();
  const [credits, setCredits] = useState(null);
  const [plan, setPlan] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await base44.functions.invoke('getUserCredits', {});
        setCredits(response.data.credits);
        setPlan(response.data.plan);
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      }
    };

    fetchCredits();
  }, []);

  if (dismissed || credits === null || credits >= 5 || plan === 'free') {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  return (
    <div className={`fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-40 ${isDark ? 'bg-red-900/20 border-red-500/50' : 'bg-red-50 border-red-200'} border rounded-xl p-4 backdrop-blur`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm text-red-400 mb-1">Low on Credits</p>
          <p className={`text-xs ${isDark ? 'text-red-300/80' : 'text-red-600'}`}>
            You have {credits} credit{credits !== 1 ? 's' : ''} left. Upgrade your plan to continue.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-red-400 hover:text-red-500 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}