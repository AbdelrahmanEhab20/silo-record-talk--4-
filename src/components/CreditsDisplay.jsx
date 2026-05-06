import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { Zap, AlertCircle } from "lucide-react";

export default function CreditsDisplay() {
  const { isDark } = useTheme();
  const [credits, setCredits] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await appClient.functions.invoke('getUserCredits', {});
        setCredits(response.data.credits);
        setPlan(response.data.plan);
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, []);

  if (loading) {
    return (
      <div className={`px-4 py-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
        <div className="h-4 w-20 bg-gray-300 rounded animate-pulse"></div>
      </div>
    );
  }

  const planColors = {
    free: 'from-gray-500/20 to-gray-600/10 border-gray-500/30',
    starter: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    pro: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    pro_plus: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  };

  const needsUpgrade = credits < 5;

  return (
    <div className={`bg-gradient-to-r ${planColors[plan]} border rounded-xl px-4 py-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${needsUpgrade ? 'text-red-400' : 'text-yellow-400'}`} />
          <div>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Available Credits
            </p>
            <p className="text-lg font-bold text-white">{credits}</p>
          </div>
        </div>
        {needsUpgrade && (
          <AlertCircle className="w-4 h-4 text-red-400" />
        )}
      </div>
      {needsUpgrade && (
        <p className="text-xs text-red-300 mt-2">Low on credits. Consider upgrading your plan.</p>
      )}
    </div>
  );
}